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
  .setName("setup-sugerencias")
  .setDescription("Configura el canal donde se enviarán las sugerencias de los usuarios")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((o) =>
    o.setName("canal").setDescription("Canal de sugerencias").addChannelTypes(ChannelType.GuildText).setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "general"))) {
    await interaction.reply({ content: "❌ No tienes permisos para configurar esto.", ephemeral: true });
    return;
  }

  const canal = interaction.options.getChannel("canal", true);
  await setGuildConfig(interaction.guildId!, { sugerenciasChannelId: canal.id });

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("💡 Canal de Sugerencias Configurado")
    .setDescription(
      `Las sugerencias enviadas con \`/sugerir\` aparecerán en ${canal}.\n\n` +
        `Los miembros podrán votar con ✅ o ❌ directamente en el mensaje.`
    )
    .addFields({ name: "📢 Canal", value: `<#${canal.id}>`, inline: true })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
