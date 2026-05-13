import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("avatar")
  .setDescription("Muestra el avatar de un usuario")
  .addUserOption((o) => o.setName("usuario").setDescription("Usuario (por defecto tú)").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("usuario", false) ?? interaction.user;
  const member = await interaction.guild?.members.fetch(target.id).catch(() => null);

  const serverAvatar = member?.displayAvatarURL({ size: 1024 });
  const globalAvatar = target.displayAvatarURL({ size: 1024 });

  const embed = new EmbedBuilder()
    .setColor(member?.displayHexColor ?? 0x5865f2)
    .setTitle(`🖼️ Avatar de ${target.displayName}`)
    .setImage(serverAvatar ?? globalAvatar)
    .setTimestamp();

  if (serverAvatar && serverAvatar !== globalAvatar) {
    embed.setDescription(`[Avatar global](${globalAvatar}) • [Avatar del servidor](${serverAvatar})`);
  } else {
    embed.setDescription(`[Descargar avatar](${globalAvatar})`);
  }

  await interaction.reply({ embeds: [embed] });
}
