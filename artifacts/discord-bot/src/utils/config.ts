import { db, guildConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getGuildConfigJson, setGuildConfigJson } from "./db-json.js";
import { logger } from "./logger.js";

export type { GuildConfig } from "@workspace/db";

export async function getGuildConfig(guildId: string) {
  try {
    const rows = await db
      .select()
      .from(guildConfigTable)
      .where(eq(guildConfigTable.guildId, guildId))
      .limit(1);

    if (rows.length === 0) return { guildId } as import("@workspace/db").GuildConfig;
    return rows[0];
  } catch {
    const cfg = await getGuildConfigJson(guildId);
    return cfg as import("@workspace/db").GuildConfig;
  }
}

export async function setGuildConfig(
  guildId: string,
  update: Partial<Omit<import("@workspace/db").GuildConfig, "guildId">>
): Promise<void> {
  try {
    await db
      .insert(guildConfigTable)
      .values({ guildId, ...update })
      .onConflictDoUpdate({
        target: guildConfigTable.guildId,
        set: update,
      });
  } catch {
    await setGuildConfigJson(guildId, update);
  }
}
