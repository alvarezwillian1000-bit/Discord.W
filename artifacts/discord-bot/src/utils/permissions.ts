import { type GuildMember, PermissionFlagsBits } from "discord.js";
import { getGuildConfig } from "./config.js";

export type PermissionLevel = "general" | "staff" | "sorteo" | "anuncio";

export async function hasPermission(
  member: GuildMember,
  level: PermissionLevel
): Promise<boolean> {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  const config = await getGuildConfig(member.guild.id);
  const memberRoleIds = [...member.roles.cache.keys()];

  const generalRoles = config.generalAdminRoles ?? [];
  const hasGeneral =
    generalRoles.length > 0 && memberRoleIds.some((r) => generalRoles.includes(r));

  if (level === "general") return hasGeneral;

  if (level === "staff") {
    const staffRoles = config.staffCmdRoles ?? [];
    return (
      hasGeneral ||
      (staffRoles.length > 0 && memberRoleIds.some((r) => staffRoles.includes(r)))
    );
  }

  if (level === "sorteo") {
    const sorteoRoles = config.sorteoRoles ?? [];
    return (
      hasGeneral ||
      (sorteoRoles.length > 0 && memberRoleIds.some((r) => sorteoRoles.includes(r)))
    );
  }

  if (level === "anuncio") {
    const announcementRoles = config.announcementRoles ?? [];
    return (
      hasGeneral ||
      (announcementRoles.length > 0 &&
        memberRoleIds.some((r) => announcementRoles.includes(r)))
    );
  }

  return false;
}
