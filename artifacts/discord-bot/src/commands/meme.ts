import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import axios from "axios";

export const data = new SlashCommandBuilder()
  .setName("meme")
  .setDescription("Obtén un meme aleatorio de internet 🤣");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  try {
    const res = await axios.get("https://meme-api.com/gimme", { timeout: 6000 });
    const { title, url, subreddit, author } = res.data;

    const embed = new EmbedBuilder()
      .setColor(0xff4500)
      .setTitle(title)
      .setImage(url)
      .setFooter({ text: `r/${subreddit} • u/${author}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({ content: "❌ No pude obtener un meme ahora mismo. ¡Inténtalo de nuevo!" });
  }
}
