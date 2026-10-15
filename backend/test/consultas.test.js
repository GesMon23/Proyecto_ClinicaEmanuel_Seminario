// Consultas de historiales (laboratorios, nutrición, psicología, referencias).
const { test, before, after } = require('node:test');
const http = require('node:http');
const express = require('express');
const { assert, pool } = require('./helpers');
const consultas = require('../src/modules/consultas');
const { textoONulo, enteroONulo, sexoNormalizado } = require('../src/modules/consultas/parametros');

let servidor;
let puerto;

before(async () => {
  const app = express();
  // Mismos montajes que server.js
  app.use(consultas.laboratorios);
  app.use('/api/psicologia', consultas.psicologia);
  app.use('/api/nutricion', consultas.nutricion);
  app.use(consultas.referencias);
  servidor = await new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
  puerto = servidor.address().port;
});

after(async () => {
  await new Promise((ok) => servidor.close(ok));
  await pool.end();
});

function pedir(ruta) {
  return new Promise((ok, fallo) => {
    http.get({ host: 'localhost', port: puerto, path: ruta }, (res) => {
      let b = '';
      res.on('data', (d) => { b += d; });
      res.on('end', () => ok({ status: res.statusCode, body: b ? JSON.parse(b) : null }));
    }).on('error', fallo);
  });
}

test('parametros: textoONulo, enteroONulo y sexoNormalizado', () => {
  assert.equal(textoONulo('  hola '), 'hola');
  assert.equal(textoONulo('   '), null);
  assert.equal(textoONulo(undefined), null);
  assert.equal(enteroONulo('12'), 12);
  assert.equal(enteroONulo(''), null);
  assert.equal(enteroONulo('abc'), null);
  assert.equal(sexoNormalizado('M'), 'Masculino');
  assert.equal(sexoNormalizado('masculino'), 'Masculino');
  assert.equal(sexoNormalizado('f'), 'Femenino');
  assert.equal(sexoNormalizado('Femenino'), 'Femenino');
  assert.equal(sexoNormalizado('otro'), null);
  assert.equal(sexoNormalizado(''), null);
});

test('laboratorios: catálogos e historiales', async () => {
  const cat = await pedir('/api/laboratorios/catalogos');
  assert.equal(cat.status, 200);
  assert.deepEqual(Object.keys(cat.body), ['periodicidades', 'sexos']);

  const porAfiliacion = await pedir('/api/laboratorios/historial/NO-EXISTE');
  assert.equal(porAfiliacion.status, 200);
  assert.deepEqual(porAfiliacion.body, { success: true, data: [] });

  const filtrado = await pedir('/api/laboratorios/historial?desde=2999-01-01&idlaboratorio=abc');
  assert.equal(filtrado.status, 200);
  assert.equal(filtrado.body.success, true);
  assert.deepEqual(filtrado.body.data, []);
});

for (const [nombre, prefijo] of [['nutrición', '/api/nutricion'], ['psicología', '/api/psicologia']]) {
  test(`${nombre}: historial por afiliación y con filtros`, async () => {
    const porAfiliacion = await pedir(`${prefijo}/historial/NO-EXISTE`);
    assert.equal(porAfiliacion.status, 200);
    assert.deepEqual(porAfiliacion.body, { success: true, data: [] });

    const filtrado = await pedir(`${prefijo}/historial?desde=2999-01-01&sexo=m`);
    assert.equal(filtrado.status, 200);
    assert.equal(filtrado.body.success, true);
    assert.deepEqual(filtrado.body.data, []);

    const todos = await pedir(`${prefijo}/historial`);
    assert.equal(todos.status, 200);
    assert.ok(Array.isArray(todos.body.data));
  });
}

test('referencias: consulta con filtros', async () => {
  const r = await pedir('/api/referencias/consulta?desde=2999-01-01&sexo=f&idmedico=abc');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, []);
  const todas = await pedir('/api/referencias/consulta');
  assert.equal(todas.status, 200);
  assert.ok(Array.isArray(todas.body));
});
