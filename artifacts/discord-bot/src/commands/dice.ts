import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("dice")
  .setDescription("Lanza un dado")
  .addIntegerOption((o) =>
    o.setName("caras").setDescription("Número de caras del dado (ej: 6, 20, 100)").setRequired(false).setMinValue(2).setMaxValue(1000)
  )
  .addIntegerOption((o) =>
    o.setName("cantidad").setDescription("Cuántos dados lanzar (1-10)").setRequired(false).setMinValue(1).setMaxValue(10)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const caras = interaction.options.getInteger("caras") ?? 6;
  const cantidad = interaction.options.getInteger("cantidad") ?? 1;

  const resultados = Array.from({ length: cantidad }, () => Math.floor(Math.random() * caras) + 1);
  const total = resultados.reduce((a, b) => a + b, 0);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🎲 Tirando ${cantidad}d${caras}...`)
    .setDescription(
      cantidad === 1
        ? `Resultado: **${resultados[0]}**`
        : `Resultados: **${resultados.join(", ")}**\nTotal: **${total}**`
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
