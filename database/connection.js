const { Pool } = require('pg');
require('dotenv').config();
// Configuración de la conexión a PostgreSQL
const dbConfig = {
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'lms',
  password: process.env.PGPASSWORD || 'password',
  port: parseInt(process.env.PGPORT) || 5432,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Crear pool de conexiones
const pool = new Pool(dbConfig);

// Manejar eventos del pool
pool.on('connect', () => {
  console.log('🗄️  Nueva conexión establecida con PostgreSQL');
});

pool.on('error', (err) => {
  console.log('dbConfig ', dbConfig)
  console.error('❌ Error inesperado en el pool de conexiones:', err);
});

// Función para ejecutar consultas
const query = async (text, params) => {
  const start = Date.now();
  const client = await pool.connect();
  
  try {
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.LOG_QUERIES === 'true') {
      console.log('📊 Query ejecutada:', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (error) {
    console.error('❌ Error en consulta SQL:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Función para transacciones
const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Función para verificar conexión
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Conexión a PostgreSQL exitosa');
    console.log('🕐 Tiempo servidor:', result.rows[0].current_time);
    console.log('🗃️  Versión PostgreSQL:', result.rows[0].db_version.split(' ')[0]);
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con PostgreSQL 2:', error);
    return false;
  }
};

// Función para cerrar pool (útil para tests)
const close = async () => {
  await pool.end();
  console.log('🔌 Pool de conexiones cerrado');
};

module.exports = {
  query,
  transaction,
  testConnection,
  close,
  pool
};