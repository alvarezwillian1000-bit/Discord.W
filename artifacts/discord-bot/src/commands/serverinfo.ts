import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("serverinfo")
  .setDescription("Muestra información del servidor");

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild!;
  await guild.members.fetch();

  const bots = guild.members.cache.filter((m) => m.user.bot).size;
  const humanos = guild.memberCount - bots;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📊 ${guild.name}`)
    .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
    .addFields(
      { name: "👑 Dueño", value: `<@${guild.ownerId}>`, inline: true },
      { name: "📅 Creado", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
      { name: "🆔 ID", value: guild.id, inline: true },
      { name: "👥 Miembros", value: `${guild.memberCount} (${humanos} humanos, ${bots} bots)`, inline: true },
      { name: "💬 Canales", value: String(guild.channels.cache.size), inline: true },
      { name: "🎭 Roles", value: String(guild.roles.cache.size), inline: true },
      { name: "😀 Emojis", value: String(guild.emojis.cache.size), inline: true },
      { name: "🔒 Verificación", value: String(guild.verificationLevel), inline: true },
    )
    .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
