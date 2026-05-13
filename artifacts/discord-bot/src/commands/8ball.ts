import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

const RESPUESTAS = [
  { text: "✅ Sí, definitivamente.", color: 0x57f287 },
  { text: "✅ Sin duda alguna.", color: 0x57f287 },
  { text: "✅ Puedes contar con ello.", color: 0x57f287 },
  { text: "✅ Según mis fuentes, sí.", color: 0x57f287 },
  { text: "✅ Las señales apuntan al sí.", color: 0x57f287 },
  { text: "🤔 Mejor no te lo digo ahora.", color: 0xfee75c },
  { text: "🤔 Vuelve a preguntar más tarde.", color: 0xfee75c },
  { text: "🤔 No puedo predecirlo ahora.", color: 0xfee75c },
  { text: "🤔 Concéntrate y pregunta de nuevo.", color: 0xfee75c },
  { text: "❌ No cuentes con ello.", color: 0xed4245 },
  { text: "❌ Mi respuesta es no.", color: 0xed4245 },
  { text: "❌ Las perspectivas no son buenas.", color: 0xed4245 },
  { text: "❌ Muy dudoso.", color: 0xed4245 },
  { text: "🌀 El universo guarda silencio ante esa pregunta.", color: 0x9b59b6 },
  { text: "🌀 Las estrellas no se alinean hoy para eso.", color: 0x9b59b6 },
];

export const data = new SlashCommandBuilder()
  .setName("8ball")
  .setDescription("Pregúntale a la bola mágica 🎱")
  .addStringOption((o) =>
    o.setName("pregunta").setDescription("¿Qué quieres saber?").setRequired(true).setMaxLength(200)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const pregunta = interaction.options.getString("pregunta", true);
  const resp = RESPUESTAS[Math.floor(Math.random() * RESPUESTAS.length)];

  const embed = new EmbedBuilder()
    .setColor(resp.color)
    .setTitle("🎱 La Bola Mágica responde...")
    .addFields(
      { name: "❓ Pregunta", value: pregunta },
      { name: "🎱 Respuesta", value: resp.text }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
