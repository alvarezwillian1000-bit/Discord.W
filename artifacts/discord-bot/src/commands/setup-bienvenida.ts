import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import { setGuildConfig } from "../utils/config.js";

export const data = new SlashCommandBuilder()
  .setName("setup-bienvenida")
  .setDescription("Configura el canal de bienvenida y el rol de verificado")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((opt) =>
    opt
      .setName("canal")
      .setDescription("Canal donde se enviarán los mensajes de bienvenida")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .addRoleOption((opt) =>
    opt
      .setName("rol_verificado")
      .setDescription("Rol que se asignará al verificarse con Roblox")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("canal", true);
  const role = interaction.options.getRole("rol_verificado", true);

  await setGuildConfig(interaction.guildId!, {
    welcomeChannelId: channel.id,
    verifiedRoleId: role.id,
  });

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Canal de bienvenida configurado")
    .setDescription(
      `Los nuevos miembros recibirán su bienvenida en ${channel}.\n` +
        `Al verificarse con Roblox, recibirán el rol **${role.name}**.`
    )
    .addFields(
      { name: "📢 Canal", value: `<#${channel.id}>`, inline: true },
      { name: "🎖️ Rol verificado", value: `<@&${role.id}>`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
