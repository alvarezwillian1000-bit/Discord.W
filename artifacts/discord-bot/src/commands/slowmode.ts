import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("slowmode")
  .setDescription("Activa o desactiva el modo lento en un canal")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addIntegerOption((o) =>
    o.setName("segundos").setDescription("Segundos entre mensajes (0 = desactivar, máx 21600)").setRequired(true).setMinValue(0).setMaxValue(21600)
  )
  .addChannelOption((o) =>
    o.setName("canal").setDescription("Canal (por defecto el actual)").addChannelTypes(ChannelType.GuildText).setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ No tienes permisos de staff.", ephemeral: true });
    return;
  }
  const segundos = interaction.options.getInteger("segundos", true);
  const canalOpt = interaction.options.getChannel("canal", false);
  const canal = canalOpt
    ? interaction.guild!.channels.cache.get(canalOpt.id)
    : interaction.channel;

  if (!canal || !("setRateLimitPerUser" in canal)) {
    await interaction.reply({ content: "❌ Canal inválido.", ephemeral: true });
    return;
  }

  await (canal as any).setRateLimitPerUser(segundos, `Slowmode aplicado por ${interaction.user.tag}`);

  const embed = new EmbedBuilder()
    .setColor(segundos === 0 ? 0x57f287 : 0xfee75c)
    .setTitle(segundos === 0 ? "✅ Modo lento desactivado" : `🐢 Modo lento: ${segundos}s`)
    .setDescription(
      segundos === 0
        ? `El modo lento fue desactivado en <#${canal.id}>.`
        : `Los usuarios deberán esperar **${segundos} segundos** entre mensajes en <#${canal.id}>.`
    )
    .addFields({ name: "🛡️ Moderador", value: interaction.user.tag, inline: true })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
