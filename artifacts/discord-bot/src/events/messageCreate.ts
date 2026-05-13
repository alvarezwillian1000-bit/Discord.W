import {
  Events,
  type Message,
  EmbedBuilder,
  Colors,
} from "discord.js";
import { getGuildConfig } from "../utils/config.js";
import { generateReply, isOnCooldown, setCooldown } from "../utils/ai.js";
import { handleMessageXP, getLevelColor, getLevelTier } from "../utils/levels.js";
import { logger } from "../utils/logger.js";

export const name = Events.MessageCreate;
export const once = false;

const IA_COLORS = [0x9b59b6, 0x8e44ad, 0x7d3c98, 0xa569bd, 0x6c3483];

function randomColor() {
  return IA_COLORS[Math.floor(Math.random() * IA_COLORS.length)];
}

function getAttachmentDescription(message: Message): string | undefined {
  const attachments = [...message.attachments.values()];
  if (attachments.length === 0) return undefined;
  return attachments
    .map((a) => {
      if (a.contentType?.startsWith("image/")) return `imagen: ${a.name}`;
      if (a.contentType?.startsWith("video/")) return `video: ${a.name}`;
      if (a.contentType?.startsWith("audio/")) return `audio: ${a.name}`;
      return `archivo: ${a.name}`;
    })
    .join(", ");
}

export async function execute(message: Message) {
  if (message.author.bot) return;
  if (!message.guildId) return;

  // ── XP por mensaje (en todos los canales excepto el de IA) ──────────────
  const config = await getGuildConfig(message.guildId);

  if (message.channelId !== config.iaChannelId) {
    await handleMessageXP(message.guildId, message.author.id, async (newLevel, _xp) => {
      try {
        const tier = getLevelTier(newLevel);
        const color = getLevelColor(newLevel);

        const levelEmbed = new EmbedBuilder()
          .setColor(color)
          .setTitle(`${tier} — ¡Subiste de nivel!`)
          .setDescription(
            `${message.author} acaba de alcanzar el **Nivel ${newLevel}**. 🎉\n\n` +
            `Sigue siendo activo para seguir subiendo. ¡Tú puedes!`
          )
          .setThumbnail(message.author.displayAvatarURL())
          .setFooter({ text: `Usa /rank para ver tu progreso` })
          .setTimestamp();

        const announceChannelId = config.xpChannelId ?? message.channelId;
        const announceChannel = message.guild?.channels.cache.get(announceChannelId);

        if (announceChannel?.isTextBased()) {
          await (announceChannel as any).send({ embeds: [levelEmbed] });
        } else {
          await message.channel.send({ embeds: [levelEmbed] });
        }
      } catch (err) {
        logger.error(err, "Error enviando anuncio de nivel");
      }
    });
  }

  // ── Respuesta de IA (solo en canal configurado) ──────────────────────────
  if (!config.iaChannelId || message.channelId !== config.iaChannelId) return;

  const text = message.content.trim();
  const attachmentDesc = getAttachmentDescription(message);

  if (!text && !attachmentDesc) return;

  const cooldownMs = isOnCooldown(message.author.id);
  if (cooldownMs > 0) {
    const warn = await message.react("⏳").catch(() => null);
    setTimeout(() => warn?.remove().catch(() => {}), 2000);
    return;
  }

  setCooldown(message.author.id);

  const botName = config.iaBotName ?? "ARIA";
  const personality =
    config.iaPersonality ??
    "Eres una IA misteriosa y carismática, con humor seco y mucha sabiduría. Te encanta sorprender con respuestas inesperadas pero siempre útiles.";

  let typingInterval: ReturnType<typeof setInterval> | null = null;

  try {
    await message.channel.sendTyping();
    typingInterval = setInterval(() => {
      message.channel.sendTyping().catch(() => {});
    }, 8000);

    const reply = await generateReply({
      channelId: message.channelId,
      userId: message.author.id,
      username: message.member?.displayName ?? message.author.username,
      userMessage: text || "(sin texto)",
      attachmentDesc,
      botName,
      personality,
    });

    if (typingInterval) { clearInterval(typingInterval); typingInterval = null; }

    const embed = new EmbedBuilder()
      .setColor(randomColor())
      .setAuthor({ name: botName, iconURL: message.client.user?.displayAvatarURL() })
      .setDescription(reply)
      .setFooter({
        text: `Respondiendo a ${message.member?.displayName ?? message.author.username}`,
        iconURL: message.author.displayAvatarURL(),
      })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (err: any) {
    if (typingInterval) { clearInterval(typingInterval); typingInterval = null; }

    logger.error(err, "Error generando respuesta de IA");

    const errorMsg = String(err?.message ?? err ?? "");
    let userFacing = "Tuve un momento de confusión cósmica. Vuelve a intentarlo. 🌀";
    if (errorMsg.includes("rate limit") || errorMsg.includes("429"))
      userFacing = "Mis neuronas artificiales están sobrecalentadas. Dame un segundo. 🔥";
    else if (errorMsg.includes("timeout") || errorMsg.includes("ECONNRESET"))
      userFacing = "Se cortó mi línea de pensamiento. Reintenta en un momento. 📡";

    const errEmbed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setAuthor({ name: botName, iconURL: message.client.user?.displayAvatarURL() })
      .setDescription(`⚠️ ${userFacing}`)
      .setTimestamp();

    await message.reply({ embeds: [errEmbed] }).catch(() => {});
  }
}
