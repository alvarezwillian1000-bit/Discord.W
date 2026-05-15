import { Client, GatewayIntentBits, Collection, REST, Routes } from "discord.js";
import { readdirSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";
import { createServer } from "http";
import { logger } from "./utils/logger.js";
import { initDatabase } from "./init-db.js";

export { logger };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

(client as any).commands = new Collection();

async function loadCommands() {
  const commandsPath = join(__dirname, "commands");
  const commandFiles = readdirSync(commandsPath).filter(
    (f) => f.endsWith(".ts") || f.endsWith(".js")
  );
  for (const file of commandFiles) {
    try {
      const filePath = pathToFileURL(join(commandsPath, file)).href;
      const command = await import(filePath);
      if ("data" in command && "execute" in command) {
        (client as any).commands.set(command.data.name, command);
      }
    } catch (err) {
      logger.error({ err, file }, "Error cargando comando");
    }
  }
}

async function loadEvents() {
  const eventsPath = join(__dirname, "events");
  const eventFiles = readdirSync(eventsPath).filter(
    (f) => f.endsWith(".ts") || f.endsWith(".js")
  );
  for (const file of eventFiles) {
    try {
      const filePath = pathToFileURL(join(eventsPath, file)).href;
      const event = await import(filePath);
      if (event.once) {
        client.once(event.name, (...args: unknown[]) => {
          Promise.resolve(event.execute(...args)).catch((err) => {
            logger.error({ err, file }, "Error en evento once");
          });
        });
      } else {
        client.on(event.name, (...args: unknown[]) => {
          Promise.resolve(event.execute(...args)).catch((err) => {
            logger.error({ err, file }, "Error en evento");
          });
        });
      }
    } catch (err) {
      logger.error({ err, file }, "Error cargando evento");
    }
  }
}

async function deployCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!token || !clientId) {
    logger.warn("DISCORD_TOKEN o DISCORD_CLIENT_ID no configurados. No se registrarán comandos.");
    return;
  }

  try {
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

    const rest = new REST({ version: "10" }).setToken(token);
    logger.info(`Registrando ${commands.length} comandos en Discord...`);
    const data = (await rest.put(Routes.applicationCommands(clientId), { body: commands })) as any[];
    logger.info(`✅ ${data.length} comandos registrados en Discord.`);
  } catch (err) {
    logger.error(err, "Error registrando comandos en Discord");
  }
}

function startHealthServer() {
  const port = parseInt(process.env.PORT ?? "8082", 10);
  const server = createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        bot: client.user?.tag ?? "connecting",
      })
    );
  });
  server.listen(port, "0.0.0.0", () => {
    logger.info(`Health server escuchando en puerto ${port}`);
  });
}

async function main() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    logger.error("DISCORD_TOKEN no esta configurado.");
    process.exit(1);
  }

  startHealthServer();

  initDatabase().catch((err) => {
    logger.error(err, "Error en initDatabase (no fatal)");
  });

  await loadCommands();
  await loadEvents();
  await client.login(token);

  // Deploy commands after bot is ready (needs client to be logged in)
  await deployCommands();
}

main().catch((err) => {
  logger.error(err, "Error fatal al iniciar el bot");
  process.exit(1);
});
