import { type TextBasedChannel, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";
import { client } from "../index.js";
import { logger } from "../utils/logger.js";

export interface Giveaway {
  messageId: string;
  channelId: string;
  guildId: string;
  prize: string;
  winners: number;
  endsAt: number;
  hostId: string;
  participants: string[];
  ended: boolean;
}

export const activeGiveaways = new Map<string, Giveaway>();

export function parseDuration(input: string): number | null {
  const regex = /(\d+)\s*(d|h|m|s)/gi;
  let ms = 0;
  let match;
  while ((match = regex.exec(input)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === "d") ms += value * 86400000;
    else if (unit === "h") ms += value * 3600000;
    else if (unit === "m") ms += value * 60000;
    else if (unit === "s") ms += value * 1000;
  }
  return ms > 0 ? ms : null;
}

export function formatTimeLeft(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function buildGiveawayEmbed(g: Giveaway, ended = false): EmbedBuilder {
  const timeLeft = g.endsAt - Date.now();
  return new EmbedBuilder()
    .setColor(ended ? 0x2f3136 : 0xffd700)
    .setTitle(ended ? `🏆 Sorteo finalizado — ${g.prize}` : `🎉 ¡SORTEO! — ${g.prize}`)
    .setDescription(
      ended
        ? `El sorteo ha terminado.`
        : `Haz clic en **🎉 Participar** para entrar al sorteo.\n\n⏰ Termina en: **${formatTimeLeft(timeLeft)}**`
    )
    .addFields(
      { name: "🎁 Premio", value: g.prize, inline: true },
      { name: "🏅 Ganadores", value: String(g.winners), inline: true },
      { name: "👥 Participantes", value: String(g.participants.length), inline: true },
      { name: "👤 Organizado por", value: `<@${g.hostId}>`, inline: true }
    )
    .setFooter({ text: ended ? "Sorteo finalizado" : `Termina el` })
    .setTimestamp(g.endsAt);
}

export async function endGiveaway(giveaway: Giveaway): Promise<void> {
  if (giveaway.ended) return;
  giveaway.ended = true;

  try {
    const channel = await client.channels.fetch(giveaway.channelId) as TextBasedChannel;
    const message = await (channel as any).messages.fetch(giveaway.messageId);

    const participants = giveaway.participants;
    const embed = buildGiveawayEmbed(giveaway, true);

    if (participants.length === 0) {
      embed.setDescription("❌ Nadie participó en este sorteo.");
      await message.edit({ embeds: [embed], components: [] });
      await (channel as any).send({ content: "❌ El sorteo terminó pero nadie participó." });
      return;
    }

    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const winnerIds = shuffled.slice(0, Math.min(giveaway.winners, participants.length));
    const winnerMentions = winnerIds.map((id) => `<@${id}>`).join(", ");
    const singular = winnerIds.length === 1;

    embed.addFields({ name: singular ? "🏆 Ganador" : "🏆 Ganadores", value: winnerMentions });
    embed.setDescription(
      singular
        ? `El sorteo ha terminado. ¡Felicidades al ganador!`
        : `El sorteo ha terminado. ¡Felicidades a los ganadores!`
    );

    await message.edit({ embeds: [embed], components: [] });
    await (channel as any).send({
      content: singular
        ? `🎉 ¡Felicidades ${winnerMentions}! Ganó **${giveaway.prize}**.`
        : `🎉 ¡Felicidades ${winnerMentions}! Ganaron **${giveaway.prize}**.`,
    });
  } catch (err) {
    logger.error(err, "Error finalizando sorteo");
  }

  activeGiveaways.delete(giveaway.messageId);
}
