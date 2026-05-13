import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";
import { parseDuration, formatTimeLeft } from "../utils/giveaways.js";

export const data = new SlashCommandBuilder()
  .setName("timeout")
  .setDescription("Silencia temporalmente a un miembro")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption((o) => o.setName("usuario").setDescription("Usuario a silenciar").setRequired(true))
  .addStringOption((o) =>
    o.setName("duracion").setDescription("Duración: 10m, 1h, 1d (máx 28d)").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("razon").setDescription("Razón del timeout").setRequired(false).setMaxLength(200)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ No tienes permisos de staff para usar este comando.", ephemeral: true });
    return;
  }

  const target = interaction.options.getMember("usuario") as any;
  const duracionStr = interaction.options.getString("duracion", true);
  const razon = interaction.options.getString("razon") ?? "Sin razón especificada";

  if (!target) {
    await interaction.reply({ content: "❌ No encontré a ese usuario.", ephemeral: true });
    return;
  }

  const durationMs = parseDuration(duracionStr);
  if (!durationMs) {
    await interaction.reply({ content: "❌ Duración inválida. Usa `10m`, `1h`, `2d`, etc.", ephemeral: true });
    return;
  }

  const MAX_TIMEOUT = 28 * 24 * 60 * 60 * 1000;
  if (durationMs > MAX_TIMEOUT) {
    await interaction.reply({ content: "❌ El timeout máximo es de 28 días.", ephemeral: true });
    return;
  }

  if (!target.moderatable) {
    await interaction.reply({ content: "❌ No puedo silenciar a ese usuario.", ephemeral: true });
    return;
  }

  await target.timeout(durationMs, razon);

  const embed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("⏱️ Usuario silenciado")
    .addFields(
      { name: "👤 Usuario", value: `${target.user.tag}`, inline: true },
      { name: "🛡️ Moderador", value: interaction.user.tag, inline: true },
      { name: "⏰ Duración", value: formatTimeLeft(durationMs), inline: true },
      { name: "📝 Razón", value: razon }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
