import { db } from "@workspace/db";
import { userLevelsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { logger } from "../utils/logger.js";

export function xpForNextLevel(level: number): number {
  return 5 * level * level + 50 * level + 100;
}

export function getLevelFromXP(xp: number): number {
  let level = 0;
  let total = 0;
  while (total + xpForNextLevel(level) <= xp) {
    total += xpForNextLevel(level);
    level++;
  }
  return level;
}

export function getXPProgress(xp: number): { level: number; currentXP: number; neededXP: number; percent: number } {
  let level = 0;
  let total = 0;
  while (total + xpForNextLevel(level) <= xp) {
    total += xpForNextLevel(level);
    level++;
  }
  const currentXP = xp - total;
  const neededXP = xpForNextLevel(level);
  const percent = Math.floor((currentXP / neededXP) * 100);
  return { level, currentXP, neededXP, percent };
}

export function buildProgressBar(percent: number, length = 14): string {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

export function getLevelColor(level: number): number {
  if (level >= 50) return 0xff0000;
  if (level >= 30) return 0xffd700;
  if (level >= 20) return 0x9b59b6;
  if (level >= 10) return 0x3498db;
  return 0x57f287;
}

export function getLevelTier(level: number): string {
  if (level >= 50) return "🔴 Leyenda";
  if (level >= 30) return "🟡 Experto";
  if (level >= 20) return "🟣 Guerrero";
  if (level >= 10) return "🔵 Aprendiz";
  return "🟢 Novato";
}

const XP_COOLDOWN_MS = 60_000;
const XP_MIN = 15;
const XP_MAX = 25;

export async function handleMessageXP(
  guildId: string,
  userId: string,
  onLevelUp?: (newLevel: number, xp: number) => void
): Promise<void> {
  try {
    const [row] = await db
      .select()
      .from(userLevelsTable)
      .where(and(eq(userLevelsTable.guildId, guildId), eq(userLevelsTable.userId, userId)))
      .limit(1);

    const now = new Date();

    if (row?.lastXpAt && now.getTime() - row.lastXpAt.getTime() < XP_COOLDOWN_MS) {
      await db
        .update(userLevelsTable)
        .set({ totalMessages: sql`${userLevelsTable.totalMessages} + 1` })
        .where(eq(userLevelsTable.id, row.id));
      return;
    }

    const gain = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
    const prevXP = row?.xp ?? 0;
    const newXP = prevXP + gain;
    const prevLevel = getLevelFromXP(prevXP);
    const newLevel = getLevelFromXP(newXP);

    if (row) {
      await db
        .update(userLevelsTable)
        .set({
          xp: newXP,
          level: newLevel,
          totalMessages: sql`${userLevelsTable.totalMessages} + 1`,
          lastXpAt: now,
        })
        .where(eq(userLevelsTable.id, row.id));
    } else {
      await db.insert(userLevelsTable).values({
        guildId,
        userId,
        xp: newXP,
        level: newLevel,
        totalMessages: 1,
        lastXpAt: now,
      });
    }

    if (newLevel > prevLevel && onLevelUp) {
      onLevelUp(newLevel, newXP);
    }
  } catch (err) {
    logger.error(err, "Error procesando XP de mensaje");
  }
}

export async function getUserLevel(guildId: string, userId: string) {
  const [row] = await db
    .select()
    .from(userLevelsTable)
    .where(and(eq(userLevelsTable.guildId, guildId), eq(userLevelsTable.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function getLeaderboard(guildId: string, limit = 10) {
  return db
    .select()
    .from(userLevelsTable)
    .where(eq(userLevelsTable.guildId, guildId))
    .orderBy(desc(userLevelsTable.xp))
    .limit(limit);
}

export async function getRank(guildId: string, userId: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS rank
    FROM user_levels
    WHERE guild_id = ${guildId}
      AND xp > (
        SELECT COALESCE(xp, 0)
        FROM user_levels
        WHERE guild_id = ${guildId} AND user_id = ${userId}
        LIMIT 1
      )
  `);
  return ((result.rows[0] as any)?.rank ?? 0) + 1;
}

export async function addXP(guildId: string, userId: string, amount: number): Promise<{ newXP: number; newLevel: number; leveledUp: boolean }> {
  const [row] = await db
    .select()
    .from(userLevelsTable)
    .where(and(eq(userLevelsTable.guildId, guildId), eq(userLevelsTable.userId, userId)))
    .limit(1);

  const prevXP = row?.xp ?? 0;
  const newXP = Math.max(0, prevXP + amount);
  const prevLevel = getLevelFromXP(prevXP);
  const newLevel = getLevelFromXP(newXP);

  if (row) {
    await db
      .update(userLevelsTable)
      .set({ xp: newXP, level: newLevel })
      .where(eq(userLevelsTable.id, row.id));
  } else {
    await db.insert(userLevelsTable).values({
      guildId, userId, xp: newXP, level: newLevel, totalMessages: 0,
    });
  }

  return { newXP, newLevel, leveledUp: newLevel > prevLevel };
}
