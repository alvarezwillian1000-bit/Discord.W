import { Events, type Client } from "discord.js";
import { logger } from "../utils/logger.js";

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client) {
  logger.info(`✅ Bot conectado como ${client.user?.tag}`);
}
