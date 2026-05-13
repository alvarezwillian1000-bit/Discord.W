import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const verificationsTable = pgTable("verifications", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  discordUserId: text("discord_user_id").notNull(),
  discordUserTag: text("discord_user_tag").notNull(),
  robloxUsername: text("roblox_username").notNull(),
  robloxUserId: text("roblox_user_id").notNull(),
  robloxProfileUrl: text("roblox_profile_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Verification = typeof verificationsTable.$inferSelect;
