// Registros clínicos: validaciones previas al guardado y formato de error de cada endpoint.
// Solo se ejercitan rutas que NO escriben (validaciones, paciente inexistente/egresado, lecturas).
const { test, before, after } = require('node:test');
const http = require('node:http');
const express = require('express');
const { assert, pool } = require('./helpers');
const registros = require('../src/modules/registros');
const service = require('../src/modules/registros/registros.service');

let servidor;
let puerto;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/nutricion', registros.nutricion);
  app.use('/psicologia', registros.psicologia);
  app.use('/laboratorios', registros.laboratorios);
  app.use(registros.referencias);
  app.use(registros.catalogos);
  servidor = await new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
  puerto = servidor.address().port;
});

after(async () => {
  await new Promise((ok) => servidor.close(ok));
  await pool.end();
});

function pedir(metodo, ruta, cuerpo) {
  return new Promise((ok, fallo) => {
    const datos = cuerpo ? JSON.stringify(cuerpo) : null;
    const req = http.request({
      host: 'localhost', port: puerto, path: ruta, method: metodo,
      headers: datos ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(datos) } : {},
    }, (res) => {
      let b = '';
      res.on('data', (d) => { b += d; });
      res.on('end', () => ok({ status: res.statusCode, body: b ? JSON.parse(b) : null }));
    });
    req.on('error', fallo);
    if (datos) req.write(datos);
    req.end();
  });
}

const INEXISTENTE = 'NO-EXISTE-000';

// Un paciente egresado o fallecido real, si la base tiene alguno
async function pacienteBloqueado() {
  const r = await pool.query(
    `SELECT no_afiliacion FROM tbl_pacientes
      WHERE id_estado = 3 OR id_causa_egreso = 1 LIMIT 1`
  ).catch(() => ({ rows: [] }));
  return r.rows[0]?.no_afiliacion || null;
}

// ------------------------------------------------------------------ unitarias

test('esSi, enteroONulo y textoONulo normalizan la entrada', () => {
  assert.equal(service.esSi('Sí'), true);
  assert.equal(service.esSi(' si '), true);
  assert.equal(service.esSi('No'), false);
  assert.equal(service.esSi(true), true);
  assert.equal(service.esSi(undefined), false);
  assert.equal(service.enteroONulo('12'), 12);
  assert.equal(service.enteroONulo(''), null);
  assert.equal(service.enteroONulo('abc'), null);
  assert.equal(service.textoONulo('  hola '), 'hola');
  assert.equal(service.textoONulo('   '), null);
});

// ------------------------------------------------------------------ HTTP

test('nutrición: paciente inexistente responde 404 con { error }', async () => {
  const r = await pedir('POST', '/nutricion/evaluacion', { no_afiliacion: INEXISTENTE, motivo_consulta: 'Nuevo', altura_cm: 170, peso_kg: 70 });
  assert.equal(r.status, 404);
  assert.equal(r.body.error, 'Paciente no encontrado');
});

test('psicología: paciente inexistente responde 404 con { error }', async () => {
  const r = await pedir('POST', '/psicologia/evaluacion', { no_afiliacion: INEXISTENTE });
  assert.equal(r.status, 404);
  assert.equal(r.body.error, 'Paciente no encontrado');
});

test('laboratorios: faltan campos -> 400; paciente inexistente -> 404', async () => {
  const faltan = await pedir('POST', '/laboratorios', { no_afiliacion: INEXISTENTE });
  assert.equal(faltan.status, 400);
  assert.match(faltan.body.error, /requeridos/);

  const nada = await pedir('POST', '/laboratorios', { no_afiliacion: INEXISTENTE, idperlaboratorio: 1, fecha_laboratorio: '2026-01-01' });
  assert.equal(nada.status, 404);
});

test('referencias: usa { detail } en todos los errores', async () => {
  const faltan = await pedir('POST', '/api/referencias', { noafiliacion: INEXISTENTE });
  assert.equal(faltan.status, 400);
  assert.equal(faltan.body.detail, 'Todos los campos son obligatorios.');

  const nada = await pedir('POST', '/api/referencias', {
    noafiliacion: INEXISTENTE, fechareferencia: '2026-01-01', motivotraslado: 'X', idmedico: 1, especialidadreferencia: 'Y',
  });
  assert.equal(nada.status, 404);
  assert.equal(nada.body.detail, 'Paciente no encontrado.');
});

test('un paciente egresado o fallecido no admite registros', async (t) => {
  const noaf = await pacienteBloqueado();
  if (!noaf) return t.skip('la base no tiene pacientes egresados/fallecidos');

  const nutri = await pedir('POST', '/nutricion/evaluacion', { no_afiliacion: noaf, motivo_consulta: 'Nuevo', altura_cm: 170, peso_kg: 70 });
  assert.equal(nutri.status, 400);
  assert.match(nutri.body.error, /egresados o fallecidos/);

  const psico = await pedir('POST', '/psicologia/evaluacion', { no_afiliacion: noaf });
  assert.equal(psico.status, 400);

  const lab = await pedir('POST', '/laboratorios', { no_afiliacion: noaf, idperlaboratorio: 1, fecha_laboratorio: '2026-01-01' });
  assert.equal(lab.status, 400);

  const ref = await pedir('POST', '/api/referencias', {
    noafiliacion: noaf, fechareferencia: '2026-01-01', motivotraslado: 'X', idmedico: 1, especialidadreferencia: 'Y',
  });
  assert.equal(ref.status, 400);
  assert.match(ref.body.detail, /egresados o fallecidos/);
});

test('laboratorios: listado y últimos parámetros de un paciente sin registros', async () => {
  const lista = await pedir('GET', `/laboratorios/${INEXISTENTE}`);
  assert.equal(lista.status, 200);
  assert.equal(lista.body.success, true);
  assert.deepEqual(lista.body.data, []);

  const ultimo = await pedir('GET', `/laboratorios/${INEXISTENTE}/parametros/ultimo`);
  assert.equal(ultimo.status, 200);
  assert.equal(ultimo.body.idlaboratorio, null);
  assert.ok(Array.isArray(ultimo.body.data));
});

test('médicos: devuelve { idmedico, nombrecompleto }', async () => {
  const r = await pedir('GET', '/medicos');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body));
  for (const m of r.body) {
    assert.ok('idmedico' in m && 'nombrecompleto' in m);
  }
});
