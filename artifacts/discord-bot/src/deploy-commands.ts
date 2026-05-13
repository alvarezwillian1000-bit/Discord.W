import { REST, Routes } from "discord.js";
import { readdirSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const commands: unknown[] = [];

  const commandsPath = join(__dirname, "commands");
  const commandFiles = readdirSync(commandsPath).filter(
    (f) => f.endsWith(".ts") || f.endsWith(".js")
  );

  for (const file of commandFiles) {
    const filePath = pathToFileURL(join(commandsPath, file)).href;
    const command = await import(filePath);
    if ("data" in command) {
      commands.push(command.data.toJSON());
    }
  }

  const token = process.env.DISCORD_TOKEN!;
  const clientId = process.env.DISCORD_CLIENT_ID!;

  if (!token || !clientId) {
    console.error("Faltan DISCORD_TOKEN o DISCORD_CLIENT_ID");
    process.exit(1);
  }

  const rest = new REST({ version: "10" }).setToken(token);

  console.log(`Registrando ${commands.length} comandos de aplicación...`);
  const data = (await rest.put(Routes.applicationCommands(clientId), {
    body: commands,
  })) as unknown[];
  console.log(`✅ ${data.length} comandos registrados exitosamente.`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
