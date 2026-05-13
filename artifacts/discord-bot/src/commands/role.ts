import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("role")
  .setDescription("Añade o quita un rol a un miembro")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addSubcommand((s) =>
    s.setName("dar")
      .setDescription("Da un rol a un usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
      .addRoleOption((o) => o.setName("rol").setDescription("Rol a dar").setRequired(true))
  )
  .addSubcommand((s) =>
    s.setName("quitar")
      .setDescription("Quita un rol a un usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
      .addRoleOption((o) => o.setName("rol").setDescription("Rol a quitar").setRequired(true))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ No tienes permisos de staff.", ephemeral: true });
    return;
  }
  const sub = interaction.options.getSubcommand();
  const target = interaction.options.getMember("usuario") as any;
  const role = interaction.options.getRole("rol", true);

  if (!target) {
    await interaction.reply({ content: "❌ Usuario no encontrado.", ephemeral: true });
    return;
  }

  const guildRole = interaction.guild!.roles.cache.get(role.id);
  if (!guildRole || guildRole.managed) {
    await interaction.reply({ content: "❌ No puedo gestionar ese rol.", ephemeral: true });
    return;
  }

  if (sub === "dar") {
    await target.roles.add(guildRole);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("✅ Rol asignado")
          .setDescription(`Se dio el rol <@&${role.id}> a ${target.user.tag}.`)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  } else {
    await target.roles.remove(guildRole);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("❌ Rol removido")
          .setDescription(`Se quitó el rol <@&${role.id}> a ${target.user.tag}.`)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  }
}
