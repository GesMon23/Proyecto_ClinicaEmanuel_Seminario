// Procedimientos de consulta corregidos (migración 009) y catálogos de laboratorio (008), sobre los datos de
// prueba de db/datos-prueba.js cargados en una transacción que se revierte.
const { test, after } = require('node:test');
const { assert, pool, tx, cursor } = require('./helpers');
const { crearDatosPrueba } = require('../db/datos-prueba');
const { nombreSeguro, resolverRutaFoto } = require('../src/modules/pacientes/fotos');

after(() => pool.end());

// Carga los datos de prueba y ejecuta fn(c) en la misma transacción (que se revierte)
const conDatos = (fn) => tx(async (c) => { await crearDatosPrueba(c); await fn(c); });

test('datos de prueba: 8 pacientes en sus estados, con turnos, faltas, laboratorios y egresos', async () => {
  await conDatos(async (c) => {
    const n = async (sql) => (await c.query(sql)).rows[0].n;
    assert.equal(await n(`SELECT count(*)::int n FROM tbl_pacientes WHERE no_afiliacion LIKE '91000000%'`), 8);
    assert.equal(await n(`SELECT count(*)::int n FROM tbl_turnos WHERE id_turno LIKE 'T-PRB-%'`), 17);
    assert.equal(await n(`SELECT count(*)::int n FROM tbl_egresos WHERE no_afiliacion LIKE '91000000%'`), 4);
    assert.equal(await n(`SELECT count(*)::int n FROM tbl_fallecimientos WHERE no_afiliacion = '9100000006'`), 1);
    // Se puede volver a cargar sin duplicar
    await crearDatosPrueba(c);
    assert.equal(await n(`SELECT count(*)::int n FROM tbl_turnos WHERE id_turno LIKE 'T-PRB-%'`), 17);
  });
});

test('laboratorio: las periodicidades del formulario existen (1 Mensual, 2 Trimestral, 3 Semestral)', async () => {
  const { rows } = await pool.query(`SELECT idperlaboratorio::int AS id, descripcion FROM tbl_periodicidadlaboratorio
    WHERE descripcion IN ('Mensual', 'Trimestral', 'Semestral') ORDER BY 1`);
  assert.deepEqual(rows.map((r) => r.descripcion), ['Mensual', 'Trimestral', 'Semestral']);
});

test('egreso y reingreso: la ficha trae departamento, jornada, acceso y la causa del último egreso', async () => {
  await conDatos(async (c) => {
    const [egreso] = await cursor(c, 'CALL sp_pacientes_para_egreso(NULL, $1, $2)', ['9100000001']);
    for (const campo of ['departamento_nombre', 'jornada_descripcion', 'acceso_descripcion', 'estado_descripcion']) {
      assert.ok(egreso[campo], `egreso: falta ${campo}`);
    }
    const [reingreso] = await cursor(c, 'CALL sp_pacientes_para_reingreso(NULL, $1, $2)', ['9100000004']);
    assert.equal(reingreso.departamento_nombre, 'SANTA ROSA');
    assert.equal(reingreso.causaegreso_descripcion, 'Alta medica');
    assert.ok(reingreso.jornada_descripcion && reingreso.acceso_descripcion);
    const activo = await cursor(c, 'CALL sp_pacientes_para_reingreso(NULL, $1, $2)', ['9100000001']);
    assert.equal(activo.length, 0, 'un paciente activo no es candidato a reingreso');
  });
});

test('ficha del paciente: historial con fechas reales, todos los turnos y faltas con detalle', async () => {
  await conDatos(async (c) => {
    const historial = await cursor(c, 'CALL sp_historial_paciente($1, $2)', ['9100000007']);
    assert.deepEqual(historial.map((h) => h.estado).sort(), ['Egreso', 'Formulario', 'Formulario', 'Reingreso']);
    assert.ok(historial.every((h) => /^\d{4}-\d{2}-\d{2}$/.test(h.fecha)), 'fecha YYYY-MM-DD');
    assert.ok(historial.find((h) => h.estado === 'Formulario').periodo.includes(' al '));
    assert.deepEqual(historial.map((h) => Number(h.numero_gestion)).sort(), [1, 2, 3, 4]);

    const turnos = await cursor(c, 'CALL sp_consulta_turnos_por_afiliacion($1, $2)', ['9100000001']);
    assert.equal(turnos.length, 7, 'todos los turnos, no solo los de hoy');
    assert.ok(turnos.every((t) => t.nombrepaciente === 'ANA LUCÍA MORALES PÉREZ' && t.estado_descripcion && t.nombre_clinica));

    const faltas = await cursor(c, 'CALL sp_faltistas_por_afiliacion($1, $2)', ['9100000001']);
    assert.equal(faltas.length, 2);
    for (const campo of ['noafiliacion', 'nombres', 'apellidos', 'sexo', 'jornada', 'accesovascular', 'departamento', 'clinica', 'motivo_falta']) {
      assert.ok(faltas[0][campo], `falta: falta ${campo}`);
    }
  });
});

test('Consulta de Turnos y reporte de Egresos: devuelven las columnas que muestran las tablas', async () => {
  await conDatos(async (c) => {
    const [turno] = await cursor(c, 'CALL sp_mostrar_turnos_todos($1, NULL, NULL, NULL, $2)', ['9100000002']);
    for (const campo of ['id_turno_cod', 'numeroafiliacion', 'nombrepaciente', 'fecha', 'nombreclinica', 'estado']) {
      assert.ok(turno[campo], `turnos: falta ${campo}`);
    }
    assert.match(turno.fecha, /^\d{4}-\d{2}-\d{2}$/);

    const egresos = await cursor(c, `CALL sp_egreso_filtrado(NULL, NULL, 'Traslado', NULL, NULL, NULL, NULL, $1)`, []);
    const rosa = egresos.find((e) => e.noafiliacion === '9100000005');
    for (const campo of ['nombre_completo', 'sexo', 'jornada', 'accesovascular', 'departamento', 'fechanacimiento', 'fechaingreso', 'fechaegreso']) {
      assert.ok(rosa[campo], `egreso: falta ${campo}`);
    }
  });
});

test('fotos: el nombre del archivo solo admite afiliaciones seguras y nunca sale de la carpeta', () => {
  assert.equal(nombreSeguro('123AA'), '123AA');
  assert.equal(nombreSeguro('9100000001'), '9100000001');
  for (const malo of ['../../etc/passwd', '..', 'a/b', 'a\\b', '', 'x y']) {
    assert.throws(() => nombreSeguro(malo), (e) => e.status === 400, malo);
  }
  assert.equal(resolverRutaFoto({ url_foto: '../../package.json' }, 'NO-EXISTE'), null, 'una url_foto con ../ no se sirve');
});
