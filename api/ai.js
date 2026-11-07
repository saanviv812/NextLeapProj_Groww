// Serverless proxy: keeps the Gemini key on the server. Set GEMINI_API_KEY in Vercel settings.
const hits = new Map();
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method" });
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || "x";
  const now = Date.now(); const h = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (h.length >= 40) return res.status(429).json({ code: "rate_limited", message: "Too many requests, wait a minute." });
  h.push(now); hits.set(ip, h);
  const { prompt, json } = req.body || {};
  if (!prompt || typeof prompt !== "string" || prompt.length > 12000) return res.status(400).json({ code: "bad_input" });
  const key = process.env.GEMINI_API_KEY; if (!key) return res.status(500).json({ code: "no_key" });
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const body = { contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0, ...(json ? { responseMimeType: "application/json" } : {}) } };
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body) });
    if (r.status === 429 || r.status >= 500) { await new Promise(s => setTimeout(s, 1500 * (attempt + 1))); continue; }
    const d = await r.json();
    if (!r.ok) return res.status(502).json({ code: "upstream", message: d.error && d.error.message });
    const text = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
    return res.status(200).json({ text });
  }
  return res.status(429).json({ code: "rate_limited", message: "The AI is busy. Try again in a minute." });
}
