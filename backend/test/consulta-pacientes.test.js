// Consulta de Pacientes: contrato HTTP (solo lecturas y validaciones, no dejan datos) y unidades.
const { test, before, after } = require('node:test');
const http = require('node:http');
const express = require('express');
const { assert, pool } = require('./helpers');
const pacientesModule = require('../src/modules/pacientes');
const consultaService = require('../src/modules/pacientes/consulta.service');

let servidor;
let puerto;

before(async () => {
  const app = express();
  // Mismo orden de montaje que server.js
  for (const nombre of ['formularios', 'actualizacion', 'egreso', 'reingreso', 'consulta', 'registro']) app.use(pacientesModule[nombre]);
  servidor = await new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
  puerto = servidor.address().port;
});

after(async () => {
  await new Promise((ok) => servidor.close(ok));
  await pool.end();
});

function pedir(metodo, ruta, cuerpo, crudo = false) {
  return new Promise((ok, fallo) => {
    const datos = cuerpo === undefined ? null : JSON.stringify(cuerpo);
    const req = http.request({
      host: 'localhost', port: puerto, path: ruta, method: metodo,
      headers: datos ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(datos) } : {},
    }, (res) => {
      const trozos = [];
      res.on('data', (d) => trozos.push(d));
      res.on('end', () => {
        const buffer = Buffer.concat(trozos);
        if (crudo) return ok({ status: res.statusCode, headers: res.headers, buffer });
        let json = null;
        try { json = buffer.length ? JSON.parse(buffer.toString()) : null; } catch (_) { json = buffer.toString(); }
        ok({ status: res.statusCode, body: json });
      });
    });
    req.on('error', fallo);
    if (datos) req.write(datos);
    req.end();
  });
}

test('normalizarLaboratorio homologa nombres de columna con y sin guion bajo', () => {
  const r = consultaService.normalizarLaboratorio({ noafiliacion: '1', primernombre: 'A', idlaboratorio: 7, fecha: '2026-01-01', examen: true });
  assert.equal(r.no_afiliacion, '1');
  assert.equal(r.primer_nombre, 'A');
  assert.equal(r.id_laboratorio, 7);
  assert.equal(r.fecha_laboratorio, '2026-01-01');
  assert.equal(r.examen_realizado, true);
  assert.equal(r.hiv, null);
});

test('catálogos de consulta devuelven listas', async () => {
  for (const ruta of ['/departamentos', '/accesos-vasculares', '/estados-paciente']) {
    const r = await pedir('GET', ruta);
    assert.equal(r.status, 200, ruta);
    assert.ok(Array.isArray(r.body), ruta);
  }
});

test('historiales de un paciente inexistente devuelven lista vacía', async () => {
  for (const ruta of [
    '/turnos/NO-EXISTE', '/historial/NO-EXISTE', '/referencias/NO-EXISTE', '/nutricion/NO-EXISTE',
    '/psicologia/NO-EXISTE', '/formularios/NO-EXISTE', '/faltistas/NO-EXISTE', '/laboratorios/NO-EXISTE',
    '/laboratorios/dpi/0000000000000', '/faltistas/dpi/0000000000000',
  ]) {
    const r = await pedir('GET', ruta);
    assert.equal(r.status, 200, ruta);
    assert.deepEqual(r.body, [], ruta);
  }
});

test('paciente por afiliación o DPI inexistente -> 404', async () => {
  assert.equal((await pedir('GET', '/pacientes/NO-EXISTE')).status, 404);
  assert.equal((await pedir('GET', '/pacientes/dpi/0000000000000')).status, 404);
});

test('altas de historial: faltan datos obligatorios -> 400', async () => {
  assert.equal((await pedir('POST', '/historial/formularios', {})).status, 400);
  assert.equal((await pedir('POST', '/historial/egresos', {})).status, 400);
});

test('fotos: ausencia y carné de paciente inexistente', async () => {
  const chequeo = await pedir('GET', '/check-photo/NO-EXISTE');
  assert.equal(chequeo.status, 200);
  assert.equal(chequeo.body.exists, false);
  assert.equal((await pedir('GET', '/foto/NO-EXISTE')).status, 404);
  assert.equal((await pedir('GET', '/carnet/forzar/NO-EXISTE')).status, 404);
});

test('el carné de un paciente existente se genera como PDF', async (t) => {
  const p = await pool.query('SELECT no_afiliacion FROM tbl_pacientes LIMIT 1');
  if (!p.rows.length) return t.skip('no hay pacientes en la base');
  const r = await pedir('GET', `/carnet/forzar/${encodeURIComponent(p.rows[0].no_afiliacion)}`, undefined, true);
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /application\/pdf/);
  assert.equal(r.buffer.subarray(0, 4).toString(), '%PDF');
});
