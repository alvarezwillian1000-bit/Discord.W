import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("nick")
  .setDescription("Cambia el apodo de un miembro en el servidor")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
  .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
  .addStringOption((o) =>
    o.setName("apodo").setDescription("Nuevo apodo (vacío para resetear)").setRequired(false).setMaxLength(32)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ No tienes permisos de staff.", ephemeral: true });
    return;
  }
  const target = interaction.options.getMember("usuario") as any;
  const apodo = interaction.options.getString("apodo", false) ?? null;

  if (!target) {
    await interaction.reply({ content: "❌ No encontré a ese usuario.", ephemeral: true });
    return;
  }
  if (!target.manageable) {
    await interaction.reply({ content: "❌ No puedo modificar a ese usuario.", ephemeral: true });
    return;
  }

  const anterior = target.nickname ?? target.user.username;
  await target.setNickname(apodo, `Cambio de apodo por ${interaction.user.tag}`);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("✏️ Apodo actualizado")
    .addFields(
      { name: "👤 Usuario", value: target.user.tag, inline: true },
      { name: "📛 Anterior", value: anterior, inline: true },
      { name: "🆕 Nuevo", value: apodo ?? "(reseteado)", inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
