import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getEconomy, addCoins, formatCoins, DAILY_COOLDOWN_MS, formatCooldown } from "../utils/economy.js";
import { db, userEconomyTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getEconomyJson, addCoinsJson } from "../utils/db-json.js";

const DAILY_MIN = 100;
const DAILY_MAX = 500;

const DAILY_MSGS = [
  "Encontraste una cartera en el suelo. ¡Dinero fácil!",
  "Vendiste algo viejo por internet. ¡Buen precio!",
  "Ganaste un mini torneo de Roblox. ¡Campeón!",
  "Tu tío te transfirió algo. Sin preguntas.",
  "Recogiste tu salario diario. ¡A gastarlo!",
  "Un streamer te donó algo en su stream. ¡Gracias!",
  "Encontraste monedas debajo del sofá.",
  "Te ganaste la lotería menor. ¡Por fin!",
];

export const data = new SlashCommandBuilder()
  .setName("daily")
  .setDescription("Recoge tus monedas diarias (cada 24 horas)");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const guildId = interaction.guildId!;
  const userId = interaction.user.id;
  const eco = await getEconomy(guildId, userId);
  const now = Date.now();

  const lastDaily = eco.lastDailyAt ? new Date(eco.lastDailyAt).getTime() : 0;
  if (lastDaily && now - lastDaily < DAILY_COOLDOWN_MS) {
    const remaining = DAILY_COOLDOWN_MS - (now - lastDaily);
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("⏰ Daily en cooldown")
      .setDescription(`Ya recogiste tu daily. Vuelve en **${formatCooldown(remaining)}**.`)
      .setFooter({ text: "¡Vuelve mañana para más monedas!" })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const earned = Math.floor(Math.random() * (DAILY_MAX - DAILY_MIN + 1)) + DAILY_MIN;
  const msg = DAILY_MSGS[Math.floor(Math.random() * DAILY_MSGS.length)];

  await addCoins(guildId, userId, earned);

  try {
    await db
      .update(userEconomyTable)
      .set({ lastDailyAt: new Date() })
      .where(and(eq(userEconomyTable.guildId, guildId), eq(userEconomyTable.userId, userId)));
  } catch {
    // JSON fallback: also save lastDailyAt
    const all = getEconomyJson(guildId, userId);
    // addCoinsJson already updated coins, we need to set the timestamp separately
    const all2 = (await import("../utils/db-json.js")).readJson<Record<string, any>>("economy", {});
    const key = `${guildId}:${userId}`;
    if (all2[key]) {
      all2[key].lastDailyAt = new Date().toISOString();
      (await import("../utils/db-json.js")).writeJson("economy", all2);
    }
  }

  const updated = await getEconomy(guildId, userId);

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle("🎁 ¡Daily recogido!")
    .setDescription(`*${msg}*`)
    .addFields(
      { name: "💰 Ganado hoy", value: formatCoins(earned), inline: true },
      { name: "👛 Cartera actual", value: formatCoins(updated.coins), inline: true },
    )
    .setFooter({ text: "Vuelve en 24 horas para tu próximo daily" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
