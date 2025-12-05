import { defineConfig } from 'drizzle-kit';

// Use Replit PostgreSQL connection
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

export default defineConfig({
  schema: './shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
  migrations: {
    table: 'drizzle_migrations',
    schema: 'public'
  }
});
