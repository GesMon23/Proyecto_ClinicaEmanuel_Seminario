// Utilidades de las pruebas de integración. Corren contra la base configurada en backend/.env, pero cada
// prueba usa una transacción que SIEMPRE se revierte, así que no dejan datos ni tocan los existentes.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
// Las pruebas firman sus propios tokens: basta un secreto cualquiera si el .env no lo define
process.env.JWT_SECRET ??= 'secreto_de_prueba';

const assert = require('node:assert/strict');
const pool = require('../db/pool');

// Ejecuta fn(client) dentro de una transacción que se revierte al terminar
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await fn(client);
  } finally {
    try { await client.query('ROLLBACK'); } catch (_) { /* conexión perdida */ }
    client.release();
  }
}

let seq = 0;

// CALL con refcursor: devuelve las filas
async function cursor(c, sql, params = []) {
  const name = `cur_test_${++seq}`;
  await c.query(sql, [...params, name]);
  return (await c.query(`FETCH ALL FROM "${name}"`)).rows;
}

// Espera que la consulta falle con un mensaje que cumpla `patron`, sin abortar la transacción de la prueba
async function rechaza(c, sql, params, patron) {
  await c.query('SAVEPOINT rechazo');
  await assert.rejects(c.query(sql, params), patron);
  await c.query('ROLLBACK TO SAVEPOINT rechazo');
}

// Paciente de prueba (dentro de la transacción)
async function paciente(c, { jornada = 1, inicio = null, fin = null } = {}) {
  const noaf = `T${Math.floor(Math.random() * 1e12)}`;
  await c.query(
    `INSERT INTO tbl_pacientes (no_afiliacion, primer_nombre, primer_apellido, id_jornada,
                                inicio_prest_servicios, fin_prest_servicios, id_estado)
     VALUES ($1, 'PRUEBA', 'TEST', $2, $3, $4, 1)`,
    [noaf, jornada, inicio, fin]
  );
  return noaf;
}

async function clinicaHemodialisis(c) {
  const r = await c.query(
    `SELECT descripcion FROM tbl_clinica
      WHERE translate(upper(descripcion), 'ÁÉÍÓÚ', 'AEIOU') = 'HEMODIALISIS'`
  );
  return r.rows[0].descripcion;
}

// Crea un turno con sp_crear_turno_t (estado inicial Creada) y devuelve su id
async function crearTurno(c, noaf, clinica, fechaSql = 'CURRENT_DATE') {
  const antes = new Set((await c.query('SELECT id_turno FROM tbl_turnos WHERE no_afiliacion = $1', [noaf])).rows.map((r) => r.id_turno));
  await c.query(`CALL sp_crear_turno_t($1, $2, ${fechaSql}, NULL)`, [noaf, clinica]);
  const despues = (await c.query('SELECT id_turno FROM tbl_turnos WHERE no_afiliacion = $1', [noaf])).rows;
  return despues.map((r) => r.id_turno).find((id) => !antes.has(id));
}

async function estadoDe(c, idTurno) {
  const r = await c.query(
    `SELECT es.descripcion FROM tbl_turnos t JOIN tbl_estados_turno es USING (id_estado_turno) WHERE t.id_turno = $1`,
    [idTurno]
  );
  return r.rows[0] && r.rows[0].descripcion;
}

async function hoy(c) {
  return (await c.query(`SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS d`)).rows[0].d;
}

async function fechasDeTurnos(c, noaf, estado) {
  const r = await c.query(
    `SELECT to_char(t.fecha_turno, 'YYYY-MM-DD') AS d, extract(isodow FROM t.fecha_turno)::int AS dow
       FROM tbl_turnos t JOIN tbl_estados_turno es USING (id_estado_turno)
      WHERE t.no_afiliacion = $1 AND es.descripcion = $2 ORDER BY t.fecha_turno`,
    [noaf, estado]
  );
  return r.rows;
}

module.exports = { assert, pool, tx, cursor, rechaza, paciente, clinicaHemodialisis, crearTurno, estadoDe, hoy, fechasDeTurnos };
