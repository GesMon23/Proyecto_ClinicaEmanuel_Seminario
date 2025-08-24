const { Pool } = require('pg');

// Único pool compartido en toda la app
// Config utilizable con variables de entorno o valores por defecto de desarrollo
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'db_clinicaemanuel',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'root',
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  max: process.env.PGPOOL_MAX ? Number(process.env.PGPOOL_MAX) : 10,
  idleTimeoutMillis: 30000,
});

module.exports = pool;
