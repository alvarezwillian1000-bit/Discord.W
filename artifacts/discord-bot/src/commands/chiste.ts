import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

const CHISTES = [
  "¿Por qué los programadores prefieren el oscuro? Porque la luz atrae los bugs. 🐛",
  "Le pregunté a la IA si era lista... tardó 3 segundos en responder. 🤖",
  "¿Cuál es el colmo de un electricista? Que su hijo se llame Ampere y no conduzca. ⚡",
  "¿Por qué el libro de matemáticas estaba triste? Porque tenía demasiados problemas. 📚",
  "¿Qué le dice un bit al otro? Nos vemos en el bus. 💾",
  "¿Por qué los fantasmas son malos mentirosos? Porque se les ve a través. 👻",
  "Mi contraseña es 'incorrecto', así cuando la olvido el sistema me dice: 'Tu contraseña es incorrecta'. ✅",
  "¿Cómo se llama el campeón de buceo japonés? Tokofondo. 🏊",
  "¿Qué hace una abeja en el gimnasio? ¡Zum-ba! 🐝",
  "Un informático va al médico: 'Doctor, tengo el síndrome de la pantalla'. El médico: 'No te veo bien'. 🖥️",
];

export const data = new SlashCommandBuilder()
  .setName("chiste")
  .setDescription("Recibe un chiste aleatorio 😂");

export async function execute(interaction: ChatInputCommandInteraction) {
  const chiste = CHISTES[Math.floor(Math.random() * CHISTES.length)];
  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle("😂 ¡Chiste del día!")
    .setDescription(chiste)
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}
