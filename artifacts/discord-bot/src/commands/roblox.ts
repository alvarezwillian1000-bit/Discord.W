import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getRobloxUser } from "../utils/roblox.js";

export const data = new SlashCommandBuilder()
  .setName("roblox")
  .setDescription("Busca información de un usuario de Roblox")
  .addStringOption((opt) =>
    opt
      .setName("usuario")
      .setDescription("Nombre de usuario de Roblox")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const username = interaction.options.getString("usuario", true).trim();
  const roblox = await getRobloxUser(username);

  if (!roblox) {
    await interaction.editReply({
      content: `❌ No encontré ningún usuario de Roblox llamado **${username}**.`,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🎮 ${roblox.displayName} en Roblox`)
    .setURL(roblox.profileUrl)
    .setThumbnail(roblox.avatarUrl ?? null)
    .addFields(
      { name: "👤 Username", value: roblox.name, inline: true },
      { name: "🆔 ID", value: String(roblox.id), inline: true },
      { name: "🔗 Perfil", value: `[Ver en Roblox](${roblox.profileUrl})`, inline: true }
    )
    .setFooter({ text: "Datos obtenidos de Roblox" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
