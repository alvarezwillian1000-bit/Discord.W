import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChannelType,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";
import {
  activeGiveaways,
  parseDuration,
  formatTimeLeft,
  buildGiveawayEmbed,
  endGiveaway,
  type Giveaway,
} from "../utils/giveaways.js";

export const data = new SlashCommandBuilder()
  .setName("sorteo")
  .setDescription("Crea un sorteo en el servidor")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addStringOption((o) =>
    o.setName("premio").setDescription("¿Qué se sorteará?").setRequired(true).setMaxLength(100)
  )
  .addStringOption((o) =>
    o.setName("duracion").setDescription("Duración: 1d, 12h, 30m, etc.").setRequired(true)
  )
  .addIntegerOption((o) =>
    o.setName("ganadores").setDescription("Número de ganadores").setRequired(true).setMinValue(1).setMaxValue(20)
  )
  .addChannelOption((o) =>
    o.setName("canal").setDescription("Canal donde se publicará el sorteo").addChannelTypes(ChannelType.GuildText).setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "sorteo"))) {
    await interaction.reply({
      content: "❌ No tienes el rol necesario para crear sorteos. Pide a un admin que use `/setup-sorteos`.",
      ephemeral: true,
    });
    return;
  }

  const premio = interaction.options.getString("premio", true);
  const duracionStr = interaction.options.getString("duracion", true);
  const nGanadores = interaction.options.getInteger("ganadores", true);
  const canalOpt = interaction.options.getChannel("canal", false);

  const durationMs = parseDuration(duracionStr);
  if (!durationMs) {
    await interaction.reply({
      content: "❌ Duración inválida. Usa formatos como: `1d`, `12h`, `30m`, `1h30m`.",
      ephemeral: true,
    });
    return;
  }

  const targetChannelId = canalOpt?.id ?? interaction.channelId;
  const targetChannel = interaction.guild!.channels.cache.get(targetChannelId);
  if (!targetChannel?.isTextBased()) {
    await interaction.reply({ content: "❌ Canal inválido.", ephemeral: true });
    return;
  }

  const endsAt = Date.now() + durationMs;
  const giveaway: Giveaway = {
    messageId: "",
    channelId: targetChannel.id,
    guildId: interaction.guildId!,
    prize: premio,
    winners: nGanadores,
    endsAt,
    hostId: interaction.user.id,
    participants: [],
    ended: false,
  };

  const embed = buildGiveawayEmbed(giveaway);
  const joinButton = new ButtonBuilder()
    .setCustomId("giveaway_join")
    .setLabel("🎉 Participar")
    .setStyle(ButtonStyle.Success);
  const infoButton = new ButtonBuilder()
    .setCustomId("giveaway_info")
    .setLabel("👥 Ver participantes")
    .setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(joinButton, infoButton);

  await interaction.deferReply({ ephemeral: true });

  const msg = await (targetChannel as any).send({ embeds: [embed], components: [row] });
  giveaway.messageId = msg.id;
  activeGiveaways.set(msg.id, giveaway);
  setTimeout(() => endGiveaway(giveaway), durationMs);

  await interaction.editReply({
    content: `✅ Sorteo de **${premio}** creado en ${targetChannel}. Dura **${formatTimeLeft(durationMs)}**.`,
  });
}
