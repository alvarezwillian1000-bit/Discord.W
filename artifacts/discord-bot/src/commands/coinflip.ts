import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("coinflip")
  .setDescription("Lanza una moneda al aire");

export async function execute(interaction: ChatInputCommandInteraction) {
  const resultado = Math.random() < 0.5 ? "CARA 🟡" : "CRUZ ⚪";
  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle("🪙 ¡Lanzando la moneda!")
    .setDescription(`La moneda cayó en... **${resultado}**`)
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}
