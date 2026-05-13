import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ayuda")
  .setDescription("Muestra todos los comandos disponibles del bot");

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📖 Comandos del Bot")
    .setDescription("Aquí tienes todos los comandos disponibles:")
    .addFields(
      {
        name: "🎮 General (todos)",
        value: "`/coinflip` `/8ball` `/dice` `/avatar` `/ping` `/serverinfo` `/roblox` `/sugerir` `/bug` `/verificar` `/perfil`",
      },
      {
        name: "✨ Niveles & XP",
        value: "`/rank` — Tu nivel y progreso\n`/leaderboard` — Top XP del servidor",
      },
      {
        name: "💰 Economía",
        value:
          "`/balance` `/daily` `/trabajar` `/banco` `/pagar`\n`/ruleta` `/robar` `/top-rico`",
      },
      {
        name: "🏰 Mazmorra",
        value: "`/dungeon` — Explora mazmorras y consigue recompensas (monedas + XP)",
      },
      {
        name: "🎉 Sorteos",
        value: "`/sorteo` `/setup-sorteos`",
      },
      {
        name: "📢 Anuncios",
        value: "`/anunciar` `/set-anuncio`",
      },
      {
        name: "📊 Encuestas",
        value: "`/poll` — Encuesta interactiva con botones y resultados en tiempo real",
      },
      {
        name: "🛡️ Staff (requiere rol de staff)",
        value:
          "`/kick` `/ban` `/unban` `/timeout` `/warn` `/clear` `/lock` `/unlock`\n`/slowmode` `/nick` `/role` `/embed` `/poll` `/userinfo` `/testbienvenida`",
      },
      {
        name: "🤖 IA",
        value: "`/setup-ia` — Canal donde la IA responde\n`/ia-reset` — Borra la memoria de la IA",
      },
      {
        name: "⚙️ Configuración (admins)",
        value:
          "`/setup-bienvenida` `/setup-tickets` `/setup-general` `/setup-cmdstaff`\n" +
          "`/setup-sorteos` `/set-anuncio` `/setup-sugerencias` `/setup-bugs` `/setup-ia`\n" +
          "`/setup-xp` `/setup-economia` `/setup-dungeon`\n" +
          "`/xp dar` `/xp quitar`",
      }
    )
    .setFooter({ text: "Los comandos de staff requieren rol configurado con /setup-cmdstaff" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
