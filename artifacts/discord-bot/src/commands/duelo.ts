import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
} from "discord.js";
import { getEconomy, addCoins, formatCoins } from "../utils/economy.js";

const DUELO_COOLDOWNS = new Map<string, number>();
const DUELO_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutos

const DUELO_SCENARIOS = [
  { battle: "batalla de Roblox obby", win: "dominó el nivel sin morir", lose: "cayó en el primer hoyo" },
  { battle: "duelo de bailes en Roblox", win: "ejecutó el mejor emote", lose: "se trabó bailando" },
  { battle: "torneo de trivia gaming", win: "respondió todo correcto", lose: "se quedó en blanco" },
  { battle: "partida de apuestas en el casino del servidor", win: "tuvo una racha increíble", lose: "apostó de más" },
  { battle: "carrera de obstáculos", win: "llegó primero con ventaja", lose: "se tropezó en la recta final" },
  { battle: "desafío de construcción en Roblox", win: "creó una obra maestra", lose: "no pudo terminar a tiempo" },
  { battle: "combate 1v1 en el servidor", win: "fue demasiado rápido", lose: "no pudo predecir los movimientos" },
  { battle: "competencia de memes", win: "hizo reír a todos", lose: "sus memes eran de 2015" },
];

export const data = new SlashCommandBuilder()
  .setName("duelo")
  .setDescription("⚔️ Reta a otro usuario a un duelo de apuestas")
  .addUserOption((o) =>
    o.setName("rival").setDescription("Usuario al que retar").setRequired(true)
  )
  .addIntegerOption((o) =>
    o.setName("apuesta").setDescription("Monedas a apostar").setRequired(true).setMinValue(10).setMaxValue(50000)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const rival = interaction.options.getUser("rival", true);
  const apuesta = interaction.options.getInteger("apuesta", true);

  if (rival.id === interaction.user.id) {
    await interaction.reply({ content: "❌ No puedes retarte a ti mismo.", ephemeral: true });
    return;
  }
  if (rival.bot) {
    await interaction.reply({ content: "❌ Los bots no aceptan duelos.", ephemeral: true });
    return;
  }

  const cooldownKey = `${interaction.guildId}:${interaction.user.id}`;
  const lastDuel = DUELO_COOLDOWNS.get(cooldownKey) ?? 0;
  const elapsed = Date.now() - lastDuel;
  if (elapsed < DUELO_COOLDOWN_MS) {
    const mins = Math.ceil((DUELO_COOLDOWN_MS - elapsed) / 60000);
    await interaction.reply({
      content: `⏰ Ya retaste a alguien recientemente. Espera **${mins} minuto${mins !== 1 ? "s" : ""}** antes de retar de nuevo.`,
      ephemeral: true,
    });
    return;
  }

  // Verificar que el retador tiene suficientes monedas
  const retadorEco = await getEconomy(interaction.guildId!, interaction.user.id);
  if (retadorEco.coins < apuesta) {
    await interaction.reply({
      content: `❌ No tienes suficientes monedas. Tienes **${formatCoins(retadorEco.coins)}** pero quieres apostar **${formatCoins(apuesta)}**.`,
      ephemeral: true,
    });
    return;
  }

  const rivalMember = await interaction.guild!.members.fetch(rival.id).catch(() => null);
  const rivalName = rivalMember?.displayName ?? rival.username;
  const retadorName = (interaction.member as any)?.displayName ?? interaction.user.username;

  const scenario = DUELO_SCENARIOS[Math.floor(Math.random() * DUELO_SCENARIOS.length)];

  const challengeEmbed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("⚔️ ¡Reto de duelo!")
    .setDescription(
      `**${retadorName}** reta a **${rivalName}** a un duelo.\n\n` +
      `🏆 **Escenario:** ${scenario.battle}\n` +
      `💰 **Apuesta:** ${formatCoins(apuesta)} cada uno\n` +
      `🎯 **Premio total:** ${formatCoins(apuesta * 2)}\n\n` +
      `${rival}, ¿aceptas el reto? Tienes **60 segundos** para responder.`
    )
    .setFooter({ text: "El ganador se lleva todo" })
    .setTimestamp();

  const acceptBtn = new ButtonBuilder()
    .setCustomId("duel_accept")
    .setLabel("✅ Aceptar duelo")
    .setStyle(ButtonStyle.Success);

  const declineBtn = new ButtonBuilder()
    .setCustomId("duel_decline")
    .setLabel("❌ Rechazar")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptBtn, declineBtn);

  await interaction.reply({ embeds: [challengeEmbed], components: [row] });

  const msg = await interaction.fetchReply();
  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
    filter: (btn) => btn.user.id === rival.id,
    max: 1,
  });

  DUELO_COOLDOWNS.set(cooldownKey, Date.now());

  collector.on("collect", async (btn) => {
    await btn.deferUpdate();

    if (btn.customId === "duel_decline") {
      const declineEmbed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle("🏳️ Duelo rechazado")
        .setDescription(`**${rivalName}** rechazó el duelo. Cobarde... 😏`)
        .setTimestamp();
      await interaction.editReply({ embeds: [declineEmbed], components: [] });
      return;
    }

    // Aceptó el duelo — verificar monedas del rival
    const rivalEco = await getEconomy(interaction.guildId!, rival.id);
    if (rivalEco.coins < apuesta) {
      const brokeEmbed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("💸 Sin fondos")
        .setDescription(
          `**${rivalName}** aceptó el duelo pero no tiene suficientes monedas.\n` +
          `Tiene **${formatCoins(rivalEco.coins)}** y se necesitan **${formatCoins(apuesta)}**.`
        )
        .setTimestamp();
      await interaction.editReply({ embeds: [brokeEmbed], components: [] });
      return;
    }

    // Determinar ganador (50/50)
    const retadorWins = Math.random() < 0.5;
    const winner = retadorWins ? { id: interaction.user.id, name: retadorName } : { id: rival.id, name: rivalName };
    const loser = retadorWins ? { id: rival.id, name: rivalName } : { id: interaction.user.id, name: retadorName };
    const winDesc = retadorWins ? scenario.win : scenario.win;
    const loseDesc = retadorWins ? scenario.lose : scenario.lose;

    // Transferir monedas: el perdedor pierde, el ganador gana
    await addCoins(interaction.guildId!, loser.id, -apuesta);
    await addCoins(interaction.guildId!, winner.id, apuesta);

    const winnerEco = await getEconomy(interaction.guildId!, winner.id);

    const resultEmbed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle(`⚔️ Duelo — ${scenario.battle.toUpperCase()}`)
      .setDescription(
        `**${winner.name}** ${winDesc} y **${loser.name}** ${loseDesc}.\n\n` +
        `🏆 **Ganador:** ${winner.name}\n` +
        `💰 **Ganó:** ${formatCoins(apuesta)}\n` +
        `💸 **${loser.name} perdió:** ${formatCoins(apuesta)}`
      )
      .addFields(
        { name: `👛 Cartera de ${winner.name}`, value: formatCoins(winnerEco.coins), inline: true },
        { name: "🎯 Bote", value: formatCoins(apuesta * 2), inline: true },
      )
      .setFooter({ text: "¡La revancha te espera en 10 minutos!" })
      .setTimestamp();

    await interaction.editReply({ embeds: [resultEmbed], components: [] });
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      const timeoutEmbed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("⏰ Duelo expirado")
        .setDescription(`**${rivalName}** no respondió a tiempo. El duelo fue cancelado.`)
        .setTimestamp();
      await interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
    }
  });
}
