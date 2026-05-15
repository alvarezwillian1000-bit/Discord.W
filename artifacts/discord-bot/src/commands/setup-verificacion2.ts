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
  .setName("setup-verificacion2")
  .setDescription("Crea un canal de verificación por botón (para todos los usuarios del servidor)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((opt) =>
    opt
      .setName("canal")
      .setDescription("Canal donde se enviará el botón de verificación")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .addRoleOption((opt) =>
    opt
      .setName("rol_verificado")
      .setDescription("Rol que se asignará al verificarse")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("canal", true);
  const role = interaction.options.getRole("rol_verificado", true);

  await setGuildConfig(interaction.guildId!, {
    verifiedRoleId2: role.id,
    verificationChannelId: channel.id,
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🔰 Sistema de Verificación")
    .setDescription(
      "Bienvenido/a al servidor.\n\n" +
      "Para acceder a los comandos y funciones del servidor, **verifícate con el botón de abajo**.\n\n" +
      "Al verificarte obtendrás acceso a:\n" +
      "💰 Economía (`/daily`, `/trabajar`, `/balance`, etc.)\n" +
      "🎮 Diversión (`/dado`, `/coinflip`, `/ruleta`, etc.)\n" +
      "📊 Progreso (`/rank`, `/perfil`)\n\n" +
      "*Solo toma unos segundos.*"
    )
    .setThumbnail(interaction.guild!.iconURL())
    .setFooter({ text: "Haz clic en el botón para verificarte ↓" })
    .setTimestamp();

  const verifyBtn = new ButtonBuilder()
    .setCustomId("verify2")
    .setLabel("🔰 Verificarme")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(verifyBtn);

  const targetChannel = interaction.guild!.channels.cache.get(channel.id);
  if (targetChannel?.isTextBased()) {
    await (targetChannel as any).send({ embeds: [embed], components: [row] });
  }

  const replyEmbed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Sistema de verificación configurado")
    .setDescription(
      `Se envió el panel de verificación en ${channel}.\n` +
      `Los usuarios que se verifiquen recibirán el rol **${role.name}**.`
    )
    .addFields(
      { name: "📢 Canal", value: `<#${channel.id}>`, inline: true },
      { name: "🎯 Rol", value: `<@&${role.id}>`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
}
