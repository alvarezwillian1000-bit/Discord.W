import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("unlock")
  .setDescription("Desbloquea un canal para que todos puedan escribir")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addChannelOption((o) =>
    o.setName("canal").setDescription("Canal a desbloquear (por defecto el actual)").addChannelTypes(ChannelType.GuildText).setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ No tienes permisos de staff.", ephemeral: true });
    return;
  }
  const canalOpt = interaction.options.getChannel("canal", false);
  const canal = canalOpt
    ? interaction.guild!.channels.cache.get(canalOpt.id)
    : interaction.channel;

  if (!canal || !("permissionOverwrites" in canal)) {
    await interaction.reply({ content: "❌ Canal inválido.", ephemeral: true });
    return;
  }

  await (canal as any).permissionOverwrites.edit(interaction.guild!.roles.everyone, {
    SendMessages: null,
  });

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("🔓 Canal desbloqueado")
    .setDescription(`<#${canal.id}> ha sido desbloqueado. ¡Todos pueden volver a escribir!`)
    .addFields({ name: "🛡️ Moderador", value: interaction.user.tag, inline: true })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
