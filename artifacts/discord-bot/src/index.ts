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

// Export client at module level so giveaways.ts and others can import it
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

  // Start health server FIRST so Railway doesn't kill us during DB connection
  startHealthServer();

  // Init DB non-blocking — fallback to JSON if Postgres unavailable
  initDatabase().catch((err) => {
    logger.error(err, "Error en initDatabase (no fatal)");
  });

  await loadCommands();
  await loadEvents();
  await client.login(token);
}

main().catch((err) => {
  logger.error(err, "Error fatal al iniciar el bot");
  process.exit(1);
});
