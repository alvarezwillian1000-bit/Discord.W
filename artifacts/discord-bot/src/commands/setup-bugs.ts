import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import { setGuildConfig } from "../utils/config.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("setup-bugs")
  .setDescription("Configura el canal donde se reportarán los bugs")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((o) =>
    o.setName("canal").setDescription("Canal de reporte de bugs").addChannelTypes(ChannelType.GuildText).setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "general"))) {
    await interaction.reply({ content: "❌ No tienes permisos para configurar esto.", ephemeral: true });
    return;
  }

  const canal = interaction.options.getChannel("canal", true);
  await setGuildConfig(interaction.guildId!, { bugsChannelId: canal.id });

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🐛 Canal de Bugs Configurado")
    .setDescription(
      `Los reportes enviados con \`/bug\` aparecerán en ${canal}.\n\n` +
        `El staff podrá marcar el estado del reporte directamente.`
    )
    .addFields({ name: "📢 Canal", value: `<#${canal.id}>`, inline: true })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
