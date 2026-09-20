// Módulo de pacientes: reglas en la base (transacciones que se revierten) y contrato HTTP (solo
// peticiones que no dejan datos).
const { test, before, after } = require('node:test');
const http = require('node:http');
const express = require('express');
const { assert, pool, tx, cursor, rechaza, paciente, hoy, fechasDeTurnos } = require('./helpers');
const pacientesModule = require('../src/modules/pacientes');
const service = require('../src/modules/pacientes/pacientes.service');
const fotos = require('../src/modules/pacientes/fotos');
const { HttpError } = require('../src/shared/http');

let servidor;
let puerto;

before(async () => {
  const app = express();
  // Mismo orden de montaje que server.js
  for (const nombre of ['formularios', 'actualizacion', 'egreso', 'reingreso', 'registro']) app.use(pacientesModule[nombre]);
  servidor = await new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
  puerto = servidor.address().port;
});

after(async () => {
  await new Promise((ok) => servidor.close(ok));
  await pool.end();
});

function pedir(metodo, ruta, cuerpo) {
  return new Promise((ok, fallo) => {
    const datos = cuerpo === undefined ? null : JSON.stringify(cuerpo);
    const req = http.request({
      host: 'localhost', port: puerto, path: ruta, method: metodo,
      headers: datos ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(datos) } : {},
    }, (res) => {
      let b = '';
      res.on('data', (d) => { b += d; });
      res.on('end', () => { let json = null; try { json = b ? JSON.parse(b) : null; } catch (_) { json = b; } ok({ status: res.statusCode, body: json }); });
    });
    req.on('error', fallo);
    if (datos) req.write(datos);
    req.end();
  });
}

// ------------------------------------------------------------------ unitarias

test('calcularEdad: cumpleaños ya pasado o pendiente este año', () => {
  const hoyFecha = new Date();
  const nacido = (anios, mesesAtras) => new Date(hoyFecha.getFullYear() - anios, hoyFecha.getMonth() - mesesAtras, hoyFecha.getDate());
  assert.equal(service.calcularEdad(nacido(30, 1)), 30);  // cumplió hace un mes
  assert.equal(service.calcularEdad(nacido(30, -1)), 29); // cumple el mes próximo
  assert.equal(service.calcularEdad(null), null);
  assert.equal(service.calcularEdad('no es fecha'), null);
});

test('fotos: valida la imagen antes de escribir nada', () => {
  assert.throws(() => fotos.guardarFotoActualizacion('X1', ''), (e) => e instanceof HttpError && e.status === 400);
  assert.throws(() => fotos.guardarFotoActualizacion('X1', 'data:text/plain;base64,AAAA'), (e) => e instanceof HttpError && e.status === 400);
  assert.equal(fotos.existeFoto('NO-EXISTE-XYZ'), false);
  assert.equal(fotos.rutaFotoPorId('NO-EXISTE-XYZ'), null);
});

// ------------------------------------------------------- reglas en la base

test('registrar paciente con jornada y período genera sus turnos de Hemodiálisis', () => tx(async (c) => {
  const inicio = await hoy(c);
  const fin = (await c.query(`SELECT to_char(CURRENT_DATE + 14, 'YYYY-MM-DD') AS d`)).rows[0].d;
  const noaf = `T${Math.floor(Math.random() * 1e12)}`;
  const filas = await cursor(c,
    `CALL public.sp_paciente_insertar($1, NULL, NULL, 'PRUEBA', NULL, NULL, 'TEST', NULL, NULL, NULL, NULL, NULL, NULL,
       CURRENT_DATE, NULL, 1, NULL, 'F-1', 1, 12, NULL, NULL, $2, $3, 'test', $4)`,
    [noaf, inicio, fin]);
  assert.equal(filas[0].no_afiliacion, noaf);

  const turnos = await fechasDeTurnos(c, noaf, 'Creada');
  assert.ok(turnos.length >= 5);
  assert.ok(turnos.every((t) => [1, 3, 5].includes(t.dow)), 'jornada 1 = lunes, miércoles y viernes');
}));

test('registro de formularios: fija período y jornada y genera los turnos del nuevo período', () => tx(async (c) => {
  const noaf = await paciente(c, { jornada: 1 });
  const inicio = await hoy(c);
  const fin = (await c.query(`SELECT to_char(CURRENT_DATE + 14, 'YYYY-MM-DD') AS d`)).rows[0].d;
  const json = JSON.stringify([{
    noafiliacion: noaf, numeroformulario: 'F-9', fechainicioperiodo: inicio, fechafinperiodo: fin,
    sesionesautorizadasmes: 12, idjornada: 3, // 3 = martes, jueves y sábado
  }]);
  await c.query('CALL sp_registro_formularios($1::json, $2)', [json, 'test']);

  const p = (await c.query('SELECT id_jornada, numero_formulario_activo FROM tbl_pacientes WHERE no_afiliacion = $1', [noaf])).rows[0];
  assert.equal(Number(p.id_jornada), 3);
  assert.equal(p.numero_formulario_activo, 'F-9');
  const turnos = await fechasDeTurnos(c, noaf, 'Creada');
  assert.ok(turnos.length >= 5);
  assert.ok(turnos.every((t) => [2, 4, 6].includes(t.dow)));

  await rechaza(c, 'CALL sp_registro_formularios($1::json, $2)',
    [JSON.stringify([{ noafiliacion: 'NO-EXISTE', numeroformulario: 'F' }]), 'test'], /No existe paciente/);
}));

