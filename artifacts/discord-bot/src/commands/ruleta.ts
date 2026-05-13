import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getEconomy, addCoins, formatCoins } from "../utils/economy.js";

const ROULETTE_COLORS = ["🔴", "⚫", "🔴", "⚫", "🔴", "⚫", "🟢", "🔴", "⚫", "🔴", "⚫", "🔴", "⚫"];

export const data = new SlashCommandBuilder()
  .setName("ruleta")
  .setDescription("Apuesta monedas en la ruleta (¡cuidado, puedes perderlo todo!)")
  .addIntegerOption((o) =>
    o.setName("apuesta").setDescription("Cantidad a apostar").setRequired(true).setMinValue(10)
  )
  .addStringOption((o) =>
    o
      .setName("color")
      .setDescription("Elige color: rojo (x2), negro (x2) o verde (x14)")
      .setRequired(true)
      .addChoices(
        { name: "🔴 Rojo (x2)", value: "rojo" },
        { name: "⚫ Negro (x2)", value: "negro" },
        { name: "🟢 Verde (x14) — ¡alto riesgo!", value: "verde" }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const apuesta = interaction.options.getInteger("apuesta", true);
  const colorElegido = interaction.options.getString("color", true);

  const eco = await getEconomy(interaction.guildId!, interaction.user.id);

  if (eco.coins < apuesta) {
    await interaction.editReply({
      content: `❌ No tienes suficientes monedas. Tienes ${formatCoins(eco.coins)} en cartera.\nUsa \`/banco retirar\` si tienes dinero en el banco.`,
    });
    return;
  }

  const resultado = ROULETTE_COLORS[Math.floor(Math.random() * ROULETTE_COLORS.length)];
  const esVerde = resultado === "🟢";
  const esRojo = resultado === "🔴";
  const esNegro = resultado === "⚫";

  const gano =
    (colorElegido === "verde" && esVerde) ||
    (colorElegido === "rojo" && esRojo) ||
    (colorElegido === "negro" && esNegro);

  let ganancia = 0;
  let descripcion = "";

  if (gano) {
    const multiplicador = colorElegido === "verde" ? 14 : 2;
    ganancia = apuesta * multiplicador - apuesta;
    await addCoins(interaction.guildId!, interaction.user.id, ganancia);
    descripcion = `¡Ganaste! La ruleta cayó en **${resultado}** y multiplicaste por **${multiplicador}x**.`;
  } else {
    await addCoins(interaction.guildId!, interaction.user.id, -apuesta);
    descripcion = `Perdiste. La ruleta cayó en **${resultado}** y perdiste tu apuesta.`;
  }

  const updated = await getEconomy(interaction.guildId!, interaction.user.id);
  const colorMap: Record<string, string> = { rojo: "🔴 Rojo", negro: "⚫ Negro", verde: "🟢 Verde" };

  const embed = new EmbedBuilder()
    .setColor(gano ? (esVerde ? 0x57f287 : esRojo ? 0xed4245 : 0x2f3136) : 0xed4245)
    .setTitle(gano ? "🎰 ¡GANASTE!" : "🎰 ¡Suerte la próxima!")
    .setDescription(descripcion)
    .addFields(
      { name: "🎯 Tu elección", value: colorMap[colorElegido], inline: true },
      { name: "🎡 Resultado", value: resultado, inline: true },
      { name: gano ? "💰 Ganancia" : "💸 Perdida", value: formatCoins(gano ? ganancia : apuesta), inline: true },
      { name: "👛 Cartera actual", value: formatCoins(updated.coins), inline: true },
    )
    .setFooter({ text: "Probabilidades: Rojo/Negro 46%, Verde 7.7%" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
