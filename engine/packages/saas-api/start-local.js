const fs = require('fs');
const path = require('path');

// Load .env.local first (single source of truth for local dev secrets)
const envLocalPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
  console.log('[startup] Loaded .env.local');
}

process.env.APP_URL = process.env.APP_URL || 'http://localhost:5178';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.CORS_ORIGIN = '*';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
process.env.GEMINI_API_KEY_1 = process.env.GEMINI_API_KEY_1 || '';
process.env.GEMINI_API_KEY_2 = process.env.GEMINI_API_KEY_2 || '';
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || '';
process.env.GROQ_API_KEY_2 = process.env.GROQ_API_KEY_2 || '';
process.env.GROQ_API_KEY_3 = process.env.GROQ_API_KEY_3 || '';
process.env.GROQ_API_KEY_4 = process.env.GROQ_API_KEY_4 || '';
process.env.GROQ_API_KEY_5 = process.env.GROQ_API_KEY_5 || '';
if (!process.env.GEMINI_API_KEY_1 && !process.env.GEMINI_API_KEY_2 && !process.env.ANTHROPIC_API_KEY) {
  console.warn('[startup] No LLM API keys configured — brain will use fallback responses');
}
const { app, logger } = require('./dist/index.js');
const PORT = parseInt(process.env.PORT || '3457', 10);
app.listen(PORT, () => {
  console.log('SaaS API running on port ' + PORT);
});
