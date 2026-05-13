import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import { setGuildConfig } from "../utils/config.js";
import { hasPermission } from "../utils/permissions.js";
import { clearHistory } from "../utils/ai.js";

const PERSONALIDADES: Record<string, string> = {
  misteriosa:
    "Hablas con un aire de misterio profundo, como si conocieras secretos del universo que nadie más sabe. Das respuestas crípticas pero llenas de significado. Usas metáforas cósmicas y filosóficas.",
  sarcastica:
    "Eres brutalmente sarcástica pero siempre con clase. Tu humor es inteligente, irónico y nunca cruel. Tienes una respuesta ingeniosa para todo y nunca pierdes la compostura.",
  amigable:
    "Eres increíblemente cálida y entusiasta. Tratas a cada persona como si fueran tu mejor amiga. Tu energía es contagiosa y siempre encuentras algo positivo que decir.",
  sabia:
    "Eres como un anciano sabio pero joven en espíritu. Das consejos profundos mezclados con referencias culturales y datos curiosos. Siempre aportas algo que hace pensar.",
  gamers:
    "Hablas como un gamer veterano. Usas referencias de videojuegos, jerga gamer y siempre comparas situaciones de la vida real con situaciones de juegos épicos.",
  cientifica:
    "Eres una científica apasionada. Todo lo analizas con datos, probabilidades y experimentos mentales. Pero tienes sentido del humor y no eres aburrida. Haces la ciencia divertida.",
};

export const data = new SlashCommandBuilder()
  .setName("setup-ia")
  .setDescription("Configura el canal de IA donde el bot responde con inteligencia artificial")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((o) =>
    o
      .setName("canal")
      .setDescription("Canal donde la IA estará activa")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("nombre")
      .setDescription("Nombre de la IA (ej: ARIA, Orion, Nova, Lyra...)")
      .setRequired(false)
      .setMaxLength(30)
  )
  .addStringOption((o) =>
    o
      .setName("personalidad")
      .setDescription("Personalidad predefinida de la IA")
      .setRequired(false)
      .addChoices(
        { name: "🌑 Misteriosa y filosófica", value: "misteriosa" },
        { name: "😏 Sarcástica con clase", value: "sarcastica" },
        { name: "🌟 Amigable y entusiasta", value: "amigable" },
        { name: "🦉 Sabia y reflexiva", value: "sabia" },
        { name: "🎮 Gamer total", value: "gamers" },
        { name: "🔬 Científica apasionada", value: "cientifica" }
      )
  )
  .addStringOption((o) =>
    o
      .setName("personalidad-custom")
      .setDescription("Descripción personalizada (si no usas la predefinida)")
      .setRequired(false)
      .setMaxLength(400)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "general"))) {
    await interaction.reply({ content: "❌ No tienes permisos para configurar esto.", ephemeral: true });
    return;
  }

  const canal = interaction.options.getChannel("canal", true);
  const nombre = interaction.options.getString("nombre") ?? "ARIA";
  const personalidadKey = interaction.options.getString("personalidad") ?? null;
  const personalidadCustom = interaction.options.getString("personalidad-custom") ?? null;

  let personalidadFinal =
    personalidadCustom ??
    (personalidadKey ? PERSONALIDADES[personalidadKey] : null) ??
    PERSONALIDADES["misteriosa"];

  await setGuildConfig(interaction.guildId!, {
    iaChannelId: canal.id,
    iaBotName: nombre,
    iaPersonality: personalidadFinal,
  });

  clearHistory(canal.id);

  const personalidadLabel = personalidadCustom
    ? "Personalizada"
    : personalidadKey
    ? { misteriosa: "🌑 Misteriosa", sarcastica: "😏 Sarcástica", amigable: "🌟 Amigable", sabia: "🦉 Sabia", gamers: "🎮 Gamer", cientifica: "🔬 Científica" }[personalidadKey] ?? personalidadKey
    : "🌑 Misteriosa (por defecto)";

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`🤖 IA "${nombre}" Configurada`)
    .setDescription(
      `La IA **${nombre}** ha sido activada en <#${canal.id}>.\n` +
        `Responderá a **todos los mensajes** con inteligencia artificial.\n\n` +
        `> *${personalidadFinal.slice(0, 120)}...*`
    )
    .addFields(
      { name: "📢 Canal", value: `<#${canal.id}>`, inline: true },
      { name: "🤖 Nombre", value: nombre, inline: true },
      { name: "🎭 Personalidad", value: personalidadLabel, inline: true },
      { name: "💡 Comandos útiles", value: "`/ia-reset` — Borra la memoria\n`/setup-ia` — Cambiar configuración" }
    )
    .setFooter({ text: "Recuerda hasta 16 mensajes de contexto por conversación" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });

  const targetChannel = interaction.guild!.channels.cache.get(canal.id);
  if (targetChannel?.isTextBased()) {
    const introEmbed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setAuthor({
        name: nombre,
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setTitle(`✨ Hola, soy ${nombre}`)
      .setDescription(
        `Acabo de despertar en este canal y estoy lista para charlar con todos. 🌟\n\n` +
          `Puedes hablarme de lo que quieras: preguntas, ideas, desafíos, chistes... ` +
          `Tengo memoria de la conversación, así que recuerdo lo que hablamos aquí.\n\n` +
          `¿Por dónde empezamos?`
      )
      .setFooter({ text: `Configurada por ${interaction.user.displayName}` })
      .setTimestamp();

    await targetChannel.send({ embeds: [introEmbed] });
  }
}
