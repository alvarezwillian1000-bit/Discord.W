import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";
import { db } from "@workspace/db";
import { warningsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";

export const data = new SlashCommandBuilder()
  .setName("userinfo")
  .setDescription("Muestra información detallada de un usuario")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption((o) =>
    o.setName("usuario").setDescription("Usuario a consultar (por defecto tú mismo)").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ No tienes permisos de staff para usar este comando.", ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const targetUser = interaction.options.getUser("usuario", false) ?? interaction.user;
  const member = await interaction.guild!.members.fetch(targetUser.id).catch(() => null);

  const [warnResult] = await db
    .select({ total: count() })
    .from(warningsTable)
    .where(
      and(
        eq(warningsTable.guildId, interaction.guildId!),
        eq(warningsTable.userId, targetUser.id)
      )
    );

  const warnCount = warnResult?.total ?? 0;

  const roles = member
    ? [...member.roles.cache.values()]
        .filter((r) => r.id !== interaction.guild!.roles.everyone.id)
        .sort((a, b) => b.position - a.position)
        .slice(0, 8)
        .map((r) => `<@&${r.id}>`)
        .join(" ") || "Ninguno"
    : "No está en el servidor";

  const embed = new EmbedBuilder()
    .setColor(member?.displayHexColor ?? 0x5865f2)
    .setTitle(`👤 ${targetUser.tag}`)
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: "🆔 ID", value: targetUser.id, inline: true },
      { name: "🤖 Bot", value: targetUser.bot ? "Sí" : "No", inline: true },
      {
        name: "📅 Cuenta creada",
        value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
        inline: true,
      }
    );

  if (member) {
    embed.addFields(
      {
        name: "📥 Entró al servidor",
        value: member.joinedAt
          ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>`
          : "Desconocido",
        inline: true,
      },
      { name: "⏱️ En timeout", value: member.isCommunicationDisabled() ? "Sí" : "No", inline: true },
      { name: "⚠️ Advertencias", value: String(warnCount), inline: true },
      { name: "🎭 Roles", value: roles }
    );
  }

  embed.setTimestamp();
  await interaction.editReply({ embeds: [embed] });
}
