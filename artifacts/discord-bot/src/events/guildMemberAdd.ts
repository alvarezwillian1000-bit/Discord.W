import {
  Events,
  type GuildMember,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  Colors,
} from "discord.js";
import { getGuildConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

export const name = Events.GuildMemberAdd;
export const once = false;

export async function execute(member: GuildMember) {
  const config = await getGuildConfig(member.guild.id);

  if (!config.welcomeChannelId) {
    logger.warn(`Guild ${member.guild.id} no tiene canal de bienvenida configurado. Usa /setup-bienvenida`);
    return;
  }

  const channel = member.guild.channels.cache.get(config.welcomeChannelId);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`✨ ¡Bienvenido/a al servidor, ${member.displayName}!`)
    .setDescription(
      `> Hola ${member}, nos alegra tenerte aquí.\n\n` +
      `**Para acceder al servidor necesitas verificarte con Roblox.**\n\n` +
      `Haz clic en el botón de abajo para iniciar la verificación.\n` +
      `Se te pedirá tu nombre de usuario de Roblox y luego recibirás el rol **Verificado** automáticamente. 🎉`
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `${member.guild.name} • Verificación requerida` })
    .setTimestamp();

  const verifyButton = new ButtonBuilder()
    .setCustomId(`verify_${member.id}`)
    .setLabel("🔰 Verificarme con Roblox")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(verifyButton);

  await channel.send({
    content: `${member}`,
    embeds: [embed],
    components: [row],
  });
}
