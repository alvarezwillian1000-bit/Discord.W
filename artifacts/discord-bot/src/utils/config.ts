import { db } from "@workspace/db";
import { guildConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type { GuildConfig } from "@workspace/db";

export async function getGuildConfig(guildId: string) {
  const rows = await db
    .select()
    .from(guildConfigTable)
    .where(eq(guildConfigTable.guildId, guildId))
    .limit(1);

  if (rows.length === 0) return { guildId } as import("@workspace/db").GuildConfig;
  return rows[0];
}

export async function setGuildConfig(
  guildId: string,
  update: Partial<Omit<import("@workspace/db").GuildConfig, "guildId">>
): Promise<void> {
  await db
    .insert(guildConfigTable)
    .values({ guildId, ...update })
    .onConflictDoUpdate({
      target: guildConfigTable.guildId,
      set: update,
    });
}
