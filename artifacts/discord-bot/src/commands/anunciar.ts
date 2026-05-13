import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("anunciar")
  .setDescription("Publica un anuncio en el canal seleccionado")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addStringOption((o) =>
    o.setName("titulo").setDescription("Título del anuncio").setRequired(true).setMaxLength(100)
  )
  .addStringOption((o) =>
    o.setName("mensaje").setDescription("Contenido del anuncio").setRequired(true).setMaxLength(1900)
  )
  .addChannelOption((o) =>
    o.setName("canal").setDescription("Canal donde publicar").addChannelTypes(ChannelType.GuildText).setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("mencionar").setDescription("Mencionar @everyone, @here o un rol (opcional)").setRequired(false)
  )
  .addStringOption((o) =>
    o.setName("color").setDescription("Color del embed en hex (ej: #ff5500)").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "anuncio"))) {
    await interaction.reply({
      content: "❌ No tienes el rol necesario para enviar anuncios. Pide a un admin que use `/set-anuncio`.",
      ephemeral: true,
    });
    return;
  }

  const titulo = interaction.options.getString("titulo", true);
  const mensaje = interaction.options.getString("mensaje", true);
  const canal = interaction.options.getChannel("canal", true);
  const mencionar = interaction.options.getString("mencionar", false);
  const colorHex = interaction.options.getString("color", false);

  let color = 0x5865f2;
  if (colorHex) {
    const parsed = parseInt(colorHex.replace("#", ""), 16);
    if (!isNaN(parsed)) color = parsed;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`📢 ${titulo}`)
    .setDescription(mensaje)
    .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
    .setFooter({ text: interaction.guild!.name })
    .setTimestamp();

  const targetChannel = interaction.guild!.channels.cache.get(canal.id);
  if (!targetChannel?.isTextBased()) {
    await interaction.reply({ content: "❌ No puedo escribir en ese canal.", ephemeral: true });
    return;
  }

  await targetChannel.send({ content: mencionar ?? undefined, embeds: [embed] });
  await interaction.reply({ content: `✅ Anuncio publicado en ${targetChannel}.`, ephemeral: true });
}
