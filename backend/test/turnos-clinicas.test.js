// Clínicas por usuario en Turnos: en qué clínicas llama y crea turnos cada usuario (migración 007).
// Las pruebas de base corren en transacciones que se revierten; las HTTP solo leen o fallan antes de escribir.
const { test, before, after } = require('node:test');
const http = require('node:http');
const express = require('express');
const { assert, pool, tx, rechaza, paciente, crearTurno } = require('./helpers');
const { router } = require('../src/modules/turnos');
const service = require('../src/modules/turnos/turnos.service');
const repo = require('../src/modules/turnos/turnos.repository');

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

// Clínicas activas por nombre sin tildes: { HEMODIALISIS: { id, descripcion }, ... }
async function clinicas(c) {
  const { rows } = await c.query('SELECT id_clinica, descripcion FROM tbl_clinica WHERE estado = true');
  return Object.fromEntries(rows.map((r) => [
    r.descripcion.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(), { id: Number(r.id_clinica), descripcion: r.descripcion },
  ]));
}

test('base: sin restricción puede todas; con restricción solo las marcadas, por función', async () => {
  await tx(async (c) => {
    const { HEMODIALISIS: hemo, NUTRICION: nutri, PSICOLOGIA: psico } = await clinicas(c);
    const { rows: [u] } = await c.query('SELECT id_usuario FROM tbl_usuarios ORDER BY id_usuario LIMIT 1');
    const usuario = Number(u.id_usuario);
    await c.query('DELETE FROM tbl_usuario_clinica WHERE id_usuario = $1', [usuario]);
    const puede = async (funcion, clinica) => (await c.query('SELECT fn_usuario_puede_clinica($1, $2, $3) AS v', [usuario, funcion, clinica])).rows[0].v;
    const guardar = (funcion, ids) => c.query(`CALL sp_guardar_clinicas_usuario($1, $2, $3, 'test')`, [usuario, funcion, ids]);
    const lista = async (funcion) => {
      await c.query(`CALL sp_clinicas_usuario($1, $2, 'cli_prueba')`, [usuario, funcion]);
      const filas = (await c.query('FETCH ALL FROM cli_prueba')).rows.map((r) => r.descripcion);
      await c.query('CLOSE cli_prueba');
      return filas.sort();
    };

    assert.equal(await puede('llamado', psico.descripcion), true, 'sin configuración: todas');
    await guardar('llamado', [hemo.id]);
    assert.equal(await puede('llamado', hemo.descripcion), true);
    assert.equal(await puede('llamado', nutri.descripcion), false, 'Nutrición no está asignada para el llamado');
    assert.equal(await puede('crear', nutri.descripcion), true, 'crear no se restringió');
    assert.deepEqual(await lista('llamado'), [hemo.descripcion]);

    await guardar('crear', [nutri.id, psico.id, psico.id]);
    assert.deepEqual(await lista('crear'), [nutri.descripcion, psico.descripcion].sort(), 'sin repetidos');

    // Turnos: la clínica se toma del turno
    const noaf = await paciente(c);
    const turno = await crearTurno(c, noaf, nutri.descripcion);
    const puedeTurno = async (funcion, id) => (await c.query('SELECT fn_usuario_puede_turno($1, $2, $3) AS v', [usuario, funcion, id])).rows[0].v;
    assert.equal(await puedeTurno('llamado', turno), false, 'turno de Nutrición: no puede llamarlo');
    assert.equal(await puedeTurno('crear', turno), true, 'pero sí editarlo o cancelarlo');
    assert.equal(await puedeTurno('llamado', 'T-NO-EXISTE'), true, 'turno inexistente: lo reporta el procedimiento');

    await guardar('llamado', null);
    assert.equal(await puede('llamado', nutri.descripcion), true, 'NULL vuelve a "todas"');

    const sql = `CALL sp_guardar_clinicas_usuario($1, $2, $3, 'test')`;
    await rechaza(c, sql, [usuario, 'llamado', []], /SIN_CLINICAS/);
    await rechaza(c, sql, [usuario, 'llamado', [987654321]], /CLINICA_INVALIDA: .*987654321/);
    await rechaza(c, sql, [usuario, 'otra', null], /FUNCION_INVALIDA/);
    await rechaza(c, sql, [987654321, 'crear', null], /USUARIO_NO_ENCONTRADO/);
  });
});

