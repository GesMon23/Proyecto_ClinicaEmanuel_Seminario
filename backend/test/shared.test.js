// Pruebas unitarias de la infraestructura compartida (no requieren base de datos).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'secreto_de_prueba';
// database.js crea el pool al importarse; estas pruebas nunca se conectan, solo necesitan que cargue
process.env.PGDATABASE ??= 'prueba';
process.env.PGUSER ??= 'prueba';
process.env.PGPASSWORD ??= 'prueba';

const auth = require('../src/shared/auth');
const { HttpError, wrap, parseBusinessError } = require('../src/shared/http');
const database = require('../src/shared/database');

const reqCon = (payload, secreto = 'secreto_de_prueba') => ({
  headers: { authorization: `Bearer ${jwt.sign(payload, secreto)}` },
});

test('auth: lee id y nombre del usuario del token', () => {
  const req = reqCon({ sub: 7, nombre_usuario: 'gemonzov' });
  assert.equal(auth.userIdFromRequest(req), 7);
  assert.equal(auth.userNameFromRequest(req), 'gemonzov');
  assert.equal(auth.actorFromRequest(req), 'gemonzov');
});

test('auth: sin token o con token inválido no hay usuario', () => {
  assert.equal(auth.userIdFromRequest({ headers: {} }), null);
  assert.equal(auth.userNameFromRequest({ headers: {} }), null);
  assert.equal(auth.actorFromRequest({ headers: {} }), 'web');
  assert.equal(auth.actorFromRequest({ headers: {} }, 'anon'), 'anon');
  assert.equal(auth.userIdFromRequest(reqCon({ sub: 7 }, 'otro_secreto')), null);
});

test('auth: requireUser responde 401 sin sesión y deja userId con sesión', () => {
  let status; let body;
  const res = { status(s) { status = s; return this; }, json(b) { body = b; } };
  let siguio = false;
  auth.requireUser({ headers: {} }, res, () => { siguio = true; });
  assert.equal(status, 401);
  assert.equal(body.success, false);
  assert.equal(siguio, false);

  const req = reqCon({ sub: 3 });
  auth.requireUser(req, res, () => { siguio = true; });
  assert.equal(siguio, true);
  assert.equal(req.userId, 3);
});

test('http: parseBusinessError reconoce CODIGO: mensaje', () => {
  const r = parseBusinessError(new Error('TURNO_NO_DISPONIBLE: ya lo llamó otro usuario'), ['TURNO_NO_DISPONIBLE']);
  assert.deepEqual(r, { codigo: 'TURNO_NO_DISPONIBLE', mensaje: 'ya lo llamó otro usuario' });
  assert.equal(parseBusinessError(new Error('boom'), ['TURNO_NO_DISPONIBLE']), null);
});

function resFalso() {
  return { status(s) { this.s = s; return this; }, json(b) { this.b = b; return this; } };
}

test('http: wrap responde HttpError tal cual y el resto con el formato del endpoint', async () => {
  const r1 = resFalso();
  await wrap(async () => { throw new HttpError(404, { message: 'no existe' }); })({}, r1);
  assert.equal(r1.s, 404);
  assert.deepEqual(r1.b, { message: 'no existe' });

  const r2 = resFalso();
  await wrap(async () => { throw new Error('falla'); }, (e) => [500, { detalle: e.message }])({}, r2);
  assert.equal(r2.s, 500);
  assert.deepEqual(r2.b, { detalle: 'falla' });

  const r3 = resFalso();
  await wrap(async () => { throw new Error('falla'); })({}, r3);
  assert.deepEqual(r3.b, { detail: 'falla' });
});

test('database: rechaza nombres de procedimiento inválidos (no se interpola SQL)', async () => {
  await assert.rejects(database.callProcedure({ query: async () => {} }, 'sp_x; DROP TABLE x', []), /inválido/);
  await assert.rejects(database.fetchCursor({ query: async () => {} }, "sp_x(); --", []), /inválido/);
});

test('database: callProcedure arma CALL con parámetros posicionales', async () => {
  const llamadas = [];
  const cliente = { query: async (sql, params) => { llamadas.push([sql, params]); return { rows: [] }; } };
  await database.callProcedure(cliente, 'sp_prueba', ['a', 2, null]);
  assert.deepEqual(llamadas[0], ['CALL sp_prueba($1, $2, $3)', ['a', 2, null]]);
});

test('database: fetchCursor pasa el nombre del cursor y lee sus filas', async () => {
  const llamadas = [];
  const cliente = {
    query: async (sql, params) => { llamadas.push([sql, params]); return { rows: sql.startsWith('FETCH') ? [{ x: 1 }] : [] }; },
  };
  const filas = await database.fetchCursor(cliente, 'sp_lista', ['clinica'], 'mi_cursor');
  assert.deepEqual(filas, [{ x: 1 }]);
  assert.deepEqual(llamadas[0], ['CALL sp_lista($1, $2)', ['clinica', 'mi_cursor']]);
  assert.equal(llamadas[1][0], 'FETCH ALL FROM "mi_cursor"');
});
