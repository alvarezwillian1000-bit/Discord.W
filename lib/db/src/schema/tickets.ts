import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  channelId: text("channel_id").notNull(),
  discordUserId: text("discord_user_id").notNull(),
  discordUserTag: text("discord_user_tag").notNull(),
  robloxUsername: text("roblox_username").notNull(),
  robloxProfileUrl: text("roblox_profile_url"),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Ticket = typeof ticketsTable.$inferSelect;
