import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("verificar")
  .setDescription("Inicia tu verificación con Roblox para obtener acceso al servidor");

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🔰 Verificación con Roblox")
    .setDescription(
      "Para verificarte, haz clic en el botón de abajo.\n\n" +
      "Se te pedirá tu **nombre de usuario de Roblox** y, al confirmarlo, recibirás el rol de **Verificado** automáticamente."
    )
    .setTimestamp();

  const verifyButton = new ButtonBuilder()
    .setCustomId(`verify_${interaction.user.id}`)
    .setLabel("🔰 Verificarme con Roblox")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(verifyButton);

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}
