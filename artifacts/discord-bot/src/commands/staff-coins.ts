import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";
import { getEconomy, addCoins, setCoinsAmount, setBankAmount, formatCoins } from "../utils/economy.js";

export const data = new SlashCommandBuilder()
  .setName("staff-coins")
  .setDescription("🛡️ Gestiona las monedas de un usuario (solo staff)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand((sub) =>
    sub
      .setName("dar")
      .setDescription("Da monedas a un usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario objetivo").setRequired(true))
      .addIntegerOption((o) =>
        o.setName("cantidad").setDescription("Cantidad a dar").setRequired(true).setMinValue(1).setMaxValue(1000000)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("quitar")
      .setDescription("Quita monedas a un usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario objetivo").setRequired(true))
      .addIntegerOption((o) =>
        o.setName("cantidad").setDescription("Cantidad a quitar").setRequired(true).setMinValue(1).setMaxValue(1000000)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("set")
      .setDescription("Establece el saldo exacto de la cartera de un usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario objetivo").setRequired(true))
      .addIntegerOption((o) =>
        o.setName("cantidad").setDescription("Cantidad exacta").setRequired(true).setMinValue(0).setMaxValue(10000000)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("set-banco")
      .setDescription("Establece el saldo exacto del banco de un usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario objetivo").setRequired(true))
      .addIntegerOption((o) =>
        o.setName("cantidad").setDescription("Cantidad exacta").setRequired(true).setMinValue(0).setMaxValue(10000000)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("ver")
      .setDescription("Ver el balance de cualquier usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario objetivo").setRequired(true))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "staff"))) {
    await interaction.reply({
      content: "❌ No tienes permisos de staff para usar este comando.",
      ephemeral: true,
    });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const targetUser = interaction.options.getUser("usuario", true);
  const cantidad = interaction.options.getInteger("cantidad", false) ?? 0;
  const guildId = interaction.guildId!;

  const targetMember = await interaction.guild!.members.fetch(targetUser.id).catch(() => null);
  const targetName = targetMember?.displayName ?? targetUser.username;

  await interaction.deferReply({ ephemeral: true });

  if (sub === "dar") {
    await addCoins(guildId, targetUser.id, cantidad);
    const eco = await getEconomy(guildId, targetUser.id);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("✅ Monedas entregadas")
      .addFields(
        { name: "👤 Usuario", value: targetName, inline: true },
        { name: "💰 Dado", value: formatCoins(cantidad), inline: true },
        { name: "👛 Cartera ahora", value: formatCoins(eco.coins), inline: true },
      )
      .setFooter({ text: `Por ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } else if (sub === "quitar") {
    await addCoins(guildId, targetUser.id, -cantidad);
    const eco = await getEconomy(guildId, targetUser.id);

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("✅ Monedas retiradas")
      .addFields(
        { name: "👤 Usuario", value: targetName, inline: true },
        { name: "💸 Quitado", value: formatCoins(cantidad), inline: true },
        { name: "👛 Cartera ahora", value: formatCoins(eco.coins), inline: true },
      )
      .setFooter({ text: `Por ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } else if (sub === "set") {
    await setCoinsAmount(guildId, targetUser.id, cantidad);
    const eco = await getEconomy(guildId, targetUser.id);

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle("✅ Cartera actualizada")
      .addFields(
        { name: "👤 Usuario", value: targetName, inline: true },
        { name: "👛 Cartera establecida a", value: formatCoins(cantidad), inline: true },
        { name: "🏦 Banco", value: formatCoins(eco.bank), inline: true },
      )
      .setFooter({ text: `Por ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } else if (sub === "set-banco") {
    await setBankAmount(guildId, targetUser.id, cantidad);
    const eco = await getEconomy(guildId, targetUser.id);

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle("✅ Banco actualizado")
      .addFields(
        { name: "👤 Usuario", value: targetName, inline: true },
        { name: "🏦 Banco establecido a", value: formatCoins(cantidad), inline: true },
        { name: "👛 Cartera", value: formatCoins(eco.coins), inline: true },
      )
      .setFooter({ text: `Por ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } else if (sub === "ver") {
    const eco = await getEconomy(guildId, targetUser.id);
    const total = eco.coins + eco.bank;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`💰 Balance de ${targetName}`)
      .setThumbnail(targetMember?.displayAvatarURL() ?? targetUser.displayAvatarURL())
      .addFields(
        { name: "👛 Cartera", value: formatCoins(eco.coins), inline: true },
        { name: "🏦 Banco", value: formatCoins(eco.bank), inline: true },
        { name: "💎 Total", value: formatCoins(total), inline: true },
        { name: "📈 Total ganado", value: formatCoins(eco.totalEarned), inline: true },
      )
      .setFooter({ text: `Por ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}
