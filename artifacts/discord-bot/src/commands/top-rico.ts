import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getEconomyLeaderboard, formatCoins } from "../utils/economy.js";

const MEDALS = ["🥇", "🥈", "🥉"];

export const data = new SlashCommandBuilder()
  .setName("top-rico")
  .setDescription("Muestra el ranking de los más ricos del servidor");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const rows = await getEconomyLeaderboard(interaction.guildId!, 10);

  if (rows.length === 0) {
    await interaction.editReply({ content: "❌ Nadie tiene monedas todavía. Usa `/daily` para empezar." });
    return;
  }

  const lines: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const medal = MEDALS[i] ?? `**#${i + 1}**`;
    const member = await interaction.guild!.members.fetch(row.userId).catch(() => null);
    const name = member?.displayName ?? `<@${row.userId}>`;
    const total = row.coins + row.bank;
    lines.push(`${medal} **${name}** — ${formatCoins(total)} (👛${formatCoins(row.coins)} + 🏦${formatCoins(row.bank)})`);
  }

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle(`💰 Los más ricos de ${interaction.guild!.name}`)
    .setDescription(lines.join("\n"))
    .setThumbnail(interaction.guild!.iconURL())
    .setFooter({ text: "Gana monedas con /daily, /trabajar y /ruleta" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
