import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const bugReportsTable = pgTable("bug_reports", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  messageId: text("message_id").notNull(),
  channelId: text("channel_id").notNull(),
  discordUserId: text("discord_user_id").notNull(),
  discordUserTag: text("discord_user_tag").notNull(),
  description: text("description").notNull(),
  steps: text("steps"),
  device: text("device"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BugReport = typeof bugReportsTable.$inferSelect;
