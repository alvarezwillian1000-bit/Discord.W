import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("unban")
  .setDescription("Desbanea a un usuario por su ID")
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .addStringOption((o) =>
    o.setName("id").setDescription("ID del usuario a desbanear").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("razon").setDescription("Razón del desbaneo").setRequired(false).setMaxLength(200)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ No tienes permisos de staff.", ephemeral: true });
    return;
  }
  const userId = interaction.options.getString("id", true).trim();
  const razon = interaction.options.getString("razon") ?? "Sin razón especificada";

  try {
    const ban = await interaction.guild!.bans.fetch(userId);
    await interaction.guild!.members.unban(userId, razon);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("✅ Usuario desbaneado")
      .addFields(
        { name: "👤 Usuario", value: `${ban.user.tag} (${userId})`, inline: true },
        { name: "🛡️ Moderador", value: interaction.user.tag, inline: true },
        { name: "📝 Razón", value: razon }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch {
    await interaction.reply({ content: "❌ No encontré ese usuario en la lista de bans.", ephemeral: true });
  }
}
