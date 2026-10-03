import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to start the API.');
}

const useSsl =
  process.env.DATABASE_SSL === 'true' ||
  process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep this small for a single API instance; use Render's pool URL if scaling.
  max: Number(process.env.DATABASE_MAX_CLIENTS ?? 10),
  // Render Postgres requires SSL. Local Docker/Postgres usually does not.
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;
