import OpenAI from "openai";
import { logger } from "../utils/logger.js";

const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

let openai: OpenAI | null = null;

try {
  if (baseURL) {
    openai = new OpenAI({ baseURL, apiKey: apiKey ?? undefined });
  }
} catch (e) {
  logger.error(e, "Error inicializando OpenAI");
  openai = null;
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

  // Si OpenAI no está configurado, usa respuesta creativa fallback
  if (!openai) {
    if (modelIndex === 0) {
      logger.warn("OpenAI no está configurado. Usando respuesta fallback creativa.");
    }
    const lastUser = messages.filter(m => m.role === "user").pop()?.content ?? "";
    const userName = lastUser.match(/^\[([^\]]+)\]/)?.[1] ?? "amigo";
    const fallbackReplies = [
      `Ey ${userName}, justo ahora estoy procesando eso en mis circuitos... Dame un segundo y vuelve a intentarlo. 🚀`,
      `${userName}, mis neuronas artificiales están en mantenimiento cósmico. Un momento por favor. ✨`,
      `Vaya pregunta, ${userName}... Estoy conectando con la matrix para darte la mejor respuesta. Reintenta. 🌟`,
      `Lo siento ${userName}, mi conexión interdimensional falló. Vuelve a intentarlo en unos segundos. 💫`,
      `${userName}, estoy recalibrando mis chakras digitales. Un momento... 🔮`,
    ];
    return fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
  }

  try {
    const response = await openai.chat.completions.create({
      model,
      max_completion_tokens: 600,
      messages: messages as any,
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
- NUNCA digas "no puedo" o "no sé" — siempre busca una forma creativa de responder.`;

  let fullUserContent = `[${username}]: ${userMessage}`;
  if (attachmentDesc) fullUserContent += `\n[Adjunto: ${attachmentDesc}]`;

  addToHistory(channelId, { role: "user", content: fullUserContent });

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...getHistory(channelId),
  ];

  try {
    const reply = await tryGenerate(messages);
    addToHistory(channelId, { role: "assistant", content: reply });
    return reply;
  } catch (err) {
    logger.error(err, "Error generando respuesta de IA");
    // Último fallback: respuesta creativa genérica
    const fallbacks = [
      "Mis circuitos están en modo zen ahora mismo. Vuelve a intentarlo. 💫",
      "Tuve un momento de inspiración cósmica... pero se me escapó. Reintenta. ✨",
      "Estoy canalizando energía creativa de otra dimensión. Un momento... 🔮",
      "Mi procesador cuántico está haciendo overtime. Dame un segundo. 🚀",
    ];
    const fb = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    addToHistory(channelId, { role: "assistant", content: fb });
    return fb;
  }
}
