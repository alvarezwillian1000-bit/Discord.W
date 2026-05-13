import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Message,
  ComponentType,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("poll")
  .setDescription("Crea una encuesta interactiva con botones")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addStringOption((o) => o.setName("pregunta").setDescription("Pregunta de la encuesta").setRequired(true).setMaxLength(200))
  .addStringOption((o) => o.setName("opcion1").setDescription("Opción 1").setRequired(true).setMaxLength(80))
  .addStringOption((o) => o.setName("opcion2").setDescription("Opción 2").setRequired(true).setMaxLength(80))
  .addStringOption((o) => o.setName("opcion3").setDescription("Opción 3 (opcional)").setRequired(false).setMaxLength(80))
  .addStringOption((o) => o.setName("opcion4").setDescription("Opción 4 (opcional)").setRequired(false).setMaxLength(80))
  .addIntegerOption((o) =>
    o.setName("duracion").setDescription("Duración en minutos (1–1440, defecto 60)").setRequired(false).setMinValue(1).setMaxValue(1440)
  )
  .addChannelOption((o) =>
    o.setName("canal").setDescription("Canal de destino").addChannelTypes(ChannelType.GuildText).setRequired(false)
  );

const OPTION_EMOJIS = ["🔵", "🔴", "🟢", "🟡"];
const OPTION_COLORS = [0x5865f2, 0xed4245, 0x57f287, 0xfee75c];

function buildBar(votes: number, total: number, length = 16): string {
  const pct = total === 0 ? 0 : Math.round((votes / total) * length);
  return "█".repeat(pct) + "░".repeat(length - pct);
}

function buildEmbed(
  pregunta: string,
  opciones: string[],
  votes: number[],
  author: string,
  authorIcon: string,
  closed: boolean,
  endsAt: Date
): EmbedBuilder {
  const total = votes.reduce((a, b) => a + b, 0);
  const winner = closed ? votes.indexOf(Math.max(...votes)) : -1;

  const desc = opciones
    .map((op, i) => {
      const pct = total === 0 ? 0 : Math.round((votes[i] / total) * 100);
      const bar = buildBar(votes[i], total);
      const tag = closed && i === winner && total > 0 ? " 🏆" : "";
      return `${OPTION_EMOJIS[i]} **${op}**${tag}\n\`${bar}\` **${pct}%** *(${votes[i]} votos)*`;
    })
    .join("\n\n");

  const color = closed ? 0x2b2d31 : OPTION_COLORS[winner === -1 ? 0 : winner];

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`📊 ${pregunta}`)
    .setDescription(desc)
    .setAuthor({ name: `Encuesta creada por ${author}`, iconURL: authorIcon })
    .addFields(
      { name: "🗳️ Total votos", value: String(total), inline: true },
      { name: closed ? "🔒 Finalizada" : "⏳ Cierra", value: closed ? "Encuesta cerrada" : `<t:${Math.floor(endsAt.getTime() / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: closed ? "🔒 Encuesta finalizada" : "Un voto por persona · Los resultados se actualizan en tiempo real" })
    .setTimestamp();
}

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ No tienes permisos de staff.", ephemeral: true });
    return;
  }

  const pregunta = interaction.options.getString("pregunta", true);
  const opciones = ["opcion1", "opcion2", "opcion3", "opcion4"]
    .map((k) => interaction.options.getString(k, false))
    .filter((v): v is string => !!v);

  const duracion = interaction.options.getInteger("duracion", false) ?? 60;
  const canalOpt = interaction.options.getChannel("canal", false);
  const targetChannel = canalOpt
    ? interaction.guild!.channels.cache.get(canalOpt.id)
    : interaction.channel;

  if (!targetChannel?.isTextBased()) {
    await interaction.reply({ content: "❌ Canal inválido.", ephemeral: true });
    return;
  }

  const votes = opciones.map(() => 0);
  const voters = new Map<string, number>();
  const endsAt = new Date(Date.now() + duracion * 60_000);

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    opciones.map((op, i) =>
      new ButtonBuilder()
        .setCustomId(`poll_${i}`)
        .setLabel(op.length > 25 ? op.slice(0, 22) + "…" : op)
        .setEmoji(OPTION_EMOJIS[i])
        .setStyle([ButtonStyle.Primary, ButtonStyle.Danger, ButtonStyle.Success, ButtonStyle.Secondary][i] as ButtonStyle)
    )
  );

  const embed = buildEmbed(pregunta, opciones, votes, interaction.user.displayName, interaction.user.displayAvatarURL(), false, endsAt);
  const msg = await (targetChannel as any).send({ embeds: [embed], components: [buttons] }) as Message;

  await interaction.reply({ content: `✅ Encuesta activa en ${targetChannel} durante **${duracion} min**.`, ephemeral: true });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: duracion * 60_000,
  });

  collector.on("collect", async (btn) => {
    await btn.deferUpdate();
    const idx = parseInt(btn.customId.replace("poll_", ""));
    const prev = voters.get(btn.user.id);

    if (prev !== undefined) {
      if (prev === idx) {
        votes[prev]--;
        voters.delete(btn.user.id);
      } else {
        votes[prev]--;
        votes[idx]++;
        voters.set(btn.user.id, idx);
      }
    } else {
      votes[idx]++;
      voters.set(btn.user.id, idx);
    }

    const updated = buildEmbed(pregunta, opciones, votes, interaction.user.displayName, interaction.user.displayAvatarURL(), false, endsAt);
    await msg.edit({ embeds: [updated], components: [buttons] });
  });

  collector.on("end", async () => {
    const finalEmbed = buildEmbed(pregunta, opciones, votes, interaction.user.displayName, interaction.user.displayAvatarURL(), true, endsAt);
    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      opciones.map((op, i) =>
        new ButtonBuilder()
          .setCustomId(`poll_done_${i}`)
          .setLabel(op.length > 25 ? op.slice(0, 22) + "…" : op)
          .setEmoji(OPTION_EMOJIS[i])
          .setStyle([ButtonStyle.Primary, ButtonStyle.Danger, ButtonStyle.Success, ButtonStyle.Secondary][i] as ButtonStyle)
          .setDisabled(true)
      )
    );
    await msg.edit({ embeds: [finalEmbed], components: [disabledRow] }).catch(() => {});
  });
}
