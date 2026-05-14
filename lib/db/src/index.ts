import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export const dbAvailable = !!process.env.DATABASE_URL;

if (!dbAvailable) {
  console.warn("[db] DATABASE_URL no está configurado. Las operaciones de base de datos usarán fallback.");
}

export const pool = dbAvailable
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : (null as any);

export const db = dbAvailable
  ? drizzle(pool, { schema })
  : (null as any);

export * from "./schema";
