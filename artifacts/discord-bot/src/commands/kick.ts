import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("kick")
  .setDescription("Expulsa a un miembro del servidor")
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
  .addUserOption((o) => o.setName("usuario").setDescription("Usuario a expulsar").setRequired(true))
  .addStringOption((o) =>
    o.setName("razon").setDescription("Razón de la expulsión").setRequired(false).setMaxLength(200)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ No tienes permisos de staff para usar este comando.", ephemeral: true });
    return;
  }

  const target = interaction.options.getMember("usuario") as any;
  const razon = interaction.options.getString("razon") ?? "Sin razón especificada";

  if (!target) {
    await interaction.reply({ content: "❌ No encontré a ese usuario en el servidor.", ephemeral: true });
    return;
  }
  if (!target.kickable) {
    await interaction.reply({ content: "❌ No puedo expulsar a ese usuario.", ephemeral: true });
    return;
  }
  if (target.id === interaction.user.id) {
    await interaction.reply({ content: "❌ No puedes expulsarte a ti mismo.", ephemeral: true });
    return;
  }

  await target.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(`⚠️ Has sido expulsado de ${interaction.guild!.name}`)
        .addFields({ name: "Razón", value: razon })
        .setTimestamp(),
    ],
  }).catch(() => {});

  await target.kick(razon);

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("👢 Usuario expulsado")
    .addFields(
      { name: "👤 Usuario", value: `${target.user.tag} (${target.id})`, inline: true },
      { name: "🛡️ Moderador", value: interaction.user.tag, inline: true },
      { name: "📝 Razón", value: razon }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
