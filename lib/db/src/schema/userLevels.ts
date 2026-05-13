import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const userLevelsTable = pgTable("user_levels", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(0),
  totalMessages: integer("total_messages").notNull().default(0),
  lastXpAt: timestamp("last_xp_at"),
}, (t) => [unique().on(t.guildId, t.userId)]);

export type UserLevel = typeof userLevelsTable.$inferSelect;
