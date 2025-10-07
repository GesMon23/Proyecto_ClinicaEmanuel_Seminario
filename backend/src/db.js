const pool = require('../db/pool');

/**
 * Ejecuta una función dentro de una transacción estableciendo el usuario de la app
 * en la variable de sesión app.current_user para que los triggers de auditoría
 * lo capturen correctamente.
 *
 * @param {string} userName - nombre de usuario logueado (ej. req.user.nombre_usuario)
 * @param {(client: import('pg').PoolClient) => Promise<any>} fn - callback con el cliente
 * @returns {Promise<any>} - resultado del callback
 */
async function runWithUser(userName, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Establecemos el usuario actual de la app sólo para esta transacción
    // Usamos set_config para evitar problemas de parser con nombres de GUC
    await client.query('SELECT set_config($1, $2, true)', ['app.current_user', String(userName || 'anon')]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { pool, runWithUser };
