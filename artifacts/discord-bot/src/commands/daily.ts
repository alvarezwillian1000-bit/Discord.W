import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getEconomy, addCoins, formatCoins, DAILY_COOLDOWN_MS, formatCooldown } from "../utils/economy.js";
import { db } from "@workspace/db";
import { userEconomyTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

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

  const eco = await getEconomy(interaction.guildId!, interaction.user.id);
  const now = Date.now();

  if (eco.lastDailyAt) {
    const elapsed = now - eco.lastDailyAt.getTime();
    if (elapsed < DAILY_COOLDOWN_MS) {
      const remaining = DAILY_COOLDOWN_MS - elapsed;
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("⏰ Daily en cooldown")
        .setDescription(`Ya recogiste tu daily. Vuelve en **${formatCooldown(remaining)}**.`)
        .setFooter({ text: "¡Vuelve mañana para más monedas!" })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      return;
    }
  }

  const earned = Math.floor(Math.random() * (DAILY_MAX - DAILY_MIN + 1)) + DAILY_MIN;
  const msg = DAILY_MSGS[Math.floor(Math.random() * DAILY_MSGS.length)];

  await addCoins(interaction.guildId!, interaction.user.id, earned);
  await db
    .update(userEconomyTable)
    .set({ lastDailyAt: new Date() })
    .where(and(eq(userEconomyTable.guildId, interaction.guildId!), eq(userEconomyTable.userId, interaction.user.id)));

  const updated = await getEconomy(interaction.guildId!, interaction.user.id);

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
