// Server-side AI proxy. Keys stay on the server (Vercel environment variables).
// 1) Groq (GROQ_API_KEY) is tried first: free, fast, 30 requests a minute.
// 2) Google Gemini (GEMINI_API_KEY) is the backup if Groq is busy or down.
// Both are free tiers. No billing is needed.
const hits = new Map();
const withTimeout = (ms) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms); return { signal: c.signal, done: () => clearTimeout(t) }; };

async function groq(prompt, json) {
  const key = process.env.GROQ_API_KEY; if (!key) return { skip: true };
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const body = { model, temperature: 0, max_completion_tokens: 1200, messages: [{ role: "user", content: prompt }],
    ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low", include_reasoning: false } : {}),
    ...(json ? { response_format: { type: "json_object" } } : {}) };
  const send = async (b) => { const t = withTimeout(8000); try {
      return await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", signal: t.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify(b) });
    } finally { t.done(); } };
  let r = await send(body);
  if (r.status === 400) { const { reasoning_effort, include_reasoning, response_format, ...plain } = body; r = await send(plain); }
  if (!r.ok) return { fail: r.status };
  const d = await r.json(); const text = d.choices?.[0]?.message?.content || "";
  return text ? { text, provider: "groq" } : { fail: "empty" };
}

async function gemini(prompt, json) {
  const key = process.env.GEMINI_API_KEY; if (!key) return { skip: true };
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const t = withTimeout(9000);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", signal: t.signal, headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, ...(json ? { responseMimeType: "application/json" } : {}) } }) });
    if (!r.ok) return { fail: r.status };
    const d = await r.json(); const text = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
    return text ? { text, provider: "gemini" } : { fail: "empty" };
  } finally { t.done(); }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method" });
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || "x";
  const now = Date.now(); const h = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (h.length >= 60) return res.status(429).json({ code: "rate_limited" });
  h.push(now); hits.set(ip, h);
  const { prompt, json } = req.body || {};
  if (!prompt || typeof prompt !== "string" || prompt.length > 12000) return res.status(400).json({ code: "bad_input" });
  const tried = [];
  for (const p of [groq, gemini]) {
    try { const out = await p(prompt, !!json); if (out.text) return res.status(200).json({ text: out.text, provider: out.provider }); tried.push(out.skip ? "skip" : out.fail); }
    catch (e) { tried.push("error"); }
  }
  return res.status(503).json({ code: "unavailable", tried });
}
