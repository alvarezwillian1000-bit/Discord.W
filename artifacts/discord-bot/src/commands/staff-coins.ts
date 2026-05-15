import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";
import { getEconomy, formatCoins } from "../utils/economy.js";

export const data = new SlashCommandBuilder()
  .setName("staff-coins")
  .setDescription("Da o quita monedas a un usuario (solo staff)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand((sub) =>
    sub
      .setName("dar")
      .setDescription("Da monedas a un usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario a dar monedas").setRequired(true))
      .addIntegerOption((o) => o.setName("cantidad").setDescription("Cantidad de monedas").setRequired(true).setMinValue(1))
  )
  .addSubcommand((sub) =>
    sub
      .setName("quitar")
      .setDescription("Quita monedas a un usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario a quitar monedas").setRequired(true))
      .addIntegerOption((o) => o.setName("cantidad").setDescription("Cantidad de monedas").setRequired(true).setMinValue(1))
  )
  .addSubcommand((sub) =>
    sub
      .setName("set")
      .setDescription("Establece exactamente la cantidad de monedas de cartera")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
      .addIntegerOption((o) => o.setName("cantidad").setDescription("Cantidad exacta").setRequired(true).setMinValue(0))
  )
  .addSubcommand((sub) =>
    sub
      .setName("set-banco")
      .setDescription("Establece exactamente la cantidad del banco")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
      .addIntegerOption((o) => o.setName("cantidad").setDescription("Cantidad exacta").setRequired(true).setMinValue(0))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({ content: "❌ Solo staff puede usar este comando.", ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const target = interaction.options.getUser("usuario", true);
  const amount = interaction.options.getInteger("cantidad", true);
  const guildId = interaction.guildId!;

  const { addCoins, setCoinsAmount, setBankAmount } = await import("../utils/economy.js");

  let updated;

  if (sub === "dar") {
    await addCoins(guildId, target.id, amount);
    updated = await getEconomy(guildId, target.id);
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("💰 Monedas entregadas")
      .setDescription(`Se dieron **${formatCoins(amount)}** a ${target}.`)
      .addFields(
        { name: "👛 Cartera", value: formatCoins(updated.coins), inline: true },
        { name: "🏦 Banco", value: formatCoins(updated.bank), inline: true },
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (sub === "quitar") {
    await addCoins(guildId, target.id, -amount);
    updated = await getEconomy(guildId, target.id);
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("💰 Monedas quitadas")
      .setDescription(`Se quitaron **${formatCoins(amount)}** a ${target}.`)
      .addFields(
        { name: "👛 Cartera", value: formatCoins(updated.coins), inline: true },
        { name: "🏦 Banco", value: formatCoins(updated.bank), inline: true },
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (sub === "set") {
    await setCoinsAmount(guildId, target.id, amount);
    updated = await getEconomy(guildId, target.id);
    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle("💰 Cartera establecida")
      .setDescription(`La cartera de ${target} se estableció en **${formatCoins(amount)}**.`)
      .addFields(
        { name: "👛 Cartera", value: formatCoins(updated.coins), inline: true },
        { name: "🏦 Banco", value: formatCoins(updated.bank), inline: true },
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (sub === "set-banco") {
    await setBankAmount(guildId, target.id, amount);
    updated = await getEconomy(guildId, target.id);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🏦 Banco establecido")
      .setDescription(`El banco de ${target} se estableció en **${formatCoins(amount)}**.`)
      .addFields(
        { name: "👛 Cartera", value: formatCoins(updated.coins), inline: true },
        { name: "🏦 Banco", value: formatCoins(updated.bank), inline: true },
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
