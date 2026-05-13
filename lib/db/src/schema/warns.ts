import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const warningsTable = pgTable("warnings", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  moderatorId: text("moderator_id"),
  moderatorTag: text("moderator_tag").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Warning = typeof warningsTable.$inferSelect;
