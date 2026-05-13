import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";
import { clearHistory } from "../utils/ai.js";
import { getGuildConfig } from "../utils/config.js";

export const data = new SlashCommandBuilder()
  .setName("ia-reset")
  .setDescription("Reinicia la memoria de la IA (borra el historial de conversación)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ No tienes permisos de staff.", ephemeral: true });
    return;
  }

  const config = await getGuildConfig(interaction.guildId!);
  if (!config.iaChannelId) {
    await interaction.reply({ content: "❌ No hay canal de IA configurado. Usa `/setup-ia` primero.", ephemeral: true });
    return;
  }

  clearHistory(config.iaChannelId);

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("🧠 Memoria de IA reiniciada")
    .setDescription(`La IA ha olvidado el historial de conversación en <#${config.iaChannelId}>.\nEmpezará con una hoja en blanco en el próximo mensaje.`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
