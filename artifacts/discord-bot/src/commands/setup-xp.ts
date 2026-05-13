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
  .setName("setup-xp")
  .setDescription("Configura el sistema de XP y niveles del servidor")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((o) =>
    o
      .setName("canal")
      .setDescription("Canal donde se anuncian las subidas de nivel (opcional, deja vacío para anunciar en el mismo canal)")
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
    xpChannelId: canal?.id ?? null,
  });

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✨ Sistema de XP Configurado")
    .setDescription(
      canal
        ? `Los anuncios de subida de nivel se enviarán en <#${canal.id}>.`
        : "Los anuncios de subida de nivel se enviarán en el mismo canal donde el usuario habló."
    )
    .addFields(
      { name: "📈 XP por mensaje", value: "15–25 XP (cooldown 60 segundos)", inline: true },
      { name: "🏆 Fórmula de niveles", value: "Progresiva — cada nivel cuesta más XP", inline: true },
      { name: "🎮 Comandos usuarios", value: "`/rank` `/leaderboard`", inline: false },
      { name: "⚙️ Comandos admin", value: "`/xp dar` `/xp quitar`", inline: false },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
