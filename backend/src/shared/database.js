const pool = require('../../db/pool');

const NOMBRE_PROCEDIMIENTO = /^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)?$/i;

function assertNombre(nombre) {
  if (!NOMBRE_PROCEDIMIENTO.test(nombre)) {
    throw new Error(`Nombre de procedimiento inválido: ${nombre}`);
  }
}

// Presta un cliente del pool y lo libera siempre
async function withClient(fn) {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

// Ejecuta fn dentro de una transacción (BEGIN/COMMIT, ROLLBACK si falla) en UNA sola conexión.
// Necesario para los procedimientos con refcursor: el cursor solo vive dentro de la transacción.
async function withTransaction(fn) {
  return withClient(async (client) => {
    await client.query('BEGIN');
    try {
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) { /* conexión ya perdida */ }
      throw err;
    }
  });
}

// CALL nombre($1, $2, ...)
async function callProcedure(client, nombre, params = []) {
  assertNombre(nombre);
  const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');
  return client.query(`CALL ${nombre}(${placeholders})`, params);
}

// CALL nombre(params..., cursor) y devuelve las filas del refcursor (patrón INOUT ref refcursor)
async function fetchCursor(client, nombre, params = [], cursor = 'ref_cursor') {
  await callProcedure(client, nombre, [...params, cursor]);
  const result = await client.query(`FETCH ALL FROM "${cursor}"`);
  return result.rows;
}

module.exports = { pool, withClient, withTransaction, callProcedure, fetchCursor };
