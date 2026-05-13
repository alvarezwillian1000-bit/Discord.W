import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { transferCoins, formatCoins, getEconomy } from "../utils/economy.js";

export const data = new SlashCommandBuilder()
  .setName("pagar")
  .setDescription("Transfiere monedas a otro usuario")
  .addUserOption((o) => o.setName("usuario").setDescription("A quién pagarle").setRequired(true))
  .addIntegerOption((o) =>
    o.setName("cantidad").setDescription("Cantidad a transferir").setRequired(true).setMinValue(1)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("usuario", true);
  const cantidad = interaction.options.getInteger("cantidad", true);

  if (target.id === interaction.user.id) {
    await interaction.reply({ content: "❌ No puedes pagarte a ti mismo.", ephemeral: true });
    return;
  }
  if (target.bot) {
    await interaction.reply({ content: "❌ No puedes pagar a un bot.", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const success = await transferCoins(interaction.guildId!, interaction.user.id, target.id, cantidad);

  if (!success) {
    const eco = await getEconomy(interaction.guildId!, interaction.user.id);
    await interaction.editReply({
      content: `❌ No tienes suficientes monedas. Tienes ${formatCoins(eco.coins)} en cartera.`,
    });
    return;
  }

  const targetMember = await interaction.guild!.members.fetch(target.id).catch(() => null);
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("💸 Transferencia exitosa")
    .setDescription(`**${interaction.member && "displayName" in interaction.member ? (interaction.member as any).displayName : interaction.user.username}** le pagó a **${targetMember?.displayName ?? target.username}**.`)
    .addFields(
      { name: "💰 Transferido", value: formatCoins(cantidad), inline: true },
      { name: "👤 Destinatario", value: targetMember?.displayName ?? target.username, inline: true },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