test('reingreso con período genera turnos', () => tx(async (c) => {
  const noaf = await paciente(c, { jornada: 3 });
  const inicio = await hoy(c);
  const fin = (await c.query(`SELECT to_char(CURRENT_DATE + 14, 'YYYY-MM-DD') AS d`)).rows[0].d;
  await cursor(c, 'CALL public.sp_paciente_reingreso_insertar($1, $2, 12, $3, $4, CURRENT_DATE, NULL, $5)', [noaf, 'F-2', inicio, fin]);
  const turnos = await fechasDeTurnos(c, noaf, 'Creada');
  assert.ok(turnos.length >= 5);
  assert.ok(turnos.every((t) => [2, 4, 6].includes(t.dow)));
}));

test('actualizar con un DPI inválido lo rechaza el procedimiento', () => tx(async (c) => {
  const noaf = await paciente(c);
  await rechaza(c,
    'CALL public.sp_actualizar_paciente_por_noafiliacion($1, $2, NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL, $3, $4)',
    [noaf, '123', 'test', 'c_dpi'], /DPI inv/i);
}));

// -------------------------------------------------------------- contrato HTTP

test('catálogos devuelven listas', async () => {
  for (const ruta of ['/Adepartamento', '/Aaccesos-vascular', '/Ajornada', '/causas_egreso']) {
    const r = await pedir('GET', ruta);
    assert.equal(r.status, 200, ruta);
    assert.ok(Array.isArray(r.body), ruta);
  }
});

test('búsquedas sin criterio -> 400', async () => {
  for (const ruta of ['/Apacientes/actualizacion', '/pacientes/egreso', '/pacientes/reingreso']) {
    const r = await pedir('GET', ruta);
    assert.equal(r.status, 400, ruta);
    assert.ok(r.body.error, ruta);
  }
});

test('reingreso: faltan datos obligatorios -> 400', async () => {
  const a = await pedir('POST', '/pacientes/reingreso', {});
  assert.equal(a.status, 400);
  assert.equal(a.body.success, false);
  const b = await pedir('POST', '/historial/reingresos', {});
  assert.equal(b.status, 400);
});

test('paciente inexistente -> 404 en existencia, carné, formularios y actualización', async () => {
  assert.equal((await pedir('GET', '/pacientes/existe/noafiliacion/NO-EXISTE')).status, 404);
  assert.equal((await pedir('GET', '/pacientes/existe/dpi/0000000000000')).status, 404);
  assert.equal((await pedir('GET', '/carnet/forzar/NO-EXISTE')).status, 404);
  assert.equal((await pedir('GET', '/consulta_pacientes_formularios/NO-EXISTE')).status, 404);
  const act = await pedir('PUT', '/Apacientes/NO-EXISTE', {});
  assert.equal(act.status, 404);
  assert.equal(act.body.success, false);
});

test('actualizar con DPI inválido -> 400 con mensaje', async () => {
  const r = await pedir('PUT', '/Apacientes/NO-EXISTE', { dpi: '123' });
  assert.equal(r.status, 400);
  assert.match(r.body.detail, /DPI inv/i);
});

test('formularios masivo: valida la entrada y bloquea pacientes inexistentes', async () => {
  assert.equal((await pedir('PUT', '/api/pacientes/masivo', { pacientes: [] })).status, 400);
  const r = await pedir('PUT', '/api/pacientes/masivo', { pacientes: [{ noafiliacion: 'NO-EXISTE', numeroformulario: 'F' }] });
  assert.equal(r.status, 400);
  assert.equal(r.body.bloqueados[0].motivo, 'Paciente no encontrado');
});

test('fotos: validaciones y ausencia', async () => {
  assert.equal((await pedir('POST', '/Aupload-foto/X1', {})).status, 400);
  assert.equal((await pedir('POST', '/Aupload-foto/X1', { imagenBase64: 'texto' })).status, 400);
  assert.equal((await pedir('GET', '/Afoto/NO-EXISTE')).status, 404);
  assert.deepEqual((await pedir('GET', '/Acheck-photo/NO-EXISTE')).body, { exists: false });
});