test('servicio: una clínica no asignada responde 403 con mensaje legible; abandonar/finalizar no se bloquean', async () => {
  const originales = { puedeClinica: repo.puedeClinica, puedeTurno: repo.puedeTurno, clinicaDeTurno: repo.clinicaDeTurno };
  repo.puedeClinica = async () => false;
  repo.puedeTurno = async () => false;
  repo.clinicaDeTurno = async () => 'Nutrición';
  try {
    for (const [nombre, llamada, patron] of [
      ['siguiente', () => service.siguienteTurno('Hemodiálisis', 5), /Hemodiálisis para llamar turnos/],
      ['cola', () => service.siguientesTurnos('Hemodiálisis', 5), /Hemodiálisis para llamar turnos/],
      ['llamar', () => service.llamarTurno('T-1', 5), /Nutrición para llamar turnos/],
      ['crear', () => service.crearTurno({ noAfiliacion: '1', clinica: 'Psicología', fechaTurno: '2026-10-20' }, 5), /Psicología para crear o modificar/],
      ['editar', () => service.actualizarTurno('T-1', { fechaTurno: '2026-10-20', clinica: 'Psicología' }, 5), /Nutrición para crear o modificar/],
      ['cancelar', () => service.cancelarTurno('T-1', 'x', 5), /Nutrición para crear o modificar/],
    ]) {
      await assert.rejects(llamada(), (err) => err.status === 403 && err.body.code === 'CLINICA_NO_ASIGNADA' && patron.test(err.body.message), nombre);
    }
  } finally {
    Object.assign(repo, originales);
  }
});

test('servicio: la elección de clínicas es null (todas) o una lista no vacía de ids', () => {
  assert.equal(service.eleccionDeClinicas(null, 'llamado'), null);
  assert.deepEqual(service.eleccionDeClinicas([2, '2', 3], 'llamado'), [2, 3]);
  assert.throws(() => service.eleccionDeClinicas([], 'llamado'), (e) => e.status === 400 && /al menos una/.test(e.body.error));
  assert.throws(() => service.eleccionDeClinicas(undefined, 'crear'), (e) => e.status === 400 && /^crear:/.test(e.body.error));
  assert.throws(() => service.eleccionDeClinicas(['x'], 'crear'), (e) => e.status === 400);
});

test('HTTP: clínicas propias por función, administración y validaciones antes de escribir', async () => {
  const llamado = await pedir('GET', '/turnos/clinicas/llamado');
  assert.equal(llamado.status, 200);
  assert.ok(llamado.body.length > 0, 'sin restricción: todas las clínicas activas');
  assert.equal((await pedir('GET', '/turnos/clinicas/crear')).status, 200);

  const usuarios = await pedir('GET', '/turnos/clinicas-usuarios');
  assert.equal(usuarios.status, 200);
  assert.ok(Array.isArray(usuarios.body));
  if (usuarios.body.length) {
    const u = usuarios.body[0];
    for (const campo of ['id_usuario', 'nombre_usuario', 'empleado', 'tiene_llamado', 'tiene_crear', 'clinicas_llamado', 'clinicas_crear']) {
      assert.ok(campo in u, `falta ${campo}`);
    }
  }

  assert.equal((await pedir('PUT', '/turnos/clinicas-usuarios/abc', { llamado: null, crear: null })).status, 400);
  const vacia = await pedir('PUT', '/turnos/clinicas-usuarios/1', { llamado: [], crear: null });
  assert.equal(vacia.status, 400);
  assert.match(vacia.body.error, /al menos una/);
});
