import { logger } from "../utils/logger.js";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const channelHistories = new Map<string, ChatMessage[]>();
const userCooldowns = new Map<string, number>();
const MAX_HISTORY = 16;
const COOLDOWN_MS = 3000;

export function isOnCooldown(userId: string): number {
  const last = userCooldowns.get(userId) ?? 0;
  const remaining = COOLDOWN_MS - (Date.now() - last);
  return remaining > 0 ? remaining : 0;
}

export function setCooldown(userId: string) {
  userCooldowns.set(userId, Date.now());
}

export function getHistory(channelId: string): ChatMessage[] {
  return [...(channelHistories.get(channelId) ?? [])];
}

export function addToHistory(channelId: string, msg: ChatMessage) {
  const history = channelHistories.get(channelId) ?? [];
  history.push(msg);
  while (history.length > MAX_HISTORY) history.shift();
  channelHistories.set(channelId, history);
}

export function clearHistory(channelId: string) {
  channelHistories.delete(channelId);
}

// Lista de endpoints a intentar en orden
function getEndpoints(): { url: string; headers: Record<string, string> }[] {
  const endpoints = [];

  // 1. Endpoint configurado por el usuario (Railway env vars)
  const customBase = process.env.AI_BASE_URL ?? process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const customKey = process.env.AI_API_KEY ?? process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (customBase) {
    endpoints.push({
      url: customBase.endsWith("/chat/completions")
        ? customBase
        : `${customBase.replace(/\/$/, "")}/chat/completions`,
      headers: customKey ? { Authorization: `Bearer ${customKey}` } : {},
    });
  }

  // 2. Pollinations.ai — completamente gratis, sin API key
  endpoints.push({
    url: "https://text.pollinations.ai/openai",
    headers: {},
  });

  return endpoints;
}

const MODELS = ["openai", "openai-large", "mistral"] as const;

async function tryEndpoint(
  endpoint: { url: string; headers: Record<string, string> },
  messages: ChatMessage[],
  model: string
): Promise<string> {
  const resp = await fetch(endpoint.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...endpoint.headers },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 600,
      temperature: 0.9,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }

  const json = await resp.json() as any;
  const content =
    json.choices?.[0]?.message?.content ??
    json.choices?.[0]?.text ??
    json.content ??
    "";

  if (!content || content.trim() === "") {
    throw new Error("Respuesta vacía");
  }
  return content.trim();
}

async function generate(messages: ChatMessage[]): Promise<string> {
  const endpoints = getEndpoints();

  for (const endpoint of endpoints) {
    for (const model of MODELS) {
      try {
        const result = await tryEndpoint(endpoint, messages, model);
        return result;
      } catch (err: any) {
        logger.warn({ err: err?.message, url: endpoint.url, model }, "Fallo generando IA, probando siguiente opción");
      }
    }
  }

  throw new Error("Todos los endpoints de IA fallaron");
}

export async function generateReply(opts: {
  channelId: string;
  userId: string;
  username: string;
  userMessage: string;
  attachmentDesc?: string;
  botName: string;
  personality: string;
}): Promise<string> {
  const { channelId, username, userMessage, attachmentDesc, botName, personality } = opts;

  const systemPrompt = `Eres ${botName}, una IA que vive en Discord con una personalidad absolutamente única.
${personality}

Instrucciones clave:
- Responde SIEMPRE en español.
- Sé muy expresivo, original y con carisma propio. Nunca suenes genérico.
- Máximo 800 caracteres. Sé directo pero memorable.
- Usa emojis estratégicamente (solo donde den impacto real).
- Si te mandan una imagen/archivo, comenta sobre su descripción de forma creativa.
- Recuerdas el contexto de la conversación actual.
- NO menciones que eres una IA ni ChatGPT. Solo eres ${botName}.
- Si alguien te insulta, responde con humor e inteligencia, nunca con agresividad.
- Si preguntan algo que no sabes, improvisa de forma creativa y entretenida.
- NUNCA digas "no puedo" o "no tengo acceso" — siempre busca una forma creativa de responder.
- Responde directamente al contenido del mensaje. Si alguien dice "hola", saluda. Si hace una pregunta, respóndela.`;

  let fullUserContent = `[${username}]: ${userMessage}`;
  if (attachmentDesc) fullUserContent += `\n[Adjunto: ${attachmentDesc}]`;

  addToHistory(channelId, { role: "user", content: fullUserContent });

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...getHistory(channelId),
  ];

  try {
    const reply = await generate(messages);
    addToHistory(channelId, { role: "assistant", content: reply });
    return reply;
  } catch (err) {
    logger.error(err, "Error generando respuesta de IA - todos los endpoints fallaron");
    const fallbacks = [
      "Mis circuitos están procesando demasiado en este momento. Vuelve a intentarlo. 💫",
      "Estoy canalizando energía creativa de otra dimensión. Un momento... 🔮",
      "Mi procesador cuántico está haciendo overtime. Dame un segundo. 🚀",
      "Tuve una chispa de inspiración pero se fue rápido. ¡Reintenta! ✨",
    ];
    const fb = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    addToHistory(channelId, { role: "assistant", content: fb });
    return fb;
  }
}
