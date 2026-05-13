import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { setGuildConfig } from "../utils/config.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("setup-sorteos")
  .setDescription("Configura los roles que pueden crear sorteos con /sorteo")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addRoleOption((o) => o.setName("rol1").setDescription("Rol que puede hacer sorteos 1").setRequired(true))
  .addRoleOption((o) => o.setName("rol2").setDescription("Rol que puede hacer sorteos 2 (opcional)").setRequired(false))
  .addRoleOption((o) => o.setName("rol3").setDescription("Rol que puede hacer sorteos 3 (opcional)").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "general"))) {
    await interaction.reply({ content: "❌ No tienes permisos para configurar esto.", ephemeral: true });
    return;
  }

  const roles = ["rol1", "rol2", "rol3"]
    .map((name) => interaction.options.getRole(name, false))
    .filter(Boolean);

  const roleIds = roles.map((r) => r!.id);
  await setGuildConfig(interaction.guildId!, { sorteoRoles: roleIds });

  const roleList = roles.map((r) => `<@&${r!.id}>`).join("\n");

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle("🎉 Sistema de Sorteos Configurado")
    .setDescription(
      "Los siguientes roles pueden usar `/sorteo` para crear sorteos:\n\n" +
        `${roleList}\n\n` +
        "Usa `/sorteo` para crear un nuevo sorteo con premio, duración y número de ganadores."
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
