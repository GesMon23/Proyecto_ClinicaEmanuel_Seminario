// Contrato HTTP de las rutas de turnos. Solo usa peticiones que no dejan datos (lecturas y errores).
const { test, before, after } = require('node:test');
const http = require('node:http');
const express = require('express');
const { assert, pool } = require('./helpers');
const { router } = require('../src/modules/turnos');

let servidor;
let puerto;

before(async () => {
  const app = express();
  app.use(router);
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

test('GET /GclinicasT devuelve la lista de clínicas', async () => {
  const r = await pedir('GET', '/GclinicasT');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body) && r.body.length > 0);
});

test('GET /GestadosTurnoT incluye los estados del flujo Creada -> Asignada', async () => {
  const r = await pedir('GET', '/GestadosTurnoT');
  const nombres = r.body.map((e) => e.descripcion);
  for (const esperado of ['Creada', 'Asignada', 'Llamado', 'Finalizado', 'Abandonado', 'Faltante', 'Cancelado']) {
    assert.ok(nombres.includes(esperado), `falta el estado ${esperado}`);
  }
});

test('GET /GturnosCreadosT responde una lista', async () => {
  const r = await pedir('GET', '/GturnosCreadosT');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body));
});

test('las rutas por usuario exigen sesión (401)', async () => {
  for (const [metodo, ruta] of [
    ['GET', '/Gturno-actual-usuario'],
    ['PUT', '/Gactualizar-estado-llamadoT/X'],
    ['PUT', '/Gabandonar-turnoT/X'],
    ['PUT', '/Gfinalizar-turnoT/X'],
  ]) {
    const r = await pedir(metodo, ruta);
    assert.equal(r.status, 401, `${metodo} ${ruta}`);
  }
});

test('validaciones: faltan datos -> 400', async () => {
  const faltista = await pedir('POST', '/Gregistrar-faltistaT', {});
  assert.equal(faltista.status, 400);
  assert.equal(faltista.body.success, false);

  const actualizar = await pedir('PUT', '/Gactualizar-turnoT/X', {});
  assert.equal(actualizar.status, 400);
});

test('cancelar un turno inexistente -> 404', async () => {
  const r = await pedir('PUT', '/Gcancelar-turnoT/NO-EXISTE');
  assert.equal(r.status, 404);
  assert.equal(r.body.success, false);
});

test('turno actual / siguiente de una clínica sin datos -> 404 con mensaje', async () => {
  const actual = await pedir('GET', '/Gturno-actual/CLINICA-INEXISTENTE');
  assert.equal(actual.status, 404);
  assert.ok(actual.body.message);
  const siguiente = await pedir('GET', '/Gsiguiente-turnoT/CLINICA-INEXISTENTE');
  assert.equal(siguiente.status, 404);
});
