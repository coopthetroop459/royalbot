const PLAN_ALLOWANCES = { free: 25, premium: 500, premium_plus: 1500 };

async function supabaseRequest(path, token, body) {
  return fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": process.env.SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(body || {})
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Please sign in first." });

  const { message } = req.body || {};
  if (typeof message !== "string" || !message.trim() || message.length > 1200) {
    return res.status(400).json({ error: "Enter a message under 1,200 characters." });
  }

  const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "OPENAI_API_KEY"];
  if (required.some(key => !process.env[key])) {
    return res.status(500).json({ error: "The server is missing an environment variable. Check the Vercel setup." });
  }

  // Verify the user's access token with Supabase Auth.
  const userCheck = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      "apikey": process.env.SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token}`
    }
  });
  if (!userCheck.ok) return res.status(401).json({ error: "Your session expired. Please sign in again." });

  // Atomically reserve one credit before calling the AI.
  const creditResponse = await supabaseRequest("rpc/consume_ai_credit", token, {});
  if (!creditResponse.ok) return res.status(500).json({ error: "Could not check your credits. Try again." });
  const creditData = await creditResponse.json();
  if (!creditData.ok) {
    return res.status(402).json({
      error: "You've used all your AI credits for this month. Your credits reset monthly.",
      credits_remaining: creditData.credits_remaining
    });
  }

  try {
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: "You are IceAge AI, a friendly support assistant for the IceAgeBOT Discord bot dashboard. Give clear, beginner-friendly instructions about Discord, IceAgeBOT setup, configuration, and troubleshooting. You are an instruction-only assistant: NEVER claim to change server settings, edit roles, execute commands, or take actions. Explain how the user can do things themselves. Never ask for passwords, API keys, or other secrets. If you do not know a specific IceAgeBOT feature, say so rather than inventing it. Keep answers practical and concise.",
        input: message,
        max_output_tokens: 500
      })
    });

    const aiData = await aiResponse.json();
    if (!aiResponse.ok) throw new Error(aiData.error?.message || "The AI service could not respond.");

    const reply = aiData.output_text ||
      (aiData.output || []).flatMap(item => item.content || []).map(part => part.text || "").join("\n") ||
      "I couldn't create a response. Please try again.";

    return res.status(200).json({
      reply,
      credits_remaining: creditData.credits_remaining,
      plan: creditData.plan
    });
  } catch (error) {
    // Return the reserved credit if the AI request fails.
    await supabaseRequest("rpc/refund_ai_credit", token, {});
    return res.status(502).json({ error: "IceAge AI couldn't respond just now. Your credit was returned. Please try again." });
  }
}
