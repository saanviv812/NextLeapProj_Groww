# SIP Fit: public deployment

- `public/index.html`: the SIP Fit MVP, at the site's main link.
- `public/discovery.html`: the AI Discovery Engine, at /discovery.html.
- `api/ai.js`: a small server function that calls the AI. API keys stay on the server and never appear in the browser.

AI providers (both free, no billing needed):
- `GROQ_API_KEY` (primary): from console.groq.com. Model `openai/gpt-oss-120b`; override it with `GROQ_MODEL`.
- `GEMINI_API_KEY` (backup): used if Groq is busy. Override the model with `GEMINI_MODEL`.

If the AI doesn't reply within a few seconds, the app carries on with the person's taps.
