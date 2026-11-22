# Lesson plan AI — secure usage

## Architecture (secure by design)

- **Groq / Gemini / Azure / OpenAI keys** live only in `CurriculumIntelligence/Backend/.env` on the server.
- Teachers use **TichaPortal → BFF → Curriculum API**. Browsers never see provider keys.
- Every AI call is logged in `ai_processing_logs` (operation, provider, model, time).

## Turn AI off completely

In `CurriculumIntelligence/Backend/.env`:

```env
TEACHER_AI_ENABLED=false
```

Restart the Curriculum API. Teachers can still:

- Generate lesson plans from **published curriculum** (objectives + template text)
- Edit and save plans manually

**Improve** and AI-written objectives are blocked with a clear 403 message.

## Limit daily usage (cost control / future paid tiers)

```env
AI_DAILY_LIMIT_PER_TEACHER=40
AI_DAILY_LIMIT_PER_ORGANIZATION=500
```

`0` = unlimited for that scope. When exceeded, API returns **429** with a user-friendly message.

## Billing placeholder

```env
AI_BILLING_MODE=included
```

Values: `included` | `prepaid` | `disabled` (reserved for IAM/org billing integration).

## Production recommendations

1. Set **`NODE_ENV=production`** and configure **Azure OpenAI** only (see `.env.production.example`). Groq/Gemini are disabled automatically in production.
2. Store Azure keys in **Key Vault**, not git.
3. Set **`TEACHER_AI_ENABLED=false`** in staging unless testing AI.
4. Use **`AI_DAILY_LIMIT_PER_ORGANIZATION`** for school-wide caps (paid packages).
5. Monitor `ai_processing_logs` and Azure OpenAI usage metrics.
