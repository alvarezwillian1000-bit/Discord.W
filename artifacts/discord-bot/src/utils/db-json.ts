import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { logger } from "./logger.js";

const DATA_DIR = process.env.JSON_DATA_DIR ?? "/app/data";

try {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {
  logger.error({ err: e }, "No se pudo crear el directorio de datos JSON");
}

export function readJson<T>(name: string, fallback: T): T {
  const path = join(DATA_DIR, `${name}.json`);
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(name: string, data: unknown): void {
  const path = join(DATA_DIR, `${name}.json`);
  try {
    writeFileSync(path, JSON.stringify(data, null, 2));
  } catch (e) {
    logger.error({ err: e }, "Error escribiendo JSON");
  }
}

// ===== Guild Config =====
export async function getGuildConfigJson(guildId: string) {
  const all = readJson<Record<string, any>>("guildConfig", {});
  return all[guildId] ?? { guildId };
}

export async function setGuildConfigJson(
  guildId: string,
  update: Record<string, any>
): Promise<void> {
  const all = readJson<Record<string, any>>("guildConfig", {});
  all[guildId] = { ...(all[guildId] ?? { guildId }), ...update };
  writeJson("guildConfig", all);
}

// ===== Economy =====
export async function getEconomyJson(guildId: string, userId: string) {
  const all = readJson<Record<string, any>>("economy", {});
  const key = `${guildId}:${userId}`;
  if (!all[key]) {
    all[key] = {
      guildId,
      userId,
      coins: 0,
      bank: 0,
      totalEarned: 0,
      lastDailyAt: null,
      lastWorkAt: null,
      lastRobAt: null,
    };
    writeJson("economy", all);
  }
  return all[key];
}

export async function addCoinsJson(guildId: string, userId: string, amount: number) {
  const all = readJson<Record<string, any>>("economy", {});
  const key = `${guildId}:${userId}`;
  if (!all[key]) {
    all[key] = { guildId, userId, coins: 0, bank: 0, totalEarned: 0 };
  }
  all[key].coins = Math.max(0, (all[key].coins ?? 0) + amount);
  if (amount > 0) all[key].totalEarned = (all[key].totalEarned ?? 0) + amount;
  writeJson("economy", all);
}

export async function updateEconomyFieldJson(
  guildId: string,
  userId: string,
  fields: Record<string, any>
) {
  const all = readJson<Record<string, any>>("economy", {});
  const key = `${guildId}:${userId}`;
  if (!all[key]) {
    all[key] = { guildId, userId, coins: 0, bank: 0, totalEarned: 0 };
  }
  Object.assign(all[key], fields);
  writeJson("economy", all);
}

export async function transferCoinsJson(
  guildId: string,
  fromUserId: string,
  toUserId: string,
  amount: number
): Promise<boolean> {
  const all = readJson<Record<string, any>>("economy", {});
  const fromKey = `${guildId}:${fromUserId}`;
  const toKey = `${guildId}:${toUserId}`;
  if (!all[fromKey]) all[fromKey] = { guildId, userId: fromUserId, coins: 0, bank: 0, totalEarned: 0 };
  if (!all[toKey]) all[toKey] = { guildId, userId: toUserId, coins: 0, bank: 0, totalEarned: 0 };
  if ((all[fromKey].coins ?? 0) < amount) return false;
  all[fromKey].coins -= amount;
  all[toKey].coins = (all[toKey].coins ?? 0) + amount;
  all[toKey].totalEarned = (all[toKey].totalEarned ?? 0) + amount;
  writeJson("economy", all);
  return true;
}

export async function getEconomyLeaderboardJson(guildId: string, limit = 10) {
  const all = readJson<Record<string, any>>("economy", {});
  const entries = Object.values(all)
    .filter((e: any) => e.guildId === guildId)
    .sort((a: any, b: any) => (b.coins + b.bank) - (a.coins + a.bank))
    .slice(0, limit);
  return entries;
}

export async function setBankJson(guildId: string, userId: string, amount: number) {
  const all = readJson<Record<string, any>>("economy", {});
  const key = `${guildId}:${userId}`;
  if (!all[key]) all[key] = { guildId, userId, coins: 0, bank: 0, totalEarned: 0 };
  all[key].bank = amount;
  writeJson("economy", all);
}

export async function setCoinsJson(guildId: string, userId: string, amount: number) {
  const all = readJson<Record<string, any>>("economy", {});
  const key = `${guildId}:${userId}`;
  if (!all[key]) all[key] = { guildId, userId, coins: 0, bank: 0, totalEarned: 0 };
  all[key].coins = Math.max(0, amount);
  writeJson("economy", all);
}

// ===== Warnings =====
export async function addWarningJson(
  guildId: string,
  userId: string,
  moderatorTag: string,
  reason: string
) {
  const all = readJson<Record<string, any[]>>("warnings", {});
  const key = `${guildId}:${userId}`;
  if (!all[key]) all[key] = [];
  all[key].push({
    guildId,
    userId,
    moderatorTag,
    reason,
    createdAt: new Date().toISOString(),
  });
  writeJson("warnings", all);
  return all[key];
}

export async function getWarningsJson(guildId: string, userId: string) {
  const all = readJson<Record<string, any[]>>("warnings", {});
  const key = `${guildId}:${userId}`;
  return (all[key] ?? []).map((w: any) => ({ ...w, createdAt: new Date(w.createdAt) }));
}

export async function clearWarningsJson(guildId: string, userId: string) {
  const all = readJson<Record<string, any[]>>("warnings", {});
  const key = `${guildId}:${userId}`;
  delete all[key];
  writeJson("warnings", all);
}

// ===== Levels =====
export async function getLevelJson(guildId: string, userId: string) {
  const all = readJson<Record<string, any>>("levels", {});
  const key = `${guildId}:${userId}`;
  if (!all[key]) {
    all[key] = { guildId, userId, xp: 0, level: 0, totalMessages: 0, lastXpAt: null };
    writeJson("levels", all);
  }
  return all[key];
}

export async function updateLevelJson(guildId: string, userId: string, update: Partial<any>) {
  const all = readJson<Record<string, any>>("levels", {});
  const key = `${guildId}:${userId}`;
  if (!all[key]) all[key] = { guildId, userId, xp: 0, level: 0, totalMessages: 0, lastXpAt: null };
  Object.assign(all[key], update);
  writeJson("levels", all);
}

export async function getLevelLeaderboardJson(guildId: string, limit = 10) {
  const all = readJson<Record<string, any>>("levels", {});
  return Object.values(all)
    .filter((e: any) => e.guildId === guildId)
    .sort((a: any, b: any) => b.xp - a.xp)
    .slice(0, limit);
}

// ===== Verifications =====
export async function addVerificationJson(data: {
  guildId: string;
  discordUserId: string;
  discordUserTag: string;
  robloxUsername: string;
  robloxUserId: string;
  robloxProfileUrl?: string;
}) {
  const all = readJson<any[]>("verifications", []);
  all.push({ ...data, createdAt: new Date().toISOString() });
  writeJson("verifications", all);
}

export async function getVerificationJson(discordUserId: string) {
  const all = readJson<any[]>("verifications", []);
  return all.filter((v: any) => v.discordUserId === discordUserId);
}

// ===== Tickets =====
export async function addTicketJson(data: {
  guildId: string;
  channelId: string;
  discordUserId: string;
  discordUserTag: string;
  robloxUsername: string;
  robloxProfileUrl?: string;
  reason: string;
  status?: string;
}) {
  const all = readJson<any[]>("tickets", []);
  all.push({ ...data, status: data.status ?? "open", createdAt: new Date().toISOString() });
  writeJson("tickets", all);
}

export async function closeTicketJson(channelId: string) {
  const all = readJson<any[]>("tickets", []);
  const t = all.find((x: any) => x.channelId === channelId);
  if (t) { t.status = "closed"; t.closedAt = new Date().toISOString(); }
  writeJson("tickets", all);
}

// ===== Bug Reports =====
export async function addBugReportJson(data: {
  guildId: string;
  messageId: string;
  channelId: string;
  discordUserId: string;
  discordUserTag: string;
  description: string;
  steps?: string;
  device?: string;
}) {
  const all = readJson<any[]>("bugReports", []);
  all.push({ ...data, createdAt: new Date().toISOString() });
  writeJson("bugReports", all);
}

// ===== Suggestions =====
export async function addSuggestionJson(data: {
  guildId: string;
  messageId: string;
  channelId: string;
  discordUserId: string;
  discordUserTag: string;
  content: string;
}) {
  const all = readJson<any[]>("suggestions", []);
  all.push({ ...data, createdAt: new Date().toISOString() });
  writeJson("suggestions", all);
}
