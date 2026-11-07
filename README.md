# SIP Fit: public deployment

- `public/index.html`: the SIP Fit MVP, at the site's main link.
- `public/discovery.html`: the AI Discovery Engine, at /discovery.html.
- `api/ai.js`: a small server function that calls Google Gemini. The API key stays on the server, so it never appears in the browser.

The key goes in Vercel → Project → Settings → Environment Variables, named `GEMINI_API_KEY`.
To use a different model, also set `GEMINI_MODEL` (the default is `gemini-2.5-flash`).
