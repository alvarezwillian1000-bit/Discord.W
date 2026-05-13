import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { hasPermission } from "../utils/permissions.js";
import { addXP, getXPProgress, getLevelColor } from "../utils/levels.js";

export const data = new SlashCommandBuilder()
  .setName("xp")
  .setDescription("Gestiona el XP de un usuario")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName("dar")
      .setDescription("Añade XP a un usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
      .addIntegerOption((o) =>
        o.setName("cantidad").setDescription("Cantidad de XP a añadir").setRequired(true).setMinValue(1).setMaxValue(100000)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("quitar")
      .setDescription("Quita XP a un usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
      .addIntegerOption((o) =>
        o.setName("cantidad").setDescription("Cantidad de XP a quitar").setRequired(true).setMinValue(1).setMaxValue(100000)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!(await hasPermission(interaction.member as any, "general"))) {
    await interaction.reply({ content: "❌ Solo admins o roles del `setup-general` pueden usar este comando.", ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const target = interaction.options.getUser("usuario", true);
  const cantidad = interaction.options.getInteger("cantidad", true);
  const member = await interaction.guild!.members.fetch(target.id).catch(() => null);

  if (!member) {
    await interaction.reply({ content: "❌ No encontré a ese usuario en el servidor.", ephemeral: true });
    return;
  }

  const amount = sub === "dar" ? cantidad : -cantidad;
  const { newXP, newLevel, leveledUp } = await addXP(interaction.guildId!, target.id, amount);
  const { level, currentXP, neededXP } = getXPProgress(newXP);
  const color = getLevelColor(level);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(sub === "dar" ? "✨ XP Añadido" : "🔻 XP Quitado")
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      { name: "👤 Usuario", value: member.displayName, inline: true },
      { name: sub === "dar" ? "✨ XP Añadido" : "🔻 XP Quitado", value: `${cantidad} XP`, inline: true },
      { name: "📊 XP Total", value: `${newXP.toLocaleString()} XP`, inline: true },
      { name: "🏆 Nivel Actual", value: `Nivel ${newLevel}`, inline: true },
      { name: "📈 Progreso", value: `${currentXP} / ${neededXP} XP`, inline: true },
    )
    .setFooter({ text: leveledUp ? `🎉 ¡Subió al nivel ${newLevel}!` : `Modificado por ${interaction.user.displayName}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
