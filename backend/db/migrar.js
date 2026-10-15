// Aplica en orden las migraciones de db/migraciones (NNN_nombre.sql) que la base todavía no tiene.
// Cada una corre en su propia transacción y queda registrada en public.schema_migraciones.
//
// Base existente sin registro (creada antes de este sistema con el esquema reconstruido): la 001 se
// registra como "línea base" sin ejecutarse y se aplican las siguientes.
//
// Uso: node db/migrar.js   (el contenedor del backend lo corre antes de arrancar)
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, 'migraciones');
const CANDADO = 7270011; // pg_advisory_lock: dos procesos no migran a la vez
const ARCHIVO = /^(\d{3})_[\w-]+\.sql$/;

function leerMigraciones(dir = DIR) {
  return fs.readdirSync(dir)
    .filter((f) => ARCHIVO.test(f))
    .sort()
    .map((archivo) => {
      // Sin \r: el mismo archivo da el mismo hash en Windows y en Linux
      const sql = fs.readFileSync(path.join(dir, archivo), 'utf8').replace(/\r\n/g, '\n');
      return { version: archivo.slice(0, 3), archivo, sql, hash: crypto.createHash('sha256').update(sql).digest('hex') };
    });
}

async function migrar(pool, { dir = DIR, log = console.log } = {}) {
  const migraciones = leerMigraciones(dir);
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [CANDADO]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migraciones (
        version text PRIMARY KEY,
        archivo text NOT NULL,
        hash text NOT NULL,
        linea_base boolean NOT NULL DEFAULT false,
        aplicada_en timestamptz NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query('SELECT version, archivo, hash FROM public.schema_migraciones');
    const aplicadas = new Map(rows.map((r) => [r.version, r]));

    if (aplicadas.size === 0 && migraciones.length) {
      const { rows: [{ existe }] } = await client.query("SELECT to_regclass('public.tbl_pacientes') IS NOT NULL AS existe");
      if (existe) {
        const base = migraciones[0];
        await client.query(
          'INSERT INTO public.schema_migraciones (version, archivo, hash, linea_base) VALUES ($1, $2, $3, true)',
          [base.version, base.archivo, base.hash]);
        aplicadas.set(base.version, base);
        log(`[migraciones] base existente: ${base.archivo} registrada como línea base (no se ejecutó)`);
      }
    }

    // Una migración ya aplicada no se edita: los cambios van en una nueva
    for (const m of migraciones) {
      const previa = aplicadas.get(m.version);
      if (previa && previa.hash !== m.hash) {
        throw new Error(`La migración ${m.archivo} cambió después de aplicarse; crea una nueva en lugar de editarla`);
      }
    }

    const pendientes = migraciones.filter((m) => !aplicadas.has(m.version));
    for (const m of pendientes) {
      await client.query('BEGIN');
      try {
        await client.query(m.sql);
        await client.query('INSERT INTO public.schema_migraciones (version, archivo, hash) VALUES ($1, $2, $3)', [m.version, m.archivo, m.hash]);
        await client.query('COMMIT');
        log(`[migraciones] aplicada ${m.archivo}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Falló ${m.archivo}: ${err.message}`);
      }
    }
    if (!pendientes.length) log('[migraciones] la base está al día');
    return pendientes.map((m) => m.archivo);
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [CANDADO]).catch(() => {});
    client.release();
  }
}

module.exports = { migrar, leerMigraciones };

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
  const pool = require('./pool');
  migrar(pool)
    .then(() => pool.end())
    .catch((err) => {
      console.error(`[migraciones] ${err.message}`);
      pool.end().finally(() => process.exit(1));
    });
}
