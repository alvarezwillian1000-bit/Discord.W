import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("lock")
  .setDescription("Bloquea un canal (nadie puede escribir)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addChannelOption((o) =>
    o.setName("canal").setDescription("Canal a bloquear (por defecto el actual)").addChannelTypes(ChannelType.GuildText).setRequired(false)
  )
  .addStringOption((o) =>
    o.setName("razon").setDescription("Razón del bloqueo").setRequired(false).setMaxLength(200)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ No tienes permisos de staff.", ephemeral: true });
    return;
  }
  const canalOpt = interaction.options.getChannel("canal", false);
  const razon = interaction.options.getString("razon") ?? "Sin razón especificada";
  const canal = canalOpt
    ? interaction.guild!.channels.cache.get(canalOpt.id)
    : interaction.channel;

  if (!canal || !("permissionOverwrites" in canal)) {
    await interaction.reply({ content: "❌ Canal inválido.", ephemeral: true });
    return;
  }

  await (canal as any).permissionOverwrites.edit(interaction.guild!.roles.everyone, {
    SendMessages: false,
  });

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🔒 Canal bloqueado")
    .setDescription(`<#${canal.id}> ha sido bloqueado. Nadie puede enviar mensajes.`)
    .addFields(
      { name: "🛡️ Moderador", value: interaction.user.tag, inline: true },
      { name: "📝 Razón", value: razon }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
