// Estadísticas: normalización de parámetros, conversión a números y contrato de los 22 endpoints.
const { test, before, after } = require('node:test');
const http = require('node:http');
const express = require('express');
const { assert, pool } = require('./helpers');
const { router, numerar } = require('../src/modules/estadisticas');
const definiciones = require('../src/modules/estadisticas/definiciones');
const P = require('../src/modules/estadisticas/parametros');

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

function pedir(ruta) {
  return new Promise((ok, fallo) => {
    http.get({ host: 'localhost', port: puerto, path: `/api/estadisticas/${ruta}` }, (res) => {
      let b = '';
      res.on('data', (d) => { b += d; });
      res.on('end', () => ok({ status: res.statusCode, body: b ? JSON.parse(b) : null }));
    }).on('error', fallo);
  });
}

// ------------------------------------------------------------------ unitarias

test('numerar convierte solo los campos de conteo/promedio', () => {
  const r = numerar({
    total: '3', imc_promedio: '22.50', noafiliacion: '00123', nombre: 'ANA',
    items: [{ total: '1', jornada: '2.L-M-V' }, { total: null }],
  });
  assert.equal(r.total, 3);
  assert.equal(r.imc_promedio, 22.5);
  assert.equal(r.noafiliacion, '00123', 'no toca identificadores');
  assert.equal(r.items[0].total, 1);
  assert.equal(r.items[0].jornada, '2.L-M-V');
  assert.equal(r.items[1].total, null);
});

test('parametros: sexo, motivo y rangos', () => {
  assert.equal(P.sexoInicial(' Masculino '), 'm');
  assert.equal(P.sexoInicial(''), null);
  assert.equal(P.sexoMF('Femenino'), 'f');
  assert.equal(P.sexoMF('xyz'), null);
  assert.equal(P.sexoCompleto('m'), 'Masculino');
  assert.equal(P.sexoCompleto('FEM'), 'Femenino');
  assert.equal(P.sexoCompleto('otro'), null);
  assert.equal(P.motivo('Nuevo'), 'Nuevo');
  assert.equal(P.motivo('Otro'), null);
  assert.deepEqual(P.rangoAbierto({}), { desde: null, hasta: null });
  assert.deepEqual(P.rangoAbierto({ desde: '2026-01-01' }), { desde: '2026-01-01', hasta: null });
  const r = P.rango90Dias({});
  assert.equal(r.hasta, P.hoyISO());
  assert.equal(r.desde, P.haceDiasISO(90));
  assert.deepEqual(P.rango90Dias({ desde: 'a', hasta: 'b' }), { desde: 'a', hasta: 'b' });
});

test('definiciones: rutas únicas y parámetros en el orden del procedimiento', () => {
  const rutas = definiciones.map((d) => d.ruta);
  assert.equal(new Set(rutas).size, rutas.length);

  const pac = definiciones.find((d) => d.ruta === 'pacientes-por-estado').parametros({ acceso: ' X ', estado: 'Activo', jornada: '1', sexo: 'Femenino' });
  assert.deepEqual(pac.valores, ['X', 'Activo', '1', 'f']);

  const jornada = definiciones.find((d) => d.ruta === 'nutricion-por-jornada').parametros({ desde: 'd', hasta: 'h', sexo: 'm', motivo: 'Nuevo' });
  assert.deepEqual(jornada.valores, ['d', 'h', 'Masculino', 'Nuevo']);
  assert.deepEqual(jornada.rango, { desde: 'd', hasta: 'h' });

  const detalle = definiciones.find((d) => d.ruta === 'nutricion-detalle').parametros({ estado: 'Normal', sexo: 'f', motivo: 'Reconsulta' });
  assert.deepEqual(detalle.valores, [null, null, 'Normal', 'Femenino', 'Reconsulta']);

  const tipo = definiciones.find((d) => d.ruta === 'nutricion-por-tipo').parametros({ sexo: 'f' });
  assert.equal(tipo.rango, undefined, 'nutricion-por-tipo no devuelve rango');
});

// -------------------------------------------------------------- contrato HTTP

for (const def of definiciones) {
  test(`GET ${def.ruta} responde ${def.salida}`, async () => {
    const r = await pedir(def.ruta);
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.items));
    if (def.salida === 'rango-items') {
      assert.ok('desde' in r.body.rango && 'hasta' in r.body.rango);
    } else {
      assert.equal(r.body.rango, undefined);
    }
    // Los conteos llegan como números, no como texto
    for (const item of r.body.items) {
      if ('total' in item && item.total !== null) assert.equal(typeof item.total, 'number', `${def.ruta}: total debe ser numérico`);
    }
  });
}

test('totales y resúmenes numéricos', async () => {
  const total = await pedir('pacientes-total');
  assert.equal(total.status, 200);
  assert.equal(typeof total.body.total, 'number');

  const programa = await pedir('pacientes-programa-resumen');
  assert.equal(typeof programa.body.dentro, 'number');
  assert.equal(typeof programa.body.fuera, 'number');

  const kdqol = await pedir('psicologia-kdqol-total');
  assert.equal(typeof kdqol.body.total, 'number');
  assert.ok(kdqol.body.rango.desde && kdqol.body.rango.hasta);

  const promedios = await pedir('psicologia-kdqol-promedios');
  assert.equal(promedios.status, 200);
  assert.ok('global' in promedios.body.promedios);
  // Mismos nombres que los campos del formulario de psicología (y que las áreas del dashboard)
  const filaPromedios = Object.keys(promedios.body.promedios);
  for (const campo of ['fisico_mental', 'enfermedad_renal', 'sintomas_problemas', 'efectos_enfermedad', 'vida_diaria']) {
    assert.ok(filaPromedios.includes(campo), `falta ${campo}`);
  }
});

test('resumen general tiene KPIs, series y distribuciones', async () => {
  const r = await pedir('resumen');
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.body), ['kpis', 'series', 'distribuciones', 'rango']);
  assert.ok(Array.isArray(r.body.series.ingresosMes));
  assert.ok(Array.isArray(r.body.series.egresosMes));
  assert.ok(Array.isArray(r.body.distribuciones.causasEgreso));
  assert.ok('pacientesActivos' in r.body.kpis && 'tasaInasistenciaPct' in r.body.kpis);
});

test('un filtro de fechas futuras deja las series vacías', async () => {
  const r = await pedir('psicologia-por-tipo?desde=2999-01-01&hasta=2999-12-31');
  assert.deepEqual(r.body.items, []);
  assert.deepEqual(r.body.rango, { desde: '2999-01-01', hasta: '2999-12-31' });
});
