import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getGuildConfig } from "../utils/config.js";
import { db, bugReportsTable } from "@workspace/db";
import { addBugReportJson } from "../utils/db-json.js";

export const data = new SlashCommandBuilder()
  .setName("bug")
  .setDescription("Reporta un bug o error al equipo del servidor")
  .addStringOption((o) =>
    o.setName("descripcion").setDescription("¿Qué bug encontraste?").setRequired(true).setMaxLength(800)
  )
  .addStringOption((o) =>
    o.setName("pasos").setDescription("Pasos para reproducirlo (opcional)").setRequired(false).setMaxLength(500)
  )
  .addStringOption((o) =>
    o.setName("dispositivo").setDescription("PC, móvil, consola... (opcional)").setRequired(false).setMaxLength(50)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const config = await getGuildConfig(interaction.guildId!);

  if (!config.bugsChannelId) {
    await interaction.reply({
      content: "❌ El sistema de reportes no está configurado. Pide a un admin que use `/setup-bugs`.",
      ephemeral: true,
    });
    return;
  }

  const canal = interaction.guild!.channels.cache.get(config.bugsChannelId);
  if (!canal?.isTextBased()) {
    await interaction.reply({ content: "❌ El canal de bugs ya no existe.", ephemeral: true });
    return;
  }

  const descripcion = interaction.options.getString("descripcion", true);
  const pasos = interaction.options.getString("pasos", false);
  const dispositivo = interaction.options.getString("dispositivo", false);

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🐛 Reporte de Bug")
    .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
    .addFields({ name: "📋 Descripción", value: descripcion });

  if (pasos) embed.addFields({ name: "🔁 Pasos para reproducir", value: pasos });
  if (dispositivo) embed.addFields({ name: "💻 Dispositivo", value: dispositivo, inline: true });

  embed
    .addFields({ name: "📌 Estado", value: "🔴 Sin revisar" })
    .setFooter({ text: `Reportado por ${interaction.user.tag} • ID: ${interaction.user.id}` })
    .setTimestamp();

  const msg = await (canal as any).send({ embeds: [embed] });
  await msg.react("🔴");
  await msg.react("🟡");
  await msg.react("🟢");

  try {
    await db.insert(bugReportsTable).values({
      guildId: interaction.guildId!,
      messageId: msg.id,
      channelId: canal.id,
      discordUserId: interaction.user.id,
      discordUserTag: interaction.user.tag,
      description: descripcion,
      steps: pasos ?? undefined,
      device: dispositivo ?? undefined,
    });
  } catch {
    await addBugReportJson({
      guildId: interaction.guildId!,
      messageId: msg.id,
      channelId: canal.id,
      discordUserId: interaction.user.id,
      discordUserTag: interaction.user.tag,
      description: descripcion,
      steps: pasos ?? undefined,
      device: dispositivo ?? undefined,
    });
  }

  await interaction.reply({
    content: `✅ Tu reporte fue enviado a ${canal}. ¡Gracias por ayudar a mejorar el servidor!`,
    ephemeral: true,
  });
}
