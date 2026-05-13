import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { db } from "@workspace/db";
import { warningsTable, verificationsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { getUserLevel, getXPProgress, buildProgressBar, getLevelColor, getLevelTier } from "../utils/levels.js";
import { getEconomy, formatCoins } from "../utils/economy.js";

export const data = new SlashCommandBuilder()
  .setName("perfil")
  .setDescription("Muestra tu perfil completo en el servidor")
  .addUserOption((o) => o.setName("usuario").setDescription("Usuario (por defecto tú)").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("usuario", false) ?? interaction.user;
  const member = await interaction.guild!.members.fetch(target.id).catch(() => null);

  if (!member) {
    await interaction.reply({ content: "❌ No encontré a ese usuario en el servidor.", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const [warnResult, verifs, levelRow, eco] = await Promise.all([
    db.select({ total: count() }).from(warningsTable)
      .where(and(eq(warningsTable.guildId, interaction.guildId!), eq(warningsTable.userId, target.id)))
      .then((r) => r[0]),
    db.select().from(verificationsTable)
      .where(eq(verificationsTable.discordUserId, target.id))
      .orderBy(verificationsTable.createdAt)
      .limit(1),
    getUserLevel(interaction.guildId!, target.id),
    getEconomy(interaction.guildId!, target.id),
  ]);

  const robloxInfo = verifs.length > 0
    ? `[${verifs[0].robloxUsername}](${verifs[0].robloxProfileUrl})`
    : "No verificado";

  const topRole = [...member.roles.cache.values()]
    .filter((r) => r.id !== interaction.guild!.roles.everyone.id)
    .sort((a, b) => b.position - a.position)[0];

  const xpData = levelRow ? getXPProgress(levelRow.xp) : null;
  const color = xpData ? getLevelColor(xpData.level) : (member.displayHexColor as `#${string}` | null ? parseInt((member.displayHexColor).replace("#", ""), 16) : 0x5865f2);
  const tier = xpData ? getLevelTier(xpData.level) : "🟢 Novato";
  const xpBar = xpData ? buildProgressBar(xpData.percent, 12) : "░".repeat(12);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`👤 Perfil de ${member.displayName}`)
    .setThumbnail(member.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: "🏷️ Tag", value: target.tag, inline: true },
      { name: "🆔 ID", value: target.id, inline: true },
      { name: "📅 En el servidor desde", value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : "?", inline: true },
      { name: "🎮 Roblox", value: robloxInfo, inline: true },
      { name: "🎭 Rol principal", value: topRole ? `<@&${topRole.id}>` : "Ninguno", inline: true },
      { name: "⚠️ Advertencias", value: String(warnResult?.total ?? 0), inline: true },
      {
        name: `✨ Nivel ${xpData?.level ?? 0} — ${tier}`,
        value: xpData
          ? `\`${xpBar}\` ${xpData.percent}%\n${xpData.currentXP} / ${xpData.neededXP} XP · Total: ${levelRow!.xp.toLocaleString()} XP`
          : "Sin XP todavía",
        inline: false,
      },
      {
        name: "💰 Economía",
        value: `👛 ${formatCoins(eco.coins)} · 🏦 ${formatCoins(eco.bank)} · 📈 Total ganado: ${formatCoins(eco.totalEarned)}`,
        inline: false,
      },
    )
    .setFooter({ text: `Cuenta creada` })
    .setTimestamp(target.createdAt);

  await interaction.editReply({ embeds: [embed] });
}
