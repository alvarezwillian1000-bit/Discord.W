import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getUserLevel, getXPProgress, buildProgressBar, getLevelColor, getLevelTier, getRank } from "../utils/levels.js";

export const data = new SlashCommandBuilder()
  .setName("rank")
  .setDescription("Muestra tu nivel y XP en el servidor")
  .addUserOption((o) => o.setName("usuario").setDescription("Usuario (por defecto tú)").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("usuario", false) ?? interaction.user;
  const member = await interaction.guild!.members.fetch(target.id).catch(() => null);

  if (!member) {
    await interaction.reply({ content: "❌ No encontré a ese usuario.", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const row = await getUserLevel(interaction.guildId!, target.id);

  if (!row || row.xp === 0) {
    await interaction.editReply({
      content: target.id === interaction.user.id
        ? "❌ Aún no tienes XP. ¡Empieza a chatear para ganar experiencia!"
        : `❌ **${member.displayName}** aún no tiene XP acumulado.`,
    });
    return;
  }

  const { level, currentXP, neededXP, percent } = getXPProgress(row.xp);
  const rank = await getRank(interaction.guildId!, target.id);
  const bar = buildProgressBar(percent);
  const tier = getLevelTier(level);
  const color = getLevelColor(level);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
    .setTitle(`🏆 Nivel ${level} — ${tier}`)
    .setDescription(`\`${bar}\` **${percent}%**`)
    .addFields(
      { name: "✨ XP Total", value: `${row.xp.toLocaleString()} XP`, inline: true },
      { name: "📈 Progreso", value: `${currentXP} / ${neededXP} XP`, inline: true },
      { name: "🏅 Posición", value: `#${rank} en el servidor`, inline: true },
      { name: "💬 Mensajes", value: row.totalMessages.toLocaleString(), inline: true },
    )
    .setFooter({ text: `Nivel ${level} → ${level + 1} necesita ${neededXP - currentXP} XP más` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
