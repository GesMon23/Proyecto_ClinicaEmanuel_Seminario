// Reglas de negocio de turnos (viven en procedimientos almacenados de PostgreSQL).
const { test, after } = require('node:test');
const {
  assert, pool, tx, cursor, rechaza, paciente, clinicaHemodialisis, crearTurno, estadoDe, hoy, fechasDeTurnos,
} = require('./helpers');

after(() => pool.end());

const USUARIO_A = 900001;
const USUARIO_B = 900002;

test('un turno nuevo nace en estado Creada', () => tx(async (c) => {
  const noaf = await paciente(c);
  const id = await crearTurno(c, noaf, await clinicaHemodialisis(c));
  assert.equal(await estadoDe(c, id), 'Creada');
}));

test('asignar: Creada -> Asignada y no se puede asignar dos veces', () => tx(async (c) => {
  const noaf = await paciente(c);
  const id = await crearTurno(c, noaf, await clinicaHemodialisis(c));

  await c.query('CALL sp_asignar_turno($1, $2)', [id, USUARIO_A]);
  assert.equal(await estadoDe(c, id), 'Asignada');

  await rechaza(c, 'CALL sp_asignar_turno($1, $2)', [id, USUARIO_A], /TURNO_NO_CREADA/);
}));

test('llamado por usuario: el turno llamado desaparece de Próximos para los demás', () => tx(async (c) => {
  const clinica = await clinicaHemodialisis(c);
  const pa = await paciente(c);
  const pb = await paciente(c);
  const ta = await crearTurno(c, pa, clinica);
  const tb = await crearTurno(c, pb, clinica);
  await c.query('CALL sp_asignar_turno($1, $2)', [ta, USUARIO_A]);
  await c.query('CALL sp_asignar_turno($1, $2)', [tb, USUARIO_A]);

  const propios = (filas) => filas.map((f) => f.id_turno).filter((id) => id === ta || id === tb);
  assert.deepEqual(propios(await cursor(c, 'CALL sp_siguientes_turnos($1, $2)', [clinica])).sort(), [ta, tb].sort());

  // El usuario A llama al paciente A
  const llamado = await cursor(c, 'CALL sp_actualizar_estado_llamado($1, $2, $3)', [ta, USUARIO_A]);
  assert.equal(llamado[0].id_turno, ta);
  assert.equal(await estadoDe(c, ta), 'Llamado');

  // Para el usuario B solo queda el paciente B como próximo, y no tiene turno actual
  assert.deepEqual(propios(await cursor(c, 'CALL sp_siguientes_turnos($1, $2)', [clinica])), [tb]);
  assert.equal((await cursor(c, 'CALL sp_turno_actual_usuario($1, $2)', [USUARIO_B])).length, 0);
  assert.equal((await cursor(c, 'CALL sp_turno_actual_usuario($1, $2)', [USUARIO_A]))[0].id_turno, ta);

  // A no puede tener un segundo turno en atención; B no puede tomar el turno de A
  await rechaza(c, 'CALL sp_actualizar_estado_llamado($1, $2, $3)', [tb, USUARIO_A, 'c_x'], /USUARIO_CON_TURNO/);
  await rechaza(c, 'CALL sp_actualizar_estado_llamado($1, $2, $3)', [ta, USUARIO_B, 'c_y'], /TURNO_NO_DISPONIBLE/);

  // Solo quien atiende puede cerrarlo, y se registra quién lo hizo
  await rechaza(c, 'CALL sp_finalizar_turno($1, $2, $3)', [ta, USUARIO_B, 'c_z'], /TURNO_NO_EN_ATENCION/);
  await cursor(c, 'CALL sp_finalizar_turno($1, $2, $3)', [ta, USUARIO_A]);
  assert.equal(await estadoDe(c, ta), 'Finalizado');
  const fila = (await c.query('SELECT id_usuario_llamado, id_usuario_finalizado FROM tbl_turnos WHERE id_turno = $1', [ta])).rows[0];
  assert.equal(Number(fila.id_usuario_llamado), USUARIO_A);
  assert.equal(Number(fila.id_usuario_finalizado), USUARIO_A);
}));

