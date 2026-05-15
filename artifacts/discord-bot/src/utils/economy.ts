import { db, userEconomyTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { logger } from "../utils/logger.js";
import {
  getEconomyJson,
  addCoinsJson,
  transferCoinsJson,
  getEconomyLeaderboardJson,
  setBankJson,
  setCoinsJson,
  updateEconomyFieldJson,
} from "./db-json.js";

export async function getEconomy(guildId: string, userId: string) {
  try {
    const [row] = await db
      .select()
      .from(userEconomyTable)
      .where(and(eq(userEconomyTable.guildId, guildId), eq(userEconomyTable.userId, userId)))
      .limit(1);

    if (row) return row;

    const [created] = await db
      .insert(userEconomyTable)
      .values({ guildId, userId })
      .onConflictDoNothing()
      .returning();

    if (created) return created;

    const [fetched] = await db
      .select()
      .from(userEconomyTable)
      .where(and(eq(userEconomyTable.guildId, guildId), eq(userEconomyTable.userId, userId)))
      .limit(1);

    return fetched!;
  } catch {
    return await getEconomyJson(guildId, userId);
  }
}

export async function addCoins(guildId: string, userId: string, amount: number): Promise<void> {
  try {
    await getEconomy(guildId, userId);
    await db
      .update(userEconomyTable)
      .set({
        coins: sql`GREATEST(0, ${userEconomyTable.coins} + ${amount})`,
        totalEarned: amount > 0 ? sql`${userEconomyTable.totalEarned} + ${amount}` : userEconomyTable.totalEarned,
      })
      .where(and(eq(userEconomyTable.guildId, guildId), eq(userEconomyTable.userId, userId)));
  } catch {
    await addCoinsJson(guildId, userId, amount);
  }
}

export async function setCoinsAmount(guildId: string, userId: string, coins: number): Promise<void> {
  try {
    const safeCoins = Math.max(0, coins);
    await getEconomy(guildId, userId);
    await db
      .update(userEconomyTable)
      .set({ coins: safeCoins })
      .where(and(eq(userEconomyTable.guildId, guildId), eq(userEconomyTable.userId, userId)));
  } catch {
    await setCoinsJson(guildId, userId, coins);
  }
}

export async function setBankAmount(guildId: string, userId: string, bank: number): Promise<void> {
  try {
    const safeBank = Math.max(0, bank);
    await getEconomy(guildId, userId);
    await db
      .update(userEconomyTable)
      .set({ bank: safeBank })
      .where(and(eq(userEconomyTable.guildId, guildId), eq(userEconomyTable.userId, userId)));
  } catch {
    await setBankJson(guildId, userId, Math.max(0, bank));
  }
}

export async function updateEconomyTimestamp(
  guildId: string,
  userId: string,
  field: "lastDailyAt" | "lastWorkAt" | "lastRobAt"
): Promise<void> {
  const now = new Date();
  try {
    await db
      .update(userEconomyTable)
      .set({ [field]: now })
      .where(and(eq(userEconomyTable.guildId, guildId), eq(userEconomyTable.userId, userId)));
  } catch {
    await updateEconomyFieldJson(guildId, userId, { [field]: now.toISOString() });
  }
}

export async function transferCoins(
  guildId: string,
  fromUserId: string,
  toUserId: string,
  amount: number
): Promise<boolean> {
  try {
    const from = await getEconomy(guildId, fromUserId);
    if (from.coins < amount) return false;

    await db
      .update(userEconomyTable)
      .set({ coins: sql`${userEconomyTable.coins} - ${amount}` })
      .where(and(eq(userEconomyTable.guildId, guildId), eq(userEconomyTable.userId, fromUserId)));

    await getEconomy(guildId, toUserId);
    await db
      .update(userEconomyTable)
      .set({
        coins: sql`${userEconomyTable.coins} + ${amount}`,
        totalEarned: sql`${userEconomyTable.totalEarned} + ${amount}`,
      })
      .where(and(eq(userEconomyTable.guildId, guildId), eq(userEconomyTable.userId, toUserId)));

    return true;
  } catch {
    return await transferCoinsJson(guildId, fromUserId, toUserId, amount);
  }
}

export async function getEconomyLeaderboard(guildId: string, limit = 10) {
  try {
    return db
      .select()
      .from(userEconomyTable)
      .where(eq(userEconomyTable.guildId, guildId))
      .orderBy(desc(sql`${userEconomyTable.coins} + ${userEconomyTable.bank}`))
      .limit(limit);
  } catch {
    return await getEconomyLeaderboardJson(guildId, limit);
  }
}

export function formatCoins(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M 🪙`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K 🪙`;
  return `${amount} 🪙`;
}

export const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const WORK_COOLDOWN_MS = 4 * 60 * 60 * 1000;
export const ROB_COOLDOWN_MS = 8 * 60 * 60 * 1000;

export function formatCooldown(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const WORK_RESPONSES = [
  { job: "repartidor de pizza", min: 80, max: 180 },
  { job: "streamer", min: 50, max: 300 },
  { job: "mercenario en Roblox", min: 100, max: 200 },
  { job: "moderador de servidor Discord", min: 60, max: 150 },
  { job: "minero de Minecraft", min: 70, max: 170 },
  { job: "pro player de Fortnite", min: 90, max: 250 },
  { job: "influencer de TikTok", min: 40, max: 400 },
  { job: "hacker ético", min: 120, max: 280 },
  { job: "diseñador de skins", min: 80, max: 220 },
  { job: "vendedor de Robux", min: 50, max: 150 },
  { job: "desarrollador de juegos indie", min: 100, max: 350 },
  { job: "comentarista de esports", min: 70, max: 200 },
];
