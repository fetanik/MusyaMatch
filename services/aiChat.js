const OLLAMA_BASE = (process.env.OLLAMA_HOST || 'http://localhost:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export function getOpenAiApiKey() {
  return (process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '').trim();
}

export function getAiProviderLabel() {
  return getOpenAiApiKey() ? 'openai' : 'ollama';
}

export function logAiStartupHints() {
  const apiKey = getOpenAiApiKey();
  if (apiKey) {
    console.log(`🤖 AI chat: OpenAI (${OPENAI_MODEL})`);
    return;
  }
  console.log(`🦙 AI chat: Ollama at ${OLLAMA_BASE} (model: ${OLLAMA_MODEL})`);
  console.log('   No OPENAI_API_KEY / AI_API_KEY — install Ollama: https://ollama.com');
  console.log(`   Then: ollama pull ${OLLAMA_MODEL} && ollama serve`);
  console.log('   Or add OPENAI_API_KEY (or AI_API_KEY) to .env for cloud AI');
}

async function queryOpenAI(userMessage, systemPrompt) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY or AI_API_KEY is not set in .env');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 500,
      temperature: 0.8,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI error: ${response.status}`);
  }

  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error('OpenAI returned an empty response');
  }
  return reply;
}

async function queryOllama(userMessage, systemPrompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  try {
    const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `${systemPrompt}\n\nUser: ${userMessage}\n\nMusya:`,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const reply = data?.response?.trim();
    if (!reply) {
      throw new Error('Ollama returned an empty response');
    }
    return reply;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Ollama request timeout (3 min). Try a smaller model or use OpenAI.');
    }
    if (error.cause?.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      throw new Error(
        `Cannot reach Ollama at ${OLLAMA_BASE}. Install from https://ollama.com, run "ollama serve", or set OPENAI_API_KEY in .env.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/** OpenAI when a key is set; otherwise local Ollama. */
export async function queryMusya(userMessage, systemPrompt) {
  if (getOpenAiApiKey()) {
    console.log('🤖 Querying OpenAI…');
    return queryOpenAI(userMessage, systemPrompt);
  }

  console.log(`🦙 Querying Ollama (${OLLAMA_MODEL})…`);
  return queryOllama(userMessage, systemPrompt);
}
