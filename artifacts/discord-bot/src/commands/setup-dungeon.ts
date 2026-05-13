import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import { setGuildConfig } from "../utils/config.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("setup-dungeon")
  .setDescription("Configura el sistema de mazmorras del servidor")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((o) =>
    o
      .setName("canal")
      .setDescription("Canal donde se anuncian logros épicos de mazmorra")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "general"))) {
    await interaction.reply({ content: "❌ No tienes permisos para configurar esto.", ephemeral: true });
    return;
  }

  const canal = interaction.options.getChannel("canal", false);

  await setGuildConfig(interaction.guildId!, {
    dungeonChannelId: canal?.id ?? null,
  });

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle("🏰 Sistema de Mazmorras Configurado")
    .setDescription(
      "Los miembros ya pueden explorar mazmorras con `/dungeon`.\n\n" +
      "Cada expedición es única — hay 5 salas diferentes con decisiones que afectan las recompensas."
    )
    .addFields(
      {
        name: "📢 Canal de logros",
        value: canal ? `<#${canal.id}>` : "No configurado",
        inline: true,
      },
      { name: "⏰ Cooldown", value: "30 minutos por usuario", inline: true },
      {
        name: "🎮 Mecánicas",
        value:
          "• **5 salas** únicas con narrativa propia\n" +
          "• **3 opciones** por sala — cada una con consecuencias distintas\n" +
          "• Ganas **monedas y XP** según tus decisiones\n" +
          "• Algunas opciones tienen **riesgo/recompensa alta**",
        inline: false,
      },
      {
        name: "💡 Consejo",
        value: "No siempre el camino más arriesgado es el más rentable. ¡Explora todas las opciones!",
        inline: false,
      },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
