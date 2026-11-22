# Curriculum AI providers (secure setup)

All API keys live **only** on `CurriculumIntelligence/Backend/.env` (server-side). Teachers never see keys.  
Lesson AI is **grounded** on text extracted from your uploaded REB PDFs in PostgreSQL.

Set one provider (or use `AI_PROVIDER=auto` priority below).

## Production (Shule+ standard): **Azure OpenAI only**

When `NODE_ENV=production`, the Curriculum API:

- **Uses Azure OpenAI** as the primary (and only cloud) provider
- **Ignores Groq / Gemini / Ollama** even if keys are present in `.env`
- Falls back to **OpenAI direct** only if Azure is not configured (not recommended for schools)

Copy `Backend/.env.production.example` → your secure production `.env` or Key Vault injection.

```env
NODE_ENV=production
AI_PROVIDER=azure_openai
AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-08-01-preview
```

**Modern Azure setup**

1. [Azure Portal](https://portal.azure.com/) → **Azure OpenAI** (same region as your API VM/App Service).
2. Deploy **gpt-4o-mini** (cost-effective lesson plans) or **gpt-4.1-mini** (higher quality).
3. Store keys in **Azure Key Vault**; reference from App Service / Container Apps — not in git.
4. Optional: **Private Endpoint** + VNet so traffic never crosses the public internet.
5. Enable **Azure Monitor** alerts on token usage for billing control (pairs with `AI_DAILY_LIMIT_*` in `.env`).

---

## Development priority when `AI_PROVIDER=auto`

1. **Azure OpenAI** (if configured locally)
2. **Groq** — free tier for dev
3. **Gemini** — free tier
4. **OpenAI** — direct API
5. **Ollama** — local

---

## Option A — Azure OpenAI (required for production)

See production block above. For local testing with Azure, use the same variables with `NODE_ENV=development` and `AI_PROVIDER=azure_openai`.

---

## Option B — Groq (free tier, dev & pilot)

1. [https://console.groq.com/](https://console.groq.com/) → API Keys → Create.
2. Free tier limits apply; suitable for lesson **section regenerate**, not bulk book parsing.

```env
AI_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
```

---

## Option C — Google Gemini (free tier)

1. [Google AI Studio](https://aistudio.google.com/apikey) → Create API key.
2. Restrict key by IP/API in Google Cloud for production.

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
```

---

## Option D — Ollama (free, private, on-prem)

1. Install [Ollama](https://ollama.com/download).
2. `ollama pull llama3.1:8b` (or `mistral`, `qwen2.5`).

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
```

With `AI_PROVIDER=auto`, Ollama is used **only if** no cloud keys are set and Ollama is running.

---

## Verify

Restart curriculum API, then:

```http
GET /api/teacher/ai/status
Authorization: Bearer <teacher-jwt>
```

Response shows `provider` and `model` (never the key).

---

## Security checklist

- Keys only in server `.env`, not in TichaPortal frontend or git.
- Use Azure private endpoints + VNet for ministry/school production.
- Upload REB PDFs you are allowed to store; AI sees **extracted text**, not the whole internet.
- Teachers must **review** AI suggestions (provenance badges in the lesson editor).
