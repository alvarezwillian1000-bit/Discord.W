import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import { setGuildConfig } from "../utils/config.js";

export const data = new SlashCommandBuilder()
  .setName("setup-tickets")
  .setDescription("Configura el sistema de tickets en un canal")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((opt) =>
    opt
      .setName("canal")
      .setDescription("Canal donde estará el panel para abrir tickets")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .addChannelOption((opt) =>
    opt
      .setName("categoria")
      .setDescription("Categoría donde se crearán los canales de ticket (opcional)")
      .addChannelTypes(ChannelType.GuildCategory)
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("canal", true);
  const category = interaction.options.getChannel("categoria", false);

  await setGuildConfig(interaction.guildId!, {
    ticketsChannelId: channel.id,
    ticketCategoryId: category?.id ?? undefined,
  });

  const panelEmbed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📩 Sistema de Tickets")
    .setDescription(
      "¿Necesitas ayuda del staff?\n\n" +
        "Haz clic en el botón de abajo para abrir un ticket.\n" +
        "Se te pedirá tu **nombre de usuario de Roblox** y el motivo de tu consulta.\n\n" +
        "El staff te atenderá lo antes posible. 🙌"
    )
    .setFooter({ text: "Solo abre un ticket si realmente lo necesitas" })
    .setTimestamp();

  const openButton = new ButtonBuilder()
    .setCustomId("open_ticket")
    .setLabel("📩 Abrir Ticket")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(openButton);

  const targetChannel = interaction.guild!.channels.cache.get(channel.id);
  if (targetChannel?.isTextBased()) {
    await targetChannel.send({ embeds: [panelEmbed], components: [row] });
  }

  const confirmEmbed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Sistema de tickets configurado")
    .addFields(
      { name: "📢 Canal de tickets", value: `<#${channel.id}>`, inline: true },
      { name: "📁 Categoría", value: category ? `<#${category.id}>` : "Sin categoría", inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
}
