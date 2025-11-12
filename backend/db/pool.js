const { Pool } = require('pg');

// Único pool compartido en toda la app
// Usa variables de entorno; por defecto asume PostgreSQL del host (Docker bridge)
const pgHost = process.env.PGHOST || '172.17.0.1';
const ssl =
  process.env.PGSSLMODE && process.env.PGSSLMODE.toLowerCase() !== 'disable'
    ? { rejectUnauthorized: false }
    : false;

const pool = new Pool({
  host: pgHost,
  database: process.env.PGDATABASE || 'seminarioclinic',
  user: process.env.PGUSER || 'seminario',
  password: process.env.PGPASSWORD || 'seminario321_0',
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  max: process.env.PGPOOL_MAX ? Number(process.env.PGPOOL_MAX) : 10,
  idleTimeoutMillis: 30000,
  ssl,
});

module.exports = pool;