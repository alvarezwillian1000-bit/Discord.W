import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const suggestionsTable = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  messageId: text("message_id").notNull(),
  channelId: text("channel_id").notNull(),
  discordUserId: text("discord_user_id").notNull(),
  discordUserTag: text("discord_user_tag").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Suggestion = typeof suggestionsTable.$inferSelect;
