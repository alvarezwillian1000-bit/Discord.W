import { pool } from '@workspace/db';
import { logger } from './utils/logger.js';

let dbAvailable = false;

export function isDbAvailable() {
  return dbAvailable;
}

const TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS guild_config (
    guild_id text PRIMARY KEY,
    welcome_channel_id text,
    verified_role_id text,
    tickets_channel_id text,
    ticket_category_id text,
    general_admin_roles text[],
    staff_cmd_roles text[],
    sorteo_roles text[],
    announcement_roles text[],
    sugerencias_channel_id text,
    bugs_channel_id text,
    ia_channel_id text,
    ia_bot_name text,
    ia_personality text,
    general_channel_id text,
    xp_channel_id text,
    economy_channel_id text,
    coin_name text,
    dungeon_channel_id text
  )`,
  `CREATE TABLE IF NOT EXISTS user_economy (
    id serial PRIMARY KEY,
    guild_id text NOT NULL,
    user_id text NOT NULL,
    coins integer NOT NULL DEFAULT 0,
    bank integer NOT NULL DEFAULT 0,
    total_earned integer NOT NULL DEFAULT 0,
    last_daily_at timestamp,
    last_work_at timestamp,
    last_rob_at timestamp,
    CONSTRAINT user_economy_guildId_userId_unique UNIQUE (guild_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_levels (
    id serial PRIMARY KEY,
    guild_id text NOT NULL,
    user_id text NOT NULL,
    xp integer NOT NULL DEFAULT 0,
    level integer NOT NULL DEFAULT 0,
    total_messages integer NOT NULL DEFAULT 0,
    last_xp_at timestamp,
    CONSTRAINT user_levels_guildId_userId_unique UNIQUE (guild_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS warnings (
    id serial PRIMARY KEY,
    guild_id text NOT NULL,
    user_id text NOT NULL,
    moderator_id text,
    moderator_tag text NOT NULL,
    reason text NOT NULL,
    created_at timestamp DEFAULT NOW() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS verifications (
    id serial PRIMARY KEY,
    guild_id text NOT NULL,
    discord_user_id text NOT NULL,
    discord_user_tag text NOT NULL,
    roblox_username text NOT NULL,
    roblox_user_id text NOT NULL,
    roblox_profile_url text,
    created_at timestamp DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS tickets (
    id serial PRIMARY KEY,
    guild_id text NOT NULL,
    channel_id text NOT NULL,
    discord_user_id text NOT NULL,
    discord_user_tag text NOT NULL,
    roblox_username text NOT NULL,
    roblox_profile_url text,
    reason text NOT NULL,
    status text NOT NULL DEFAULT 'open',
    closed_at timestamp,
    created_at timestamp DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS bug_reports (
    id serial PRIMARY KEY,
    guild_id text NOT NULL,
    message_id text NOT NULL,
    channel_id text NOT NULL,
    discord_user_id text NOT NULL,
    discord_user_tag text NOT NULL,
    description text NOT NULL,
    steps text,
    device text,
    created_at timestamp DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS suggestions (
    id serial PRIMARY KEY,
    guild_id text NOT NULL,
    message_id text NOT NULL,
    channel_id text NOT NULL,
    discord_user_id text NOT NULL,
    discord_user_tag text NOT NULL,
    content text NOT NULL,
    created_at timestamp DEFAULT NOW()
  )`,
];

export async function initDatabase(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL ?? '';
  let host = '(desconocido)';
  try {
    host = new URL(dbUrl).hostname;
  } catch {}

  logger.info({ host }, 'Intentando conectar a la base de datos...');

  try {
    // Test connectivity first
    await pool.query('SELECT 1');
  } catch (err: any) {
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      logger.error(
        { host, code: err.code },
        '=== ERROR DE BASE DE DATOS ===' +
        ' No se puede resolver el hostname de PostgreSQL.' +
        ' En Railway, ve al servicio del bot -> Variables' +
        ' y cambia DATABASE_URL por el valor de DATABASE_PUBLIC_URL' +
        ' que encuentras en el servicio de Postgres.'
      );
      return;
    }
    logger.error({ err: err.message }, 'Error conectando a la base de datos');
    return;
  }

  // Create tables
  for (const sql of TABLES) {
    try {
      await pool.query(sql);
    } catch (err: any) {
      if (err.code === '42P07') continue;
      if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') break;
      logger.warn({ err: err.message }, 'Advertencia creando tabla');
    }
  }

  dbAvailable = true;
  logger.info({ host }, 'Base de datos inicializada correctamente');
}
