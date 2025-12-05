import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Get database URL from Replit PostgreSQL
const getDatabaseUrl = () => {
  // If DATABASE_URL is set and not pointing to Supabase, use it
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('supabase')) {
    return process.env.DATABASE_URL;
  }
  
  // Otherwise, construct from PG* environment variables
  const { PGUSER, PGPASSWORD, PGHOST, PGPORT, PGDATABASE } = process.env;
  if (PGUSER && PGPASSWORD && PGHOST && PGPORT && PGDATABASE) {
    return `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
  }
  
  throw new Error('Database credentials not found. Please ensure Replit PostgreSQL is configured.');
};

const databaseUrl = getDatabaseUrl();
const client = postgres(databaseUrl);
export const db = drizzle({ client, schema });
