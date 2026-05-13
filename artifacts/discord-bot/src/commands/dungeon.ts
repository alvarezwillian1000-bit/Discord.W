import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { getEconomy, addCoins, formatCoins } from "../utils/economy.js";
import { addXP, getLevelColor } from "../utils/levels.js";

const DUNGEON_COOLDOWNS = new Map<string, number>();
const DUNGEON_COOLDOWN_MS = 30 * 60 * 1000;

type Room = {
  emoji: string;
  name: string;
  description: string;
  options: { id: string; label: string; emoji: string }[];
};

const ROOMS: Room[] = [
  {
    emoji: "🗡️", name: "Sala del Guardián",
    description: "Un guardián de piedra bloquea el paso. Sus ojos brillan en rojo. Puedes intentar luchar, intentar esquivarlo... o huir.",
    options: [
      { id: "fight", label: "⚔️ Combatir", emoji: "⚔️" },
      { id: "sneak", label: "🤫 Escabullirse", emoji: "🤫" },
      { id: "run", label: "🏃 Huir", emoji: "🏃" },
    ],
  },
  {
    emoji: "💎", name: "Cámara del Tesoro",
    description: "Ante ti hay tres cofres. Uno brilla con luz dorada, otro vibra con magia inquietante, y el tercero está cubierto de telarañas.",
    options: [
      { id: "gold", label: "✨ Cofre dorado", emoji: "✨" },
      { id: "magic", label: "🔮 Cofre mágico", emoji: "🔮" },
      { id: "dusty", label: "🕸️ Cofre viejo", emoji: "🕸️" },
    ],
  },
  {
    emoji: "🌿", name: "Jardín Olvidado",
    description: "Una sala cubierta de enredaderas antiguas. Una fuente en el centro emite un resplandor. ¿Bebes de ella, recoges las plantas, o sigues adelante?",
    options: [
      { id: "drink", label: "💧 Beber de la fuente", emoji: "💧" },
      { id: "gather", label: "🌿 Recoger plantas", emoji: "🌿" },
      { id: "pass", label: "➡️ Seguir adelante", emoji: "➡️" },
    ],
  },
  {
    emoji: "🎭", name: "Sala de los Espejos",
    description: "Infinitos espejos te rodean. Uno de ellos te muestra una versión de ti con más poder. Puedes romperlo, tocarlo, o ignorarlos todos.",
    options: [
      { id: "break", label: "💥 Romper el espejo", emoji: "💥" },
      { id: "touch", label: "👆 Tocar el espejo", emoji: "👆" },
      { id: "ignore", label: "🚶 Ignorar", emoji: "🚶" },
    ],
  },
  {
    emoji: "🐉", name: "Guarida del Dragón",
    description: "Un dragón joven duerme sobre un montón de monedas. Puedes intentar robarle, despertarlo para negociar... o retirarte en silencio.",
    options: [
      { id: "steal", label: "🪙 Robar monedas", emoji: "🪙" },
      { id: "negotiate", label: "🤝 Negociar", emoji: "🤝" },
      { id: "retreat", label: "🚪 Retirarse", emoji: "🚪" },
    ],
  },
];

type Outcome = { title: string; description: string; coins: number; xp: number; color: number };

const OUTCOMES: Record<string, Record<string, Outcome>> = {
  fight: {
    fight: { title: "⚔️ ¡Victoria!", description: "Derrotaste al guardián con habilidad. Los soldados del rey te reconocerán como héroe.", coins: 200, xp: 80, color: 0xffd700 },
    sneak: { title: "🤫 Sigilo perfecto", description: "Te escabulliste entre las sombras sin hacer ni un ruido. El guardián nunca supo que pasaste.", coins: 100, xp: 50, color: 0x57f287 },
    run: { title: "🏃 Prudencia antes que valor", description: "Huiste a tiempo. No hay vergüenza en sobrevivir.", coins: 20, xp: 10, color: 0x95a5a6 },
  },
  treasure: {
    gold: { title: "✨ ¡Jackpot!", description: "El cofre dorado estaba lleno de monedas de oro antiguas. ¡Eres rico!", coins: 350, xp: 40, color: 0xffd700 },
    magic: { title: "🔮 Maldición encantada", description: "El cofre mágico te lanzó un hechizo. Perdiste monedas... pero ganaste sabiduría.", coins: -50, xp: 100, color: 0x9b59b6 },
    dusty: { title: "🕸️ Tesoro oculto", description: "Debajo del polvo había una fortuna pequeña pero honesta. ¡No está mal!", coins: 150, xp: 30, color: 0xe67e22 },
  },
  garden: {
    drink: { title: "💧 Bendición de la fuente", description: "El agua mágica te otorgó claridad mental y una oleada de energía.", coins: 50, xp: 120, color: 0x3498db },
    gather: { title: "🌿 Alquimista improvisado", description: "Las plantas tienen valor. Un herborista te pagará bien por ellas.", coins: 180, xp: 40, color: 0x57f287 },
    pass: { title: "➡️ Camino recto", description: "Seguiste adelante sin distracciones. Encontraste una salida secreta con recompensa.", coins: 80, xp: 60, color: 0x95a5a6 },
  },
  mirrors: {
    break: { title: "💥 Fragmentos de poder", description: "Al romper el espejo liberaste energía atrapada. ¡El poder te pertenece!", coins: 100, xp: 100, color: 0xe74c3c },
    touch: { title: "👆 Visión alternativa", description: "Al tocar el espejo viajaste por un momento a otro mundo y regresaste con conocimiento.", coins: 60, xp: 140, color: 0x9b59b6 },
    ignore: { title: "🚶 Mente clara", description: "Ignoraste las ilusiones. Tu disciplina mental fue recompensada.", coins: 130, xp: 50, color: 0x1abc9c },
  },
  dragon: {
    steal: { title: "🪙 ¡Botín del dragón!", description: "Lo lograste... ¡pero el dragón se despertó a medias y quemó parte de tu botín!", coins: 250, xp: 60, color: 0xe67e22 },
    negotiate: { title: "🤝 Alianza inesperada", description: "El dragón aceptó el trato. Te pagó bien por tu audacia y respeto.", coins: 300, xp: 80, color: 0xffd700 },
    retreat: { title: "🚪 Sabiduría de héroe", description: "No todos los tesoros valen la vida. El dragón, impresionado, te lanzó algunas monedas al salir.", coins: 100, xp: 40, color: 0x57f287 },
  },
};

