import { logger } from "../utils/logger.js";

let baseURL: string | undefined;
let apiKey: string;

try {
  baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "replit";
} catch {
  baseURL = undefined;
  apiKey = "replit";
}

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

async function tryReplitAI(messages: ChatMessage[], modelIndex = 0): Promise<string> {
  const models = ["gpt-5-mini", "gpt-5", "gpt-4.1-mini"];
  const model = models[modelIndex] ?? models[0];

  try {
    const url = baseURL ?? "https://ai.replit.com/v1/chat/completions";
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey && apiKey !== "replit" ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 600,
        temperature: 0.85,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }

    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content ?? json.content ?? "";
    if (!content || content.trim() === "") {
      throw new Error("Respuesta vacía del modelo");
    }
    return content.trim();
  } catch (err: any) {
    logger.warn({ err, model }, `Fallo con modelo ${model}`);
    if (modelIndex < models.length - 1) {
      return tryReplitAI(messages, modelIndex + 1);
    }
    throw err;
  }
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

  const systemPrompt = `Eres ${botName}, una IA que vive en Discord con una personalidad única.
${personality}

Instrucciones:
- Responde siempre en español.
- Sé expresivo, original y con carisma. Nunca suenes genérico.
- Máximo 800 caracteres. Sé directo pero memorable.
- Usa emojis estratégicamente.
- Si te mandan una imagen/archivo, comenta sobre su descripción.
- Recuerdas el contexto de la conversación.
- No menciones que eres una IA ni ChatGPT.
- Si alguien te insulta, responde con humor e inteligencia.
- Si preguntan algo que no sabes, improvisa de forma creativa.
- Nunca digas "no puedo" — siempre busca una forma creativa de responder.`;

  let fullUserContent = `[${username}]: ${userMessage}`;
  if (attachmentDesc) fullUserContent += `\n[Adjunto: ${attachmentDesc}]`;

  addToHistory(channelId, { role: "user", content: fullUserContent });

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...getHistory(channelId),
  ];

  const reply = await tryReplitAI(messages);
  addToHistory(channelId, { role: "assistant", content: reply });
  return reply;
}
