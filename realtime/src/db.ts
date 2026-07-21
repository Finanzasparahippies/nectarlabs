import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// ------------------------------------------------------------------------------
// CONEXIÓN DIRECTA A POSTGRESQL (POOL DE CONEXIONES)
// Este módulo inicializa y exporta un pool de conexiones reutilizables hacia la DB.
// Evita abrir y cerrar conexiones TCP por cada mensaje recibido en WebSockets.
// ------------------------------------------------------------------------------

/**
 * Resuelve la cadena de conexión de base de datos PostgreSQL.
 * Prioriza DATABASE_URL (provista en producción/staging por Supabase),
 * y si no existe, la construye a partir de credenciales individuales del entorno local.
 */
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

// Detectar si estamos conectándonos a Supabase (requiere SSL obligatorio para poolers de transacciones)
const isSupabase = connectionString.includes('supabase.co') || connectionString.includes('supabase.com');

// Inicialización de la piscina de conexiones (pg.Pool)
const pool = new Pool({
  connectionString,
  // Para conexiones a Supabase externas, deshabilitamos la verificación de certificado firmado por CA
  // para permitir la comunicación segura sin necesidad de instalar certificados locales.
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,

  // Matriz de Edge Cases: límites de conexiones para planes gratuitos (Supabase free-tier límite ~20-60)
  max: 10,                          // Límite máximo de clientes en el pool local
  idleTimeoutMillis: 30000,         // Cerrar automáticamente conexiones inactivas tras 30 segundos
  connectionTimeoutMillis: 2000,    // Cancelar el intento si tarda más de 2 segundos (timeout rápido)
});

// Manejador de errores inesperados en conexiones inactivas (evita caídas del proceso Node)
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

export default pool;