test('abandonar: solo el usuario que atiende y el turno queda Abandonado', () => tx(async (c) => {
  const clinica = await clinicaHemodialisis(c);
  const id = await crearTurno(c, await paciente(c), clinica);
  await c.query('CALL sp_asignar_turno($1, $2)', [id, USUARIO_A]);
  await cursor(c, 'CALL sp_actualizar_estado_llamado($1, $2, $3)', [id, USUARIO_A]);
  await rechaza(c, 'CALL sp_abandonar_turno($1, $2, $3)', [id, USUARIO_B, 'c_w'], /TURNO_NO_EN_ATENCION/);
  await cursor(c, 'CALL sp_abandonar_turno($1, $2, $3)', [id, USUARIO_A]);
  assert.equal(await estadoDe(c, id), 'Abandonado');
}));

test('cancelar: Creada/Asignada pasan a Cancelado; uno en atención no', () => tx(async (c) => {
  const clinica = await clinicaHemodialisis(c);
  const noaf = await paciente(c);
  const creada = await crearTurno(c, noaf, clinica, 'CURRENT_DATE + 1');
  await c.query('CALL sp_cancelar_turno($1, $2)', [creada, 'tester']);
  assert.equal(await estadoDe(c, creada), 'Cancelado');

  const llamado = await crearTurno(c, noaf, clinica, 'CURRENT_DATE + 2');
  await c.query('CALL sp_asignar_turno($1, $2)', [llamado, USUARIO_A]);
  await cursor(c, 'CALL sp_actualizar_estado_llamado($1, $2, $3)', [llamado, USUARIO_A]);
  await rechaza(c, 'CALL sp_cancelar_turno($1, $2)', [llamado, 'tester'], /TURNO_NO_CANCELABLE/);
  await rechaza(c, 'CALL sp_cancelar_turno($1, $2)', ['NO-EXISTE', 'tester'], /TURNO_NO_ENCONTRADO/);
}));

test('la pestaña Crear solo lista turnos Creada del paciente', () => tx(async (c) => {
  const clinica = await clinicaHemodialisis(c);
  const noaf = await paciente(c);
  const creada = await crearTurno(c, noaf, clinica, 'CURRENT_DATE + 1');
  const asignada = await crearTurno(c, noaf, clinica, 'CURRENT_DATE + 2');
  await c.query('CALL sp_asignar_turno($1, $2)', [asignada, USUARIO_A]);
  const ids = (await cursor(c, 'CALL sp_mostrar_turnos_t($1, $2)', [noaf])).map((f) => f.id_turno);
  assert.deepEqual(ids, [creada]);
}));

test('la pestaña Asignación lista los Creada de hoy, no los de otros días', () => tx(async (c) => {
  const clinica = await clinicaHemodialisis(c);
  const noaf = await paciente(c);
  const deHoy = await crearTurno(c, noaf, clinica, 'CURRENT_DATE');
  const deManana = await crearTurno(c, noaf, clinica, 'CURRENT_DATE + 1');
  const ids = (await cursor(c, 'CALL sp_mostrar_turnos_creados_hoy($1)')).map((f) => f.id_turno);
  assert.ok(ids.includes(deHoy));
  assert.ok(!ids.includes(deManana));
}));

