import OpenAI from "openai";
import { logger } from "../utils/logger.js";

const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy";

let openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!openai) {
    if (!baseURL) throw new Error("AI_INTEGRATIONS_OPENAI_BASE_URL no está configurado.");
    openai = new OpenAI({ baseURL, apiKey });
  }
  return openai;
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

const MODELS = ["gpt-5-mini", "gpt-5", "gpt-4.1-mini"] as const;

async function tryGenerate(messages: ChatMessage[], modelIndex = 0): Promise<string> {
  const model = MODELS[modelIndex] ?? MODELS[0];
  try {
    const client = getOpenAI();
    const response = await client.chat.completions.create({
      model,
      max_completion_tokens: 600,
      messages,
    });
    const content = response.choices[0]?.message?.content;
    if (!content || content.trim() === "") {
      throw new Error("Respuesta vacía del modelo");
    }
    return content.trim();
  } catch (err: any) {
    logger.warn({ err, model }, `Fallo con modelo ${model}`);
    if (modelIndex < MODELS.length - 1) {
      return tryGenerate(messages, modelIndex + 1);
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

  const systemPrompt = `Eres ${botName}, una IA que vive en Discord con una personalidad absolutamente única.
${personality}

Instrucciones clave:
- Responde siempre en el idioma del usuario (español por defecto).
- Sé muy expresivo, original y con carisma propio. Nunca suenes genérico.
- Máximo 800 caracteres. Sé directo pero memorable.
- Usa emojis estratégicamente (no en cada frase, solo donde den impacto).
- Si te mandan una imagen/archivo, comenta sobre su descripción.
- Recuerdas el contexto de la conversación actual.
- No menciones que eres una IA ni ChatGPT. Solo eres ${botName}.
- Si alguien te insulta, responde con humor e inteligencia.
- Si preguntan algo que no sabes, improvisa de forma creativa y honesta.
- Nunca digas que "no puedes" ayudar con algo — siempre busca una forma creativa de responder.`;

  let fullUserContent = `[${username}]: ${userMessage}`;
  if (attachmentDesc) fullUserContent += `\n[Adjunto: ${attachmentDesc}]`;

  addToHistory(channelId, { role: "user", content: fullUserContent });

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...getHistory(channelId),
  ];

  const reply = await tryGenerate(messages);
  addToHistory(channelId, { role: "assistant", content: reply });
  return reply;
}
