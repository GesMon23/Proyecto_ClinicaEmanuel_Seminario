const { Pool } = require('pg');

// Único pool compartido en toda la app
// Config utilizable con variables de entorno o valores por defecto de desarrollo
const pool = new Pool({
  host: process.env.PGHOST || '172.235.145.142',
  database: process.env.PGDATABASE || 'seminarioclinic',
  user: process.env.PGUSER || 'seminario',
  password: process.env.PGPASSWORD || 'seminario321_0',
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  max: process.env.PGPOOL_MAX ? Number(process.env.PGPOOL_MAX) : 10,
  idleTimeoutMillis: 30000,
});

module.exports = pool;
