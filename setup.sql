-- Run this entire file in Supabase: SQL Editor -> New query -> Run.
-- Each successful AI reply uses one credit. Allowances reset every month.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free'
    check (plan in ('free', 'premium', 'premium_plus')),
  credits_remaining integer not null default 25 check (credits_remaining >= 0),
  credits_reset_at timestamptz not null default (now() + interval '1 month'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

-- No client-side INSERT/UPDATE/DELETE policies are created.
-- This prevents users from changing their own plan or credit balance.

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, plan, credits_remaining)
  values (new.id, 'free', 25)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

create or replace function public.consume_ai_credit()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  p public.profiles%rowtype;
  allowance integer;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into p from public.profiles where id = uid for update;
  if not found then
    insert into public.profiles(id, plan, credits_remaining)
    values(uid, 'free', 25)
    returning * into p;
  end if;

  if p.credits_reset_at <= now() then
    allowance := case p.plan
      when 'premium' then 500
      when 'premium_plus' then 1500
      else 25
    end;
    update public.profiles
      set credits_remaining = allowance,
          credits_reset_at = now() + interval '1 month'
      where id = uid
      returning * into p;
  end if;

  if p.credits_remaining <= 0 then
    return jsonb_build_object(
      'ok', false,
      'credits_remaining', 0,
      'plan', p.plan
    );
  end if;

  update public.profiles
    set credits_remaining = credits_remaining - 1
    where id = uid
    returning * into p;

  return jsonb_build_object(
    'ok', true,
    'credits_remaining', p.credits_remaining,
    'plan', p.plan
  );
end;
$$;

create or replace function public.refund_ai_credit()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  p public.profiles%rowtype;
  allowance integer;
begin
  if uid is null then return; end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return; end if;

  allowance := case p.plan
    when 'premium' then 500
    when 'premium_plus' then 1500
    else 25
  end;

  update public.profiles
    set credits_remaining = least(credits_remaining + 1, allowance)
    where id = uid;
end;
$$;

grant select on public.profiles to authenticated;
grant execute on function public.consume_ai_credit() to authenticated;
grant execute on function public.refund_ai_credit() to authenticated;
