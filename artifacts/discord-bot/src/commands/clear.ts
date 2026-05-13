import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("clear")
  .setDescription("Elimina mensajes del canal actual")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addIntegerOption((o) =>
    o.setName("cantidad").setDescription("Número de mensajes a eliminar (1-100)").setRequired(true).setMinValue(1).setMaxValue(100)
  )
  .addUserOption((o) =>
    o.setName("usuario").setDescription("Solo eliminar mensajes de este usuario (opcional)").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ No tienes permisos de staff para usar este comando.", ephemeral: true });
    return;
  }

  const cantidad = interaction.options.getInteger("cantidad", true);
  const filtroUser = interaction.options.getUser("usuario", false);
  if (!interaction.channel?.isTextBased()) return;

  await interaction.deferReply({ ephemeral: true });

  const messages = await (interaction.channel as any).messages.fetch({ limit: 100 });
  let toDelete = [...messages.values()].slice(0, cantidad);

  if (filtroUser) toDelete = toDelete.filter((m: any) => m.author.id === filtroUser.id).slice(0, cantidad);

  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  toDelete = toDelete.filter((m: any) => m.createdTimestamp > twoWeeksAgo);

  if (toDelete.length === 0) {
    await interaction.editReply({ content: "❌ No hay mensajes para eliminar (deben tener menos de 14 días)." });
    return;
  }

  await (interaction.channel as any).bulkDelete(toDelete, true);

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("🧹 Mensajes eliminados")
    .addFields(
      { name: "🗑️ Eliminados", value: String(toDelete.length), inline: true },
      { name: "🛡️ Moderador", value: interaction.user.tag, inline: true },
      filtroUser
        ? { name: "👤 Filtrado por", value: filtroUser.tag, inline: true }
        : { name: "\u200b", value: "\u200b", inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
