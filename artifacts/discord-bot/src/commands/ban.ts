import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("Banea a un usuario del servidor")
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .addUserOption((o) => o.setName("usuario").setDescription("Usuario a banear").setRequired(true))
  .addStringOption((o) =>
    o.setName("razon").setDescription("Razón del ban").setRequired(false).setMaxLength(200)
  )
  .addIntegerOption((o) =>
    o.setName("dias").setDescription("Días de mensajes a eliminar (0-7)").setRequired(false).setMinValue(0).setMaxValue(7)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ No tienes permisos de staff para usar este comando.", ephemeral: true });
    return;
  }

  const target = interaction.options.getMember("usuario") as any;
  const user = interaction.options.getUser("usuario", true);
  const razon = interaction.options.getString("razon") ?? "Sin razón especificada";
  const dias = interaction.options.getInteger("dias") ?? 0;

  if (target && !target.bannable) {
    await interaction.reply({ content: "❌ No puedo banear a ese usuario.", ephemeral: true });
    return;
  }
  if (user.id === interaction.user.id) {
    await interaction.reply({ content: "❌ No puedes banearte a ti mismo.", ephemeral: true });
    return;
  }

  if (target) {
    await target.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(`🔨 Has sido baneado de ${interaction.guild!.name}`)
          .addFields({ name: "Razón", value: razon })
          .setTimestamp(),
      ],
    }).catch(() => {});
  }

  await interaction.guild!.members.ban(user.id, { reason: razon, deleteMessageDays: dias });

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🔨 Usuario baneado")
    .addFields(
      { name: "👤 Usuario", value: `${user.tag} (${user.id})`, inline: true },
      { name: "🛡️ Moderador", value: interaction.user.tag, inline: true },
      { name: "📝 Razón", value: razon },
      { name: "🗑️ Mensajes eliminados", value: `${dias} día(s)`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
