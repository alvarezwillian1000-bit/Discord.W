import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("embed")
  .setDescription("Envía un embed personalizado a un canal")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addStringOption((o) => o.setName("titulo").setDescription("Título del embed").setRequired(true).setMaxLength(100))
  .addStringOption((o) => o.setName("descripcion").setDescription("Descripción del embed").setRequired(true).setMaxLength(2000))
  .addChannelOption((o) => o.setName("canal").setDescription("Canal de destino").addChannelTypes(ChannelType.GuildText).setRequired(false))
  .addStringOption((o) => o.setName("color").setDescription("Color hex (ej: #ff5500)").setRequired(false))
  .addStringOption((o) => o.setName("imagen").setDescription("URL de imagen").setRequired(false))
  .addStringOption((o) => o.setName("pie").setDescription("Texto del pie del embed").setRequired(false).setMaxLength(100));

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ No tienes permisos de staff.", ephemeral: true });
    return;
  }

  const titulo = interaction.options.getString("titulo", true);
  const descripcion = interaction.options.getString("descripcion", true);
  const canalOpt = interaction.options.getChannel("canal", false);
  const colorHex = interaction.options.getString("color", false);
  const imagen = interaction.options.getString("imagen", false);
  const pie = interaction.options.getString("pie", false);

  let color = 0x5865f2;
  if (colorHex) {
    const parsed = parseInt(colorHex.replace("#", ""), 16);
    if (!isNaN(parsed)) color = parsed;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(titulo)
    .setDescription(descripcion);

  if (imagen) embed.setImage(imagen);
  if (pie) embed.setFooter({ text: pie });
  embed.setTimestamp();

  const targetChannel = canalOpt
    ? interaction.guild!.channels.cache.get(canalOpt.id)
    : interaction.channel;

  if (!targetChannel?.isTextBased()) {
    await interaction.reply({ content: "❌ Canal inválido.", ephemeral: true });
    return;
  }

  await targetChannel.send({ embeds: [embed] });
  await interaction.reply({ content: `✅ Embed enviado a ${targetChannel}.`, ephemeral: true });
}
