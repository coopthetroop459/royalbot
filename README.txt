ICEAGEBOT AI DASHBOARD — STARTER PROJECT
=======================================

WHAT THIS STARTER DOES
- White/ice-blue dashboard with cursor-following robot.
- Email/password accounts using Supabase Auth.
- Real AI replies through the OpenAI Responses API.
- 25 Free / 500 Premium / 1,500 Premium+ credits each month.
- One credit is charged for each successful AI reply.
- The AI gives instructions only. It cannot change Discord settings or run commands.
- Credit balances and plans are stored server-side in Supabase.

IMPORTANT
This is a working starter, not a finished paid subscription system.
Premium plans are assigned manually in Supabase for now. Do not trust a plan name
sent from the browser. A real checkout needs a verified payment webhook before
a user's plan is upgraded. Have a parent/guardian help with any payment-provider
account, billing, or API spending setup.

STEP 1 — CREATE A SUPABASE PROJECT
1. Create a Supabase project.
2. Open Project Settings -> API (or Connect, depending on the dashboard).
3. Copy the Project URL and the Publishable/anon key.
4. Open SQL Editor -> New query.
5. Paste all of supabase/setup.sql and click Run.
6. In Authentication -> Providers, make sure Email is enabled.
7. For local testing, you can turn email confirmation off in Auth settings.
   For a public site, keep email confirmation enabled and configure the email
   templates / site URL.

STEP 2 — ADD THE PROJECT TO VERCEL
1. Extract this ZIP on your PC.
2. Put the extracted files in a GitHub repository.
   - Open GitHub and create a new repository.
   - Use Add file -> Upload files.
   - Upload index.html, package.json, vercel.json, api folder and supabase folder.
   - Commit the upload.
3. Open Vercel and choose Add New -> Project.
4. Import the GitHub repository you just made.
5. Framework preset: Other. Root directory: ./ .
6. Before deploying, add these Environment Variables:
   SUPABASE_URL       = your Supabase Project URL
   SUPABASE_ANON_KEY  = your Supabase publishable/anon key
   OPENAI_API_KEY     = your OpenAI API key
   OPENAI_MODEL       = gpt-4.1-mini
7. Click Deploy. Vercel gives you a free *.vercel.app address.
8. Whenever you update the GitHub repository, Vercel automatically redeploys it.

STEP 3 — TEST IT
1. Open the Vercel website.
2. Create an account with an email and password.
3. Confirm the email if confirmation is enabled.
4. Sign in and send a test message to IceAge AI.
5. Check that the credit number decreases by one after a successful reply.

STEP 4 — GIVE A TEST ACCOUNT PREMIUM
For testing only, find the user's account UUID in Supabase Authentication -> Users.
Then run one of these SQL statements in SQL Editor, replacing THE-USER-UUID:

UPDATE public.profiles
SET plan = 'premium', credits_remaining = 500,
    credits_reset_at = now() + interval '1 month'
WHERE id = 'THE-USER-UUID';

For Premium+:
UPDATE public.profiles
SET plan = 'premium_plus', credits_remaining = 1500,
    credits_reset_at = now() + interval '1 month'
WHERE id = 'THE-USER-UUID';

To return to Free:
UPDATE public.profiles
SET plan = 'free', credits_remaining = 25,
    credits_reset_at = now() + interval '1 month'
WHERE id = 'THE-USER-UUID';

SECURITY NOTES
- Never put OPENAI_API_KEY in index.html or any browser JavaScript.
- Never add a Supabase service-role/secret key to the website.
- Only the public Supabase publishable/anon key belongs in the browser.
- The server checks the signed-in user and charges credits using a database function.
- Keep API spending limits/alerts enabled on the OpenAI account.
- This starter does not include checkout or automatic paid-plan upgrades.
- Add a privacy policy and terms before opening account registration publicly.
