import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";
import { db, warningsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  addWarningJson,
  getWarningsJson,
  clearWarningsJson,
} from "../utils/db-json.js";

export const data = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("Gestiona advertencias de usuarios")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand((sub) =>
    sub
      .setName("dar")
      .setDescription("Da una advertencia a un usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
      .addStringOption((o) => o.setName("razon").setDescription("Razón").setRequired(true).setMaxLength(200))
  )
  .addSubcommand((sub) =>
    sub
      .setName("ver")
      .setDescription("Ve las advertencias de un usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("limpiar")
      .setDescription("Limpia todas las advertencias de un usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ No tienes permisos de staff para usar este comando.", ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const targetUser = interaction.options.getUser("usuario", true);
  const guildId = interaction.guildId!;

  if (sub === "dar") {
    const razon = interaction.options.getString("razon", true);

    try {
      await db.insert(warningsTable).values({
        guildId,
        userId: targetUser.id,
        moderatorTag: interaction.user.tag,
        reason: razon,
      });
    } catch {
      await addWarningJson(guildId, targetUser.id, interaction.user.tag, razon);
    }

    const warns = await getWarnings(guildId, targetUser.id);

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("⚠️ Advertencia registrada")
      .addFields(
        { name: "👤 Usuario", value: targetUser.tag, inline: true },
        { name: "🛡️ Moderador", value: interaction.user.tag, inline: true },
        { name: "⚠️ Total de warns", value: String(warns.length), inline: true },
        { name: "📝 Razón", value: razon }
      )
      .setTimestamp();

    await targetUser
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xfee75c)
            .setTitle(`⚠️ Has recibido una advertencia en ${interaction.guild!.name}`)
            .addFields(
              { name: "Razón", value: razon },
              { name: "Total de advertencias", value: String(warns.length) }
            )
            .setTimestamp(),
        ],
      })
      .catch(() => {});

    await interaction.reply({ embeds: [embed] });
  } else if (sub === "ver") {
    const warns = await getWarnings(guildId, targetUser.id);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`⚠️ Advertencias de ${targetUser.tag}`)
      .setDescription(
        warns.length === 0
          ? "Este usuario no tiene advertencias."
          : warns
              .map(
                (w, i) =>
                  `**#${i + 1}** — ${w.reason}\n> Por ${w.moderatorTag} • <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>`
              )
              .join("\n\n")
      )
      .addFields({ name: "Total", value: String(warns.length), inline: true })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (sub === "limpiar") {
    try {
      await db
        .delete(warningsTable)
        .where(and(eq(warningsTable.guildId, guildId), eq(warningsTable.userId, targetUser.id)));
    } catch {
      await clearWarningsJson(guildId, targetUser.id);
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("🧹 Advertencias limpiadas")
          .setDescription(`Se eliminaron todas las advertencias de ${targetUser.tag}.`)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  }
}

async function getWarnings(guildId: string, userId: string) {
  try {
    return await db
      .select()
      .from(warningsTable)
      .where(and(eq(warningsTable.guildId, guildId), eq(warningsTable.userId, userId)));
  } catch {
    return await getWarningsJson(guildId, userId);
  }
}