function getOutcome(roomIdx: number, choice: string): Outcome {
  const keys = ["fight", "treasure", "garden", "mirrors", "dragon"];
  const map = OUTCOMES[keys[roomIdx]];
  return map?.[choice] ?? { title: "🌀 Resultado misterioso", description: "Algo inexplicable ocurrió.", coins: 50, xp: 25, color: 0x5865f2 };
}

export const data = new SlashCommandBuilder()
  .setName("dungeon")
  .setDescription("🏰 Explora una mazmorra y consigue recompensas (cada 30 minutos)");

export async function execute(interaction: ChatInputCommandInteraction) {
  const cooldownKey = `${interaction.guildId}:${interaction.user.id}`;
  const last = DUNGEON_COOLDOWNS.get(cooldownKey) ?? 0;
  const elapsed = Date.now() - last;

  if (elapsed < DUNGEON_COOLDOWN_MS) {
    const mins = Math.ceil((DUNGEON_COOLDOWN_MS - elapsed) / 60000);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("⏰ Mazmorra en descanso")
          .setDescription(`Necesitas recuperar fuerzas. Vuelve en **${mins} minuto${mins !== 1 ? "s" : ""}**.`)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const eco = await getEconomy(interaction.guildId!, interaction.user.id);
  const roomIdx = Math.floor(Math.random() * ROOMS.length);
  const room = ROOMS[roomIdx];

  DUNGEON_COOLDOWNS.set(cooldownKey, Date.now());

  const introEmbed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`🏰 Mazmorra — ${room.emoji} ${room.name}`)
    .setDescription(
      `*Las antorchas parpadean mientras avanzas por el corredor de piedra...*\n\n${room.description}\n\n` +
      `**¿Qué decides hacer?**`
    )
    .setFooter({ text: `👛 Tu cartera: ${formatCoins(eco.coins)} · Tienes 60 segundos para elegir` })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    room.options.map((opt) =>
      new ButtonBuilder()
        .setCustomId(`dng_${opt.id}`)
        .setLabel(opt.label)
        .setStyle(ButtonStyle.Secondary)
    )
  );

  const msg = await interaction.editReply({ embeds: [introEmbed], components: [row] });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
    filter: (btn) => btn.user.id === interaction.user.id,
    max: 1,
  });

  collector.on("collect", async (btn) => {
    await btn.deferUpdate();
    const choice = btn.customId.replace("dng_", "");
    const outcome = getOutcome(roomIdx, choice);

    if (outcome.coins > 0) {
      await addCoins(interaction.guildId!, interaction.user.id, outcome.coins);
    } else if (outcome.coins < 0) {
      await addCoins(interaction.guildId!, interaction.user.id, outcome.coins);
    }

    if (outcome.xp > 0) {
      await addXP(interaction.guildId!, interaction.user.id, outcome.xp);
    }

    const updatedEco = await getEconomy(interaction.guildId!, interaction.user.id);
    const color = getLevelColor(0);

    const resultEmbed = new EmbedBuilder()
      .setColor(outcome.color)
      .setTitle(`${room.emoji} ${room.name} — ${outcome.title}`)
      .setDescription(outcome.description)
      .addFields(
        {
          name: outcome.coins >= 0 ? "💰 Monedas ganadas" : "💸 Monedas perdidas",
          value: formatCoins(Math.abs(outcome.coins)),
          inline: true,
        },
        { name: "✨ XP ganado", value: `+${outcome.xp} XP`, inline: true },
        { name: "👛 Cartera ahora", value: formatCoins(updatedEco.coins), inline: true },
      )
      .setFooter({ text: "Puedes volver a la mazmorra en 30 minutos" })
      .setTimestamp();

    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      room.options.map((opt) =>
        new ButtonBuilder()
          .setCustomId(`dng_done_${opt.id}`)
          .setLabel(opt.label)
          .setStyle(opt.id === choice ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(true)
      )
    );

    await interaction.editReply({ embeds: [resultEmbed], components: [disabledRow] });
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      const timeoutEmbed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("💨 Escapaste de la mazmorra")
        .setDescription("El miedo te paralizó. Saliste sin botín, pero vivo.")
        .setTimestamp();
      await interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
    }
  });
}
