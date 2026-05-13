import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { setGuildConfig } from "../utils/config.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("setup-cmdstaff")
  .setDescription("Configura los roles que pueden usar los comandos de staff")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addRoleOption((o) => o.setName("rol1").setDescription("Rol de staff 1").setRequired(true))
  .addRoleOption((o) => o.setName("rol2").setDescription("Rol de staff 2 (opcional)").setRequired(false))
  .addRoleOption((o) => o.setName("rol3").setDescription("Rol de staff 3 (opcional)").setRequired(false))
  .addRoleOption((o) => o.setName("rol4").setDescription("Rol de staff 4 (opcional)").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  if (
    !(await hasPermission(interaction.member as any, "general")) &&
    !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
  ) {
    await interaction.reply({
      content: "❌ Solo los administradores o roles del `setup-general` pueden usar este comando.",
      ephemeral: true,
    });
    return;
  }

  const roles = ["rol1", "rol2", "rol3", "rol4"]
    .map((name) => interaction.options.getRole(name, false))
    .filter(Boolean);

  const roleIds = roles.map((r) => r!.id);
  await setGuildConfig(interaction.guildId!, { staffCmdRoles: roleIds });

  const roleList = roles.map((r) => `<@&${r!.id}>`).join("\n");

  const embed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("🛡️ Roles de Staff — Comandos Importantes")
    .setDescription(
      "Los siguientes roles ahora tienen acceso a los **comandos de staff**:\n\n" +
        `${roleList}\n\n` +
        "Comandos disponibles para staff:\n" +
        "`/anunciar` • `/sorteo` • `/kick` • `/ban` • `/timeout` • `/warn` • `/clear` • `/userinfo`\n\n" +
        "💡 Los roles del `setup-general` **siempre** tienen acceso a todo."
    )
    .setFooter({ text: "Configuración sincronizada con setup-general" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
