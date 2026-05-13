import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getEconomy, formatCoins } from "../utils/economy.js";
import { db } from "@workspace/db";
import { userEconomyTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

export const data = new SlashCommandBuilder()
  .setName("banco")
  .setDescription("Gestiona tu banco seguro")
  .addSubcommand((sub) =>
    sub
      .setName("depositar")
      .setDescription("Deposita monedas en el banco (protegidas de robos)")
      .addIntegerOption((o) =>
        o.setName("cantidad").setDescription("Cantidad a depositar (o 'todo')").setRequired(true).setMinValue(1)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("retirar")
      .setDescription("Retira monedas del banco a tu cartera")
      .addIntegerOption((o) =>
        o.setName("cantidad").setDescription("Cantidad a retirar").setRequired(true).setMinValue(1)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("ver").setDescription("Ver tu saldo bancario")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const sub = interaction.options.getSubcommand();
  const eco = await getEconomy(interaction.guildId!, interaction.user.id);

  if (sub === "ver") {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🏦 Tu Banco")
      .addFields(
        { name: "👛 Cartera", value: formatCoins(eco.coins), inline: true },
        { name: "🏦 Banco", value: formatCoins(eco.bank), inline: true },
        { name: "💎 Total", value: formatCoins(eco.coins + eco.bank), inline: true },
      )
      .setFooter({ text: "Las monedas en el banco no se pueden robar" })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const cantidad = interaction.options.getInteger("cantidad", true);

  if (sub === "depositar") {
    if (eco.coins < cantidad) {
      await interaction.editReply({ content: `❌ No tienes suficientes monedas. Tienes ${formatCoins(eco.coins)} en cartera.` });
      return;
    }
    await db
      .update(userEconomyTable)
      .set({
        coins: sql`${userEconomyTable.coins} - ${cantidad}`,
        bank: sql`${userEconomyTable.bank} + ${cantidad}`,
      })
      .where(and(eq(userEconomyTable.guildId, interaction.guildId!), eq(userEconomyTable.userId, interaction.user.id)));

    const updated = await getEconomy(interaction.guildId!, interaction.user.id);
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("🏦 Depósito realizado")
      .setDescription(`Depositaste **${formatCoins(cantidad)}** en el banco.`)
      .addFields(
        { name: "👛 Cartera", value: formatCoins(updated.coins), inline: true },
        { name: "🏦 Banco", value: formatCoins(updated.bank), inline: true },
      )
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } else {
    if (eco.bank < cantidad) {
      await interaction.editReply({ content: `❌ No tienes suficientes monedas en el banco. Tienes ${formatCoins(eco.bank)}.` });
      return;
    }
    await db
      .update(userEconomyTable)
      .set({
        coins: sql`${userEconomyTable.coins} + ${cantidad}`,
        bank: sql`${userEconomyTable.bank} - ${cantidad}`,
      })
      .where(and(eq(userEconomyTable.guildId, interaction.guildId!), eq(userEconomyTable.userId, interaction.user.id)));

    const updated = await getEconomy(interaction.guildId!, interaction.user.id);
    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle("🏦 Retiro realizado")
      .setDescription(`Retiraste **${formatCoins(cantidad)}** del banco a tu cartera.`)
      .addFields(
        { name: "👛 Cartera", value: formatCoins(updated.coins), inline: true },
        { name: "🏦 Banco", value: formatCoins(updated.bank), inline: true },
      )
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
}
