import { Client, GatewayIntentBits, Collection } from "discord.js";
import { readdirSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";
import { createServer } from "http";
import { logger } from "./utils/logger.js";
import { initDatabase } from "./init-db.js";

export { logger };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let client: Client | null = null;

try {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
    ],
  });
  (client as any).commands = new Collection();
} catch (err) {
  logger.error(err, "Error creando cliente de Discord");
  process.exit(1);
}

async function loadCommands() {
  try {
    const commandsPath = join(__dirname, "commands");
    if (!existsSyncCheck(commandsPath)) {
      logger.warn("No se encontró directorio de comandos");
      return;
    }
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
  } catch (err) {
    logger.error(err, "Error en loadCommands");
  }
}

async function loadEvents() {
  try {
    const eventsPath = join(__dirname, "events");
    if (!existsSyncCheck(eventsPath)) {
      logger.warn("No se encontró directorio de eventos");
      return;
    }
    const eventFiles = readdirSync(eventsPath).filter(
      (f) => f.endsWith(".ts") || f.endsWith(".js")
    );
    for (const file of eventFiles) {
      try {
        const filePath = pathToFileURL(join(eventsPath, file)).href;
        const event = await import(filePath);
        if (event.once) {
          client!.once(event.name, (...args: unknown[]) => {
            try {
              event.execute(...args);
            } catch (err) {
              logger.error({ err, file }, "Error en evento once");
            }
          });
        } else {
          client!.on(event.name, (...args: unknown[]) => {
            try {
              event.execute(...args);
            } catch (err) {
              logger.error({ err, file }, "Error en evento");
            }
          });
        }
      } catch (err) {
        logger.error({ err, file }, "Error cargando evento");
      }
    }
  } catch (err) {
    logger.error(err, "Error en loadEvents");
  }
}

function existsSyncCheck(p: string) {
  try {
    return readdirSync(p) !== undefined;
  } catch {
    return false;
  }
}

function startHealthServer() {
  const port = parseInt(process.env.PORT ?? "8082", 10);
  const server = createServer((req, res) => {
    if (req.url === "/healthz" || req.url === "/discord-bot/healthz") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          bot: client?.user?.tag ?? "connecting",
        })
      );
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    }
  });
  server.listen(port, "0.0.0.0", () => {
    logger.info(`Health server escuchando en puerto ${port}`);
  });
}

async function main() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    logger.error("DISCORD_TOKEN no está configurado.");
    process.exit(1);
  }

  // Start health server FIRST (before any blocking operations)
  startHealthServer();

  // Initialize DB in the background (non-blocking)
  initDatabase().catch((err) => {
    logger.error(err, "Error en initDatabase (no fatal)");
  });

  await loadCommands();
  await loadEvents();

  if (!client) {
    logger.error("Cliente de Discord no inicializado");
    process.exit(1);
  }
  await client.login(token);
}

// Always start — remove isMain check that may fail under tsx
main().catch((err) => {
  logger.error(err, "Error fatal al iniciar el bot");
  process.exit(1);
});
