import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { isTeacherAiEnabled } from './ai-policy.service';

export type AiProviderId = 'azure_openai' | 'groq' | 'gemini' | 'ollama' | 'openai';

export interface AiCompletionResult {
  provider: AiProviderId;
  model: string;
  data: Record<string, unknown>;
}

function extractJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence?.[1]) {
      return JSON.parse(fence[1].trim()) as Record<string, unknown>;
    }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error('Model did not return valid JSON');
  }
}

async function chatOpenAiCompatible(
  url: string,
  headers: Record<string, string>,
  model: string,
  system: string,
  user: string,
  jsonMode: boolean
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    temperature: 0.35,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    const detail = payload.error?.message || JSON.stringify(payload).slice(0, 240);
    throw new AppError(502, detail || `AI HTTP ${res.status}`);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new AppError(502, 'Empty AI response');
  return content;
}

async function completeAzure(system: string, user: string): Promise<AiCompletionResult> {
  const endpoint = env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, '');
  const deployment = env.AZURE_OPENAI_DEPLOYMENT;
  const version = env.AZURE_OPENAI_API_VERSION;
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${version}`;

  const content = await chatOpenAiCompatible(
    url,
    { 'api-key': env.AZURE_OPENAI_API_KEY },
    deployment,
    system,
    user,
    true
  );

  return {
    provider: 'azure_openai',
    model: deployment,
    data: extractJsonObject(content),
  };
}

async function completeGroq(system: string, user: string): Promise<AiCompletionResult> {
  const content = await chatOpenAiCompatible(
    'https://api.groq.com/openai/v1/chat/completions',
    { Authorization: `Bearer ${env.GROQ_API_KEY}` },
    env.GROQ_MODEL,
    system,
    user,
    true
  );
  return { provider: 'groq', model: env.GROQ_MODEL, data: extractJsonObject(content) };
}

async function completeOpenAi(system: string, user: string): Promise<AiCompletionResult> {
  const content = await chatOpenAiCompatible(
    'https://api.openai.com/v1/chat/completions',
    { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    env.OPENAI_MODEL,
    system,
    user,
    true
  );
  return { provider: 'openai', model: env.OPENAI_MODEL, data: extractJsonObject(content) };
}

async function completeGemini(system: string, user: string): Promise<AiCompletionResult> {
  const model = env.GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json',
      },
    }),
  });

  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new AppError(502, payload.error?.message || `Gemini HTTP ${res.status}`);
  }

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new AppError(502, 'Empty Gemini response');

  return { provider: 'gemini', model: model, data: extractJsonObject(text) };
}

async function completeOllama(system: string, user: string): Promise<AiCompletionResult> {
  const base = env.OLLAMA_BASE_URL.replace(/\/$/, '');
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.OLLAMA_MODEL,
      stream: false,
      format: 'json',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      options: { temperature: 0.35 },
    }),
  });

  const payload = (await res.json()) as { message?: { content?: string }; error?: string };
  if (!res.ok) {
    throw new AppError(502, payload.error || `Ollama HTTP ${res.status}`);
  }

  const content = payload.message?.content;
  if (!content) throw new AppError(502, 'Empty Ollama response');

  return { provider: 'ollama', model: env.OLLAMA_MODEL, data: extractJsonObject(content) };
}

function isAzureConfigured() {
  return Boolean(env.AZURE_OPENAI_ENDPOINT && env.AZURE_OPENAI_API_KEY && env.AZURE_OPENAI_DEPLOYMENT);
}

function isGroqConfigured() {
  return Boolean(env.GROQ_API_KEY);
}

function isGeminiConfigured() {
  return Boolean(env.GEMINI_API_KEY);
}

function isOpenAiConfigured() {
  return Boolean(env.OPENAI_API_KEY);
}

export async function probeOllama(): Promise<boolean> {
  try {
    const base = env.OLLAMA_BASE_URL.replace(/\/$/, '');
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

function isProductionEnv(): boolean {
  return env.NODE_ENV === 'production';
}

export function resolveActiveProvider(): AiProviderId | null {
  if (env.LESSON_PLAN_ENGINE === 'python' || env.LESSON_PLAN_ENGINE === 'local' || env.AI_PROVIDER === 'local') {
    return null;
  }
  const mode = env.AI_PROVIDER;
  if (mode === 'azure_openai' && isAzureConfigured()) return 'azure_openai';
  if (mode === 'groq' && isGroqConfigured() && !isProductionEnv()) return 'groq';
  if (mode === 'gemini' && isGeminiConfigured() && !isProductionEnv()) return 'gemini';
  if (mode === 'ollama' && !isProductionEnv()) return 'ollama';
  if (mode === 'openai' && isOpenAiConfigured()) return 'openai';

  if (mode !== 'auto') return null;

  if (isProductionEnv()) {
    if (isAzureConfigured()) return 'azure_openai';
    if (isOpenAiConfigured()) return 'openai';
    return null;
  }

  if (isAzureConfigured()) return 'azure_openai';
  if (isGroqConfigured()) return 'groq';
  if (isGeminiConfigured()) return 'gemini';
  if (isOpenAiConfigured()) return 'openai';
  return null;
}

async function runProvider(provider: AiProviderId, system: string, user: string): Promise<AiCompletionResult> {
  if (provider === 'azure_openai') return completeAzure(system, user);
  if (provider === 'groq') return completeGroq(system, user);
  if (provider === 'gemini') return completeGemini(system, user);
  if (provider === 'openai') return completeOpenAi(system, user);
  return completeOllama(system, user);
}

function providerFallbackOrder(primary: AiProviderId | null): AiProviderId[] {
  const order: AiProviderId[] = [];
  const add = (p: AiProviderId) => {
    if (!order.includes(p)) order.push(p);
  };
  if (primary) add(primary);

  if (isProductionEnv()) {
    if (isAzureConfigured()) add('azure_openai');
    if (isOpenAiConfigured()) add('openai');
    return order;
  }

  if (env.AI_PROVIDER === 'auto' || env.AI_PROVIDER === primary) {
    if (isAzureConfigured()) add('azure_openai');
    if (isGroqConfigured()) add('groq');
    if (isGeminiConfigured()) add('gemini');
    if (isOpenAiConfigured()) add('openai');
    add('ollama');
  }
  return order;
}

export async function completeStructuredLessonJson(
  system: string,
  user: string,
  options?: { audience?: 'teacher' | 'system' }
): Promise<AiCompletionResult> {
  if ((options?.audience ?? 'teacher') === 'teacher' && !isTeacherAiEnabled()) {
    throw new AppError(403, 'Teacher AI is disabled on this server (TEACHER_AI_ENABLED=false).');
  }

  let primary = resolveActiveProvider();
  if (!primary && env.AI_PROVIDER === 'auto' && !isProductionEnv() && (await probeOllama())) {
    primary = 'ollama';
  }

  const candidates = providerFallbackOrder(primary);
  if (!candidates.length) {
    throw new AppError(
      503,
      isProductionEnv()
        ? 'Production requires Azure OpenAI. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT in CurriculumIntelligence/Backend/.env'
        : 'No AI provider configured. Add Azure OpenAI (recommended), Groq, Gemini, Ollama, or OpenAI in CurriculumIntelligence/Backend/.env'
    );
  }

  const errors: string[] = [];
  for (const provider of candidates) {
    if (provider === 'ollama') {
      const ok = await probeOllama();
      if (!ok) continue;
    }
    try {
      return await runProvider(provider, system, user);
    } catch (err) {
      const msg = err instanceof AppError ? err.message : err instanceof Error ? err.message : String(err);
      errors.push(`${provider}: ${msg}`);
      console.warn(`[AI] ${provider} failed:`, msg);
    }
  }

  throw new AppError(
    502,
    errors.length
      ? `All AI providers failed. ${errors.slice(0, 2).join(' · ')}`
      : 'AI request failed. Check Curriculum API logs and provider keys.'
  );
}

export function getAiStatusPublic() {
  const teacherAi = isTeacherAiEnabled();
  const localEngine =
    env.LESSON_PLAN_ENGINE === 'python' ||
    env.LESSON_PLAN_ENGINE === 'local' ||
    env.LESSON_PLAN_ENGINE === 'hybrid';
  if (localEngine && env.LESSON_PLAN_ENGINE !== 'cloud') {
    return {
      configured: teacherAi,
      provider: 'local',
      providerLabel: 'Curriculum engine (Python + Node)',
      model: 'shuleplus-python-v1',
      mode: env.LESSON_PLAN_ENGINE,
      teacherAiEnabled: teacherAi,
      production: isProductionEnv(),
      recommendedProvider: 'local',
      hints: {
        azure: isAzureConfigured(),
        groq: false,
        gemini: false,
        openai: false,
        ollama: false,
      },
    };
  }
  const provider = teacherAi ? resolveActiveProvider() : null;
  const models: Record<AiProviderId, string> = {
    azure_openai: env.AZURE_OPENAI_DEPLOYMENT,
    groq: env.GROQ_MODEL,
    gemini: env.GEMINI_MODEL,
    ollama: env.OLLAMA_MODEL,
    openai: env.OPENAI_MODEL,
  };

  const production = isProductionEnv();
  return {
    configured: Boolean(provider) && teacherAi,
    provider: provider ?? 'none',
    providerLabel:
      provider === 'azure_openai'
        ? 'Azure OpenAI'
        : provider === 'groq'
          ? 'Groq'
          : provider === 'gemini'
            ? 'Gemini'
            : provider === 'openai'
              ? 'OpenAI'
              : provider === 'ollama'
                ? 'Ollama (local)'
                : 'None',
    model: provider ? models[provider] : null,
    mode: env.AI_PROVIDER,
    teacherAiEnabled: teacherAi,
    production,
    recommendedProvider: 'azure_openai',
    hints: {
      azure: isAzureConfigured(),
      groq: isGroqConfigured() && !production,
      gemini: isGeminiConfigured() && !production,
      openai: isOpenAiConfigured(),
      ollama: production ? false : env.OLLAMA_BASE_URL,
    },
  };
}
