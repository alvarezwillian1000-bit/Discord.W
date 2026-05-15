import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getEconomy, addCoins, formatCoins, WORK_COOLDOWN_MS, formatCooldown, WORK_RESPONSES } from "../utils/economy.js";
import { db, userEconomyTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export const data = new SlashCommandBuilder()
  .setName("trabajar")
  .setDescription("Trabaja para ganar monedas (cada 4 horas)");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const guildId = interaction.guildId!;
  const userId = interaction.user.id;
  const eco = await getEconomy(guildId, userId);
  const now = Date.now();

  const lastWork = eco.lastWorkAt ? new Date(eco.lastWorkAt).getTime() : 0;
  if (lastWork && now - lastWork < WORK_COOLDOWN_MS) {
    const remaining = WORK_COOLDOWN_MS - (now - lastWork);
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("😴 Estás cansado")
      .setDescription(`Necesitas descansar antes de volver a trabajar. Vuelve en **${formatCooldown(remaining)}**.`)
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const job = WORK_RESPONSES[Math.floor(Math.random() * WORK_RESPONSES.length)];
  const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

  await addCoins(guildId, userId, earned);

  try {
    await db
      .update(userEconomyTable)
      .set({ lastWorkAt: new Date() })
      .where(and(eq(userEconomyTable.guildId, guildId), eq(userEconomyTable.userId, userId)));
  } catch {
    const { readJson, writeJson } = await import("../utils/db-json.js");
    const all = readJson<Record<string, any>>("economy", {});
    const key = `${guildId}:${userId}`;
    if (all[key]) {
      all[key].lastWorkAt = new Date().toISOString();
      writeJson("economy", all);
    }
  }

  const updated = await getEconomy(guildId, userId);

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
