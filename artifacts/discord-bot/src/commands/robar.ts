import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getEconomy, addCoins, formatCoins, ROB_COOLDOWN_MS, formatCooldown } from "../utils/economy.js";
import { db } from "@workspace/db";
import { userEconomyTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export const data = new SlashCommandBuilder()
  .setName("robar")
  .setDescription("Intenta robarle monedas a alguien (¡puede salir mal!)")
  .addUserOption((o) => o.setName("usuario").setDescription("A quién intentar robar").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("usuario", true);

  if (target.id === interaction.user.id) {
    await interaction.reply({ content: "❌ No puedes robarte a ti mismo.", ephemeral: true });
    return;
  }
  if (target.bot) {
    await interaction.reply({ content: "❌ Los bots tienen anti-robo activado.", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const eco = await getEconomy(interaction.guildId!, interaction.user.id);
  const now = Date.now();

  if (eco.lastRobAt) {
    const elapsed = now - eco.lastRobAt.getTime();
    if (elapsed < ROB_COOLDOWN_MS) {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🚔 Estás bajo vigilancia")
        .setDescription(`La policía te tiene vigilado. Espera **${formatCooldown(ROB_COOLDOWN_MS - elapsed)}** antes de volver a robar.`)
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      return;
    }
  }

  await db
    .update(userEconomyTable)
    .set({ lastRobAt: new Date() })
    .where(and(eq(userEconomyTable.guildId, interaction.guildId!), eq(userEconomyTable.userId, interaction.user.id)));

  const targetEco = await getEconomy(interaction.guildId!, target.id);
  const targetMember = await interaction.guild!.members.fetch(target.id).catch(() => null);
  const targetName = targetMember?.displayName ?? target.username;

  if (targetEco.coins < 50) {
    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("😅 Víctima en quiebra")
      .setDescription(`**${targetName}** está tan sin dinero que ni vale la pena intentarlo. ¡Busca otra víctima!`)
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const successChance = Math.random();
  const maxSteal = Math.floor(targetEco.coins * 0.3);
  const stolen = Math.floor(Math.random() * maxSteal) + 1;
  const fine = Math.floor(eco.coins * 0.15) + 50;

  if (successChance > 0.45) {
    await addCoins(interaction.guildId!, target.id, -stolen);
    await addCoins(interaction.guildId!, interaction.user.id, stolen);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("🦹 ¡Robo exitoso!")
      .setDescription(`Le robaste **${formatCoins(stolen)}** a **${targetName}** sin que nadie se diera cuenta. 🕵️`)
      .addFields(
        { name: "💰 Robado", value: formatCoins(stolen), inline: true },
        { name: "🎯 Víctima", value: targetName, inline: true },
      )
      .setFooter({ text: "Puedes volver a intentarlo en 8 horas" })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } else {
    const actualFine = Math.min(fine, eco.coins);
    await addCoins(interaction.guildId!, interaction.user.id, -actualFine);

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("🚔 ¡Te atraparon!")
      .setDescription(`Intentaste robarle a **${targetName}** pero te pillaron. Pagaste **${formatCoins(actualFine)}** de multa.`)
      .addFields(
        { name: "💸 Multa", value: formatCoins(actualFine), inline: true },
        { name: "👛 Te queda", value: formatCoins(Math.max(0, eco.coins - actualFine)), inline: true },
      )
      .setFooter({ text: "La próxima vez tendrás más suerte... o no." })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
}
