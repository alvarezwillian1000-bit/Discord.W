import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getEconomy, formatCoins } from "../utils/economy.js";

export const data = new SlashCommandBuilder()
  .setName("balance")
  .setDescription("Consulta tu saldo de monedas")
  .addUserOption((o) => o.setName("usuario").setDescription("Usuario (por defecto tú)").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("usuario", false) ?? interaction.user;
  const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: "❌ No encontré a ese usuario.", ephemeral: true });
    return;
  }

  await interaction.deferReply();
  const eco = await getEconomy(interaction.guildId!, target.id);
  const total = eco.coins + eco.bank;

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle(`💰 Balance de ${member.displayName}`)
    .setThumbnail(member.displayAvatarURL())
    .addFields(
      { name: "👛 Cartera", value: formatCoins(eco.coins), inline: true },
      { name: "🏦 Banco", value: formatCoins(eco.bank), inline: true },
      { name: "💎 Total", value: formatCoins(total), inline: true },
      { name: "📈 Total ganado", value: formatCoins(eco.totalEarned), inline: true },
    )
    .setFooter({ text: "Usa /banco para depositar y proteger tus monedas" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
