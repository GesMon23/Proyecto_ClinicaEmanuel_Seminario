// Reportes: cálculos, contrato HTTP (lista, catálogos, Excel) y estructura del Excel generado.
const { test, before, after } = require('node:test');
const http = require('node:http');
const express = require('express');
const ExcelJS = require('exceljs');
const { assert, pool } = require('./helpers');
const reportes = require('../src/modules/reportes');
const definiciones = require('../src/modules/reportes/definiciones');
const { calcularEdad, diferenciaDMA, aFechaExcel } = require('../src/modules/reportes/calculos');
const { resumenDeFiltros, letraColumna } = require('../src/modules/reportes/excel');

let servidor;
let puerto;

before(async () => {
  const app = express();
  for (const nombre of ['pacientes', 'fallecidos', 'nuevoIngreso', 'faltistas', 'egreso']) app.use(reportes[nombre]);
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
      const trozos = [];
      res.on('data', (d) => trozos.push(d));
      res.on('end', () => ok({ status: res.statusCode, headers: res.headers, buffer: Buffer.concat(trozos) }));
    }).on('error', fallo);
  });
}
const json = (r) => JSON.parse(r.buffer.toString());

// ------------------------------------------------------------------ unitarias

test('calcularEdad respeta el cumpleaños y la fecha de corte', () => {
  assert.equal(calcularEdad('1990-06-15', '2020-06-14'), 29);
  assert.equal(calcularEdad('1990-06-15', '2020-06-15'), 30);
  assert.equal(calcularEdad('', '2020-01-01'), '');
  assert.equal(calcularEdad('no es fecha', '2020-01-01'), '');
  assert.equal(calcularEdad('2030-01-01', '2020-01-01'), '');
});

test('diferenciaDMA devuelve días-meses-años', () => {
  // Fechas locales: las cadenas solo-día se interpretan en UTC y el cálculo lee la hora local
  const f = (a, m, d) => new Date(a, m - 1, d);
  assert.equal(diferenciaDMA(f(2020, 1, 15), f(2021, 3, 20)), '5-2-1');
  assert.equal(diferenciaDMA(f(2020, 1, 31), f(2020, 3, 1)), '1-1-0');
  assert.equal(diferenciaDMA(f(2021, 1, 1), f(2020, 1, 1)), '0-0-0');
  assert.equal(diferenciaDMA('', f(2020, 1, 1)), '');
});

test('aFechaExcel, letraColumna y resumenDeFiltros', () => {
  assert.ok(aFechaExcel('2026-01-02') instanceof Date);
  assert.equal(aFechaExcel(''), null);
  assert.equal(aFechaExcel('xyz'), null);
  assert.equal(letraColumna(1), 'A');
  assert.equal(letraColumna(26), 'Z');
  assert.equal(letraColumna(27), 'AA');
  const etiquetas = [['fechainicio', 'Desde'], ['sexo', 'Sexo']];
  assert.equal(resumenDeFiltros(etiquetas, {}), 'Sin filtros');
  assert.equal(resumenDeFiltros(etiquetas, { fechainicio: '2026-01-01', sexo: 'Masculino' }), 'Desde: 2026-01-01 | Sexo: Masculino');
});

test('cada definición tiene coherencia interna', () => {
  for (const [nombre, def] of Object.entries(definiciones)) {
    const claves = def.excel.columnas.map((c) => c.key);
    assert.equal(new Set(claves).size, claves.length, `${nombre}: claves de columna repetidas`);
    const fila = def.excel.fila({});
    for (const k of claves) assert.ok(k in fila, `${nombre}: la fila no incluye la columna ${k}`);
    assert.ok(def.excel.filaEncabezado > def.excel.preambulo - 1, `${nombre}: el encabezado no puede quedar dentro del preámbulo`);
  }
});

// -------------------------------------------------------------- contrato HTTP

const REPORTES = [
  ['nuevoIngreso', '/nuevoingreso', ['jornadas', 'accesos', 'departamentos', 'sexos']],
  ['pacientes', '/pacientes', ['estados', 'jornadas', 'accesos', 'departamentos', 'sexos']],
  ['fallecidos', '/fallecidos', ['jornadas', 'accesos', 'departamentos', 'sexos']],
  ['egreso', '/egreso', ['jornadas', 'accesos', 'departamentos', 'sexos', 'causas']],
  ['faltistas', '/faltistas', ['clinicas', 'jornadas', 'accesos', 'departamentos']],
];

for (const [nombre, ruta, claves] of REPORTES) {
  test(`${nombre}: lista y catálogos`, async () => {
    const lista = await pedir(ruta);
    assert.equal(lista.status, 200);
    assert.ok(Array.isArray(json(lista)));

    const catalogos = await pedir(`${ruta}/catalogos`);
    assert.equal(catalogos.status, 200);
    const cuerpo = json(catalogos);
    assert.deepEqual(Object.keys(cuerpo), claves);
    for (const c of claves) assert.ok(Array.isArray(cuerpo[c]), `${c} debe ser una lista`);
  });

  test(`${nombre}: un filtro de fecha futura no devuelve filas`, async () => {
    const r = await pedir(`${ruta}?fechainicio=2999-01-01`);
    assert.equal(r.status, 200);
    assert.deepEqual(json(r), []);
  });

  test(`${nombre}: el Excel tiene título, encabezado con estilo y una fila por registro`, async () => {
    const def = definiciones[nombre];
    const lista = json(await pedir(ruta));
    const r = await pedir(`${ruta}/excel`);
    assert.equal(r.status, 200);
    assert.match(r.headers['content-type'], /spreadsheetml\.sheet/);
    assert.match(r.headers['content-disposition'], new RegExp(def.excel.archivo));

    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(r.buffer);
    const hoja = libro.getWorksheet(def.excel.hoja);
    assert.ok(hoja, 'existe la hoja');
    assert.equal(hoja.getCell(2, 1).value, def.excel.titulo);

    const encabezado = hoja.getRow(def.excel.filaEncabezado);
    const esperados = def.excel.columnas.map((c) => c.header);
    assert.deepEqual(esperados.map((_, i) => encabezado.getCell(i + 1).value), esperados);
    assert.equal(encabezado.getCell(1).fill.fgColor.argb, 'FF16A34A');

    // Los datos empiezan justo después del encabezado (sin un segundo encabezado duplicado)
    let filasDatos = 0;
    hoja.eachRow((fila, n) => { if (n > def.excel.filaEncabezado) filasDatos++; });
    assert.equal(filasDatos, lista.length);
    if (lista.length > 0) {
      assert.notEqual(hoja.getCell(def.excel.filaEncabezado + 1, 1).value, esperados[0], 'no repite el encabezado');
    }

    if (def.excel.etiquetas) {
      assert.match(String(hoja.getCell(3, 1).value), /Sin filtros/);
    } else {
      assert.equal(hoja.getCell(3, 1).value, null);
    }
  });
}

test('el Excel refleja los filtros aplicados en la línea de resumen', async () => {
  const r = await pedir('/nuevoingreso/excel?fechainicio=2999-01-01&jornada=X');
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(r.buffer);
  const linea = String(libro.getWorksheet('Nuevo Ingreso').getCell(3, 1).value);
  assert.match(linea, /Desde: 2999-01-01 \| Jornada: X/);
});
