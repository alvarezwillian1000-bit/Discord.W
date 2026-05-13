import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { setGuildConfig } from "../utils/config.js";

export const data = new SlashCommandBuilder()
  .setName("setup-general")
  .setDescription("Configura los roles que pueden usar TODOS los comandos de administración del bot")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addRoleOption((o) => o.setName("rol1").setDescription("Rol administrador 1").setRequired(true))
  .addRoleOption((o) => o.setName("rol2").setDescription("Rol administrador 2 (opcional)").setRequired(false))
  .addRoleOption((o) => o.setName("rol3").setDescription("Rol administrador 3 (opcional)").setRequired(false))
  .addRoleOption((o) => o.setName("rol4").setDescription("Rol administrador 4 (opcional)").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  const roles = ["rol1", "rol2", "rol3", "rol4"]
    .map((name) => interaction.options.getRole(name, false))
    .filter(Boolean);

  const roleIds = roles.map((r) => r!.id);
  await setGuildConfig(interaction.guildId!, { generalAdminRoles: roleIds });

  const roleList = roles.map((r) => `<@&${r!.id}>`).join("\n");

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("⚙️ Roles de Administración General")
    .setDescription(
      "Los siguientes roles ahora pueden usar **todos** los comandos de configuración del bot:\n\n" +
        `${roleList}\n\n` +
        "Esto incluye: `/setup-bienvenida`, `/setup-tickets`, `/set-anuncio`, `/setup-sorteos`, `/setup-cmdstaff` y más."
    )
    .setFooter({ text: "Los administradores del servidor siempre tienen acceso completo." })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
