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
  .setName("setup-economia")
  .setDescription("Configura el sistema de economía del servidor")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((o) =>
    o
      .setName("canal-economia")
      .setDescription("Canal donde se anuncian eventos de economía (jackpots, robos grandes, etc.)")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  )
  .addStringOption((o) =>
    o
      .setName("nombre-moneda")
      .setDescription("Nombre personalizado para las monedas (ej: Robux, Gemas, Coins)")
      .setRequired(false)
      .setMaxLength(20)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "general"))) {
    await interaction.reply({ content: "❌ No tienes permisos para configurar esto.", ephemeral: true });
    return;
  }

  const canal = interaction.options.getChannel("canal-economia", false);
  const nombreMoneda = interaction.options.getString("nombre-moneda", false);

  await setGuildConfig(interaction.guildId!, {
    economyChannelId: canal?.id ?? null,
    coinName: nombreMoneda ?? null,
  });

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle("💰 Sistema de Economía Configurado")
    .setDescription("El sistema de economía está activo para este servidor.")
    .addFields(
      {
        name: "📢 Canal de anuncios",
        value: canal ? `<#${canal.id}>` : "No configurado (sin anuncios globales)",
        inline: true,
      },
      {
        name: "🪙 Nombre de moneda",
        value: nombreMoneda ?? "Monedas (por defecto)",
        inline: true,
      },
      {
        name: "💼 Comandos disponibles",
        value:
          "`/balance` · `/daily` · `/trabajar`\n`/banco` · `/pagar` · `/ruleta`\n`/robar` · `/top-rico`",
        inline: false,
      },
      {
        name: "⚙️ Cooldowns configurados",
        value: "Daily: **24h** · Trabajar: **4h** · Robar: **8h**",
        inline: false,
      },
    )
    .setFooter({ text: "Usa /ayuda para ver todos los comandos de economía" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
