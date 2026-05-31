import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Construct connection URL if not provided directly
const getConnectionString = (): string => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const name = process.env.DB_NAME || 'postgres';

  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
};

const connectionString = getConnectionString();

// Supabase poolers and direct connections often require SSL
const isSupabase = connectionString.includes('supabase.co') || connectionString.includes('supabase.com');

const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  max: 10, // Keep pool size small to avoid exhausting Supabase limits
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

export default pool;
