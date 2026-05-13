import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getLeaderboard, getLevelTier, getLevelColor, getXPProgress } from "../utils/levels.js";

const MEDALS = ["🥇", "🥈", "🥉"];

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("Muestra el top 10 de miembros con más XP en el servidor");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const rows = await getLeaderboard(interaction.guildId!, 10);

  if (rows.length === 0) {
    await interaction.editReply({ content: "❌ Nadie tiene XP todavía. ¡Empieza a chatear!" });
    return;
  }

  const lines: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const medal = MEDALS[i] ?? `**#${i + 1}**`;
    const member = await interaction.guild!.members.fetch(row.userId).catch(() => null);
    const name = member?.displayName ?? `<@${row.userId}>`;
    const { level } = getXPProgress(row.xp);
    lines.push(`${medal} **${name}** — Nv. ${level} · ${row.xp.toLocaleString()} XP`);
  }

  const topColor = rows[0] ? getLevelColor(getXPProgress(rows[0].xp).level) : 0xffd700;

  const embed = new EmbedBuilder()
    .setColor(topColor)
    .setTitle(`🏆 Leaderboard de XP — ${interaction.guild!.name}`)
    .setDescription(lines.join("\n"))
    .setThumbnail(interaction.guild!.iconURL())
    .setFooter({ text: "XP se gana enviando mensajes (1 vez por minuto)" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