test('turnos Creada de días anteriores pasan solos a Faltante con el motivo automático', () => tx(async (c) => {
  const clinica = await clinicaHemodialisis(c);
  const noaf = await paciente(c);
  const ayer = await crearTurno(c, noaf, clinica, 'CURRENT_DATE - 1');
  const deHoy = await crearTurno(c, noaf, clinica, 'CURRENT_DATE');

  await c.query('CALL sp_marcar_faltantes_automaticos(0)');
  assert.equal(await estadoDe(c, ayer), 'Faltante');
  assert.equal(await estadoDe(c, deHoy), 'Creada');

  const falta = (await c.query('SELECT motivo_falta, usuario_creacion FROM tbl_faltistas WHERE no_afiliacion = $1', [noaf])).rows[0];
  assert.equal(falta.motivo_falta, 'No se presentó (Mensaje automático)');
  assert.equal(falta.usuario_creacion, 'sistema');

  // Idempotente
  const r = await c.query('CALL sp_marcar_faltantes_automaticos(0)');
  assert.equal(Number(r.rows[0].p_total), 0);
}));

test('turnos por período: solo los días de la jornada, desde hoy y sin duplicar', () => tx(async (c) => {
  const inicio = (await c.query(`SELECT to_char(CURRENT_DATE - 10, 'YYYY-MM-DD') AS d`)).rows[0].d;
  const fin = (await c.query(`SELECT to_char(CURRENT_DATE + 20, 'YYYY-MM-DD') AS d`)).rows[0].d;
  const noaf = await paciente(c, { jornada: 1, inicio, fin }); // 1 = L-M-V

  const r = await c.query('CALL sp_generar_turnos_periodo($1, $2, $3, $4, 0)', [noaf, inicio, fin, 'test']);
  const filas = await fechasDeTurnos(c, noaf, 'Creada');
  assert.equal(Number(r.rows[0].p_creados), filas.length);
  assert.ok(filas.length >= 8, 'debe generar los lunes, miércoles y viernes de los próximos 20 días');
  assert.ok(filas.every((f) => [1, 3, 5].includes(f.dow)), 'solo lunes, miércoles y viernes');
  const hoyDb = await hoy(c);
  assert.ok(filas.every((f) => f.d >= hoyDb), 'no genera días pasados');

  const otra = await c.query('CALL sp_generar_turnos_periodo($1, $2, $3, $4, 0)', [noaf, inicio, fin, 'test']);
  assert.equal(Number(otra.rows[0].p_creados), 0, 'no duplica');
}));

test('egreso cancela los turnos Creada del paciente', () => tx(async (c) => {
  const clinica = await clinicaHemodialisis(c);
  const noaf = await paciente(c);
  const t1 = await crearTurno(c, noaf, clinica, 'CURRENT_DATE + 1');
  const t2 = await crearTurno(c, noaf, clinica, 'CURRENT_DATE + 3');
  await c.query(
    'CALL sp_paciente_egreso($1, 1, $2, CURRENT_DATE, NULL, NULL, NULL, NULL, NULL, NULL, $3)',
    [noaf, 'prueba', 'test']
  );
  assert.equal(await estadoDe(c, t1), 'Cancelado');
  assert.equal(await estadoDe(c, t2), 'Cancelado');
}));

test('cambiar la jornada reprograma los turnos Creada a los días de la nueva jornada', () => tx(async (c) => {
  const inicio = await hoy(c);
  const fin = (await c.query(`SELECT to_char(CURRENT_DATE + 20, 'YYYY-MM-DD') AS d`)).rows[0].d;
  const noaf = await paciente(c, { jornada: 1, inicio, fin }); // L-M-V
  await c.query('CALL sp_generar_turnos_periodo($1, $2, $3, $4, 0)', [noaf, inicio, fin, 'test']);
  assert.ok((await fechasDeTurnos(c, noaf, 'Creada')).every((f) => [1, 3, 5].includes(f.dow)));

  // Jornada 3 = M-J-S (misma llamada que hace Actualizar Paciente)
  await cursor(c,
    'CALL sp_actualizar_paciente_por_noafiliacion($1, NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL, 3, NULL, NULL, $2, $3)',
    [noaf, 'test']);

  const nuevas = await fechasDeTurnos(c, noaf, 'Creada');
  assert.ok(nuevas.length > 0);
  assert.ok(nuevas.every((f) => [2, 4, 6].includes(f.dow)), 'todos en martes, jueves o sábado');
}));
