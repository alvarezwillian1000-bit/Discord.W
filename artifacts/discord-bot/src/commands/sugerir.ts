import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getGuildConfig } from "../utils/config.js";
import { db } from "@workspace/db";
import { suggestionsTable } from "@workspace/db";

export const data = new SlashCommandBuilder()
  .setName("sugerir")
  .setDescription("Envía una sugerencia al equipo del servidor")
  .addStringOption((o) =>
    o.setName("sugerencia").setDescription("¿Qué quieres sugerir?").setRequired(true).setMaxLength(1000)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const config = await getGuildConfig(interaction.guildId!);

  if (!config.sugerenciasChannelId) {
    await interaction.reply({
      content: "❌ El sistema de sugerencias no está configurado. Pide a un admin que use `/setup-sugerencias`.",
      ephemeral: true,
    });
    return;
  }

  const canal = interaction.guild!.channels.cache.get(config.sugerenciasChannelId);
  if (!canal?.isTextBased()) {
    await interaction.reply({ content: "❌ El canal de sugerencias ya no existe.", ephemeral: true });
    return;
  }

  const texto = interaction.options.getString("sugerencia", true);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("💡 Nueva Sugerencia")
    .setDescription(texto)
    .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
    .addFields({ name: "Estado", value: "🔄 Pendiente de revisión" })
    .setFooter({ text: `ID: ${interaction.user.id}` })
    .setTimestamp();

  const msg = await (canal as any).send({ embeds: [embed] });
  await msg.react("✅");
  await msg.react("❌");

  await db.insert(suggestionsTable).values({
    guildId: interaction.guildId!,
    messageId: msg.id,
    channelId: canal.id,
    discordUserId: interaction.user.id,
    discordUserTag: interaction.user.tag,
    content: texto,
  });

  await interaction.reply({ content: `✅ Tu sugerencia fue enviada a ${canal}. ¡Gracias!`, ephemeral: true });
}
