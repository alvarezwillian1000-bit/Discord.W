import { pgTable, text } from "drizzle-orm/pg-core";

export const guildConfigTable = pgTable("guild_config", {
  guildId: text("guild_id").primaryKey(),
  welcomeChannelId: text("welcome_channel_id"),
  verifiedRoleId: text("verified_role_id"),
  verifiedRoleId2: text("verified_role_id_2"),
  verificationChannelId: text("verification_channel_id"),
  ticketsChannelId: text("tickets_channel_id"),
  ticketCategoryId: text("ticket_category_id"),
  generalAdminRoles: text("general_admin_roles").array(),
  staffCmdRoles: text("staff_cmd_roles").array(),
  sorteoRoles: text("sorteo_roles").array(),
  announcementRoles: text("announcement_roles").array(),
  sugerenciasChannelId: text("sugerencias_channel_id"),
  bugsChannelId: text("bugs_channel_id"),
  iaChannelId: text("ia_channel_id"),
  iaBotName: text("ia_bot_name"),
  iaPersonality: text("ia_personality"),
  generalChannelId: text("general_channel_id"),
  xpChannelId: text("xp_channel_id"),
  economyChannelId: text("economy_channel_id"),
  coinName: text("coin_name"),
  dungeonChannelId: text("dungeon_channel_id"),
});

export type GuildConfig = typeof guildConfigTable.$inferSelect;
export type InsertGuildConfig = typeof guildConfigTable.$inferInsert;
