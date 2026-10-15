const { Pool } = require('pg');

// Único pool compartido en toda la app
// Las credenciales salen SIEMPRE de variables de entorno (ver .env.example); sin ellas no arranca.
// El host por defecto es PostgreSQL del host visto desde Docker (bridge)
const faltantes = ['PGDATABASE', 'PGUSER', 'PGPASSWORD'].filter((v) => !process.env[v]);
if (faltantes.length) {
  throw new Error(`Faltan variables de entorno de la base de datos: ${faltantes.join(', ')}`);
}

const ssl =
  process.env.PGSSLMODE && process.env.PGSSLMODE.toLowerCase() !== 'disable'
    ? { rejectUnauthorized: false }
    : false;

const pool = new Pool({
  host: process.env.PGHOST || '172.17.0.1',
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  max: process.env.PGPOOL_MAX ? Number(process.env.PGPOOL_MAX) : 10,
  idleTimeoutMillis: 30000,
  ssl,
});

module.exports = pool;
