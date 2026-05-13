import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("testbienvenida")
  .setDescription("Prueba el mensaje de bienvenida en este canal")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ No tienes permisos de staff para usar este comando.", ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`✨ ¡Bienvenido/a al servidor, ${interaction.user.displayName}!`)
    .setDescription(
      `> Hola ${interaction.user}, nos alegra tenerte aquí.\n\n` +
        `**Para acceder al servidor necesitas verificarte con Roblox.**\n\n` +
        `Haz clic en el botón de abajo para iniciar la verificación.\n` +
        `Se te pedirá tu nombre de usuario de Roblox y luego recibirás el rol **Verificado** automáticamente. 🎉`
    )
    .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `${interaction.guild!.name} • Verificación requerida • Esto es una prueba` })
    .setTimestamp();

  const verifyButton = new ButtonBuilder()
    .setCustomId(`verify_${interaction.user.id}`)
    .setLabel("🔰 Verificarme con Roblox")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(verifyButton);

  await interaction.reply({
    content: `${interaction.user} *(prueba de bienvenida)*`,
    embeds: [embed],
    components: [row],
  });
}
