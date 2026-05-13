import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Muestra la latencia del bot");

export async function execute(interaction: ChatInputCommandInteraction) {
  const sent = await interaction.reply({ content: "📡 Midiendo...", fetchReply: true });
  const latency = (sent as any).createdTimestamp - interaction.createdTimestamp;
  const wsLatency = interaction.client.ws.ping;

  const color = latency < 150 ? 0x57f287 : latency < 400 ? 0xfee75c : 0xed4245;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle("🏓 Pong!")
    .addFields(
      { name: "⏱️ Latencia API", value: `${latency}ms`, inline: true },
      { name: "💓 WebSocket", value: `${wsLatency}ms`, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ content: "", embeds: [embed] });
}
