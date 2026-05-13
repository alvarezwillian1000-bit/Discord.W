import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const userEconomyTable = pgTable("user_economy", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  coins: integer("coins").notNull().default(0),
  bank: integer("bank").notNull().default(0),
  totalEarned: integer("total_earned").notNull().default(0),
  lastDailyAt: timestamp("last_daily_at"),
  lastWorkAt: timestamp("last_work_at"),
  lastRobAt: timestamp("last_rob_at"),
}, (t) => [unique().on(t.guildId, t.userId)]);

export type UserEconomy = typeof userEconomyTable.$inferSelect;
