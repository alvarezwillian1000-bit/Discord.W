import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getEconomy, addCoins, formatCoins, WORK_COOLDOWN_MS, formatCooldown, WORK_RESPONSES } from "../utils/economy.js";
import { db } from "@workspace/db";
import { userEconomyTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export const data = new SlashCommandBuilder()
  .setName("trabajar")
  .setDescription("Trabaja para ganar monedas (cada 4 horas)");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const eco = await getEconomy(interaction.guildId!, interaction.user.id);
  const now = Date.now();

  if (eco.lastWorkAt) {
    const elapsed = now - eco.lastWorkAt.getTime();
    if (elapsed < WORK_COOLDOWN_MS) {
      const remaining = WORK_COOLDOWN_MS - elapsed;
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("😴 Estás cansado")
        .setDescription(`Necesitas descansar antes de volver a trabajar. Vuelve en **${formatCooldown(remaining)}**.`)
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      return;
    }
  }

  const job = WORK_RESPONSES[Math.floor(Math.random() * WORK_RESPONSES.length)];
  const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

  await addCoins(interaction.guildId!, interaction.user.id, earned);
  await db
    .update(userEconomyTable)
    .set({ lastWorkAt: new Date() })
    .where(and(eq(userEconomyTable.guildId, interaction.guildId!), eq(userEconomyTable.userId, interaction.user.id)));

  const updated = await getEconomy(interaction.guildId!, interaction.user.id);

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("💼 ¡Trabajo completado!")
    .setDescription(`Trabajaste como **${job.job}** y ganaste **${formatCoins(earned)}**.`)
    .addFields(
      { name: "💰 Ganado", value: formatCoins(earned), inline: true },
      { name: "👛 Cartera", value: formatCoins(updated.coins), inline: true },
    )
    .setFooter({ text: "Puedes volver a trabajar en 4 horas" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
