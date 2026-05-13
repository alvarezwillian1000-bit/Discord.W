import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { setGuildConfig } from "../utils/config.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("set-anuncio")
  .setDescription("Configura los roles que pueden enviar anuncios con /anunciar")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addRoleOption((o) => o.setName("rol1").setDescription("Rol que puede anunciar 1").setRequired(true))
  .addRoleOption((o) => o.setName("rol2").setDescription("Rol que puede anunciar 2 (opcional)").setRequired(false))
  .addRoleOption((o) => o.setName("rol3").setDescription("Rol que puede anunciar 3 (opcional)").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "general"))) {
    await interaction.reply({ content: "❌ No tienes permisos para configurar esto.", ephemeral: true });
    return;
  }

  const roles = ["rol1", "rol2", "rol3"]
    .map((name) => interaction.options.getRole(name, false))
    .filter(Boolean);

  const roleIds = roles.map((r) => r!.id);
  await setGuildConfig(interaction.guildId!, { announcementRoles: roleIds });

  const roleList = roles.map((r) => `<@&${r!.id}>`).join("\n");

  const embed = new EmbedBuilder()
    .setColor(0xeb459e)
    .setTitle("📢 Sistema de Anuncios Configurado")
    .setDescription(
      "Los siguientes roles pueden usar `/anunciar` para publicar anuncios:\n\n" + `${roleList}`
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
