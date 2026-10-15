// Datos de prueba: 8 pacientes en distintos estados con turnos, faltas, formularios, laboratorios, nutrición,
// psicología, referencias, egresos, fallecimiento, reingreso y fotos, para revisar todas las pantallas.
// Se puede ejecutar varias veces: borra y vuelve a crear sus propios datos (afiliaciones 9100000001..8),
// sin tocar los demás. Las fechas son relativas a hoy (turnos de hoy para Asignación y Llamado).
//
// Uso:   npm run datos-prueba                      (local)
//        docker compose exec backend node db/datos-prueba.js   (preproducción)
// No corre con NODE_ENV=production (los pacientes son ficticios).
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const AFILIACIONES = Array.from({ length: 8 }, (_, i) => `910000000${i + 1}`);
const USUARIO = 'datos_prueba';
const FOTOS_DIR = path.join(__dirname, '..', 'fotos');

// [afiliación, dpi, nombres, apellidos, sexo, nacimiento, estado, jornada, acceso, departamento, foto]
const PACIENTES = [
  ['9100000001', '2910000000101', ['ANA', 'LUCÍA'], ['MORALES', 'PÉREZ'], 'Femenino', '1968-03-14', 'Activo', 1, 3, '01', [46, 125, 50]],
  ['9100000002', '2910000000202', ['CARLOS', 'ENRIQUE'], ['LÓPEZ', 'GARCÍA'], 'Masculino', '1975-07-02', 'Activo', 3, 2, '05', [21, 101, 192]],
  ['9100000003', '2910000000303', ['MARÍA', 'JOSÉ'], ['RAMÍREZ', 'CASTILLO'], 'Femenino', '1990-11-23', 'Nuevo ingreso', 2, 1, '09', null],
  ['9100000004', '2910000000404', ['JORGE', 'LUIS'], ['HERNÁNDEZ', 'SOTO'], 'Masculino', '1959-01-30', 'Egresado', 4, 3, '06', [123, 31, 162]],
  ['9100000005', '2910000000505', ['ROSA', 'ELENA'], ['GÓMEZ', 'DÍAZ'], 'Femenino', '1982-05-09', 'Egresado', 1, 2, '03', null],
  ['9100000006', '2910000000606', ['PEDRO', 'ANTONIO'], ['CHAVARRÍA', 'MÉNDEZ'], 'Masculino', '1950-09-17', 'Egresado', 2, 1, '13', null],
  ['9100000007', '2910000000707', ['SOFÍA', 'ISABEL'], ['VÁSQUEZ', 'ROJAS'], 'Femenino', '1987-12-04', 'Reingreso', 3, 3, '01', [194, 24, 91]],
  ['9100000008', '2910000000808', ['LUIS', 'FERNANDO'], ['ORTIZ', 'MEJÍA'], 'Masculino', '1971-04-21', 'Activo', 4, 3, '01', [230, 81, 0]],
];

// Imagen PNG de color sólido con una franja más clara (sin dependencias)
function png(ancho, alto, [r, g, b]) {
  const crc = (buf) => {
    let c = ~0;
    for (const byte of buf) { c ^= byte; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
    return (~c) >>> 0;
  };
  const bloque = (tipo, datos) => {
    const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
    const cuerpo = Buffer.concat([Buffer.from(tipo), datos]);
    const suma = Buffer.alloc(4); suma.writeUInt32BE(crc(cuerpo));
    return Buffer.concat([largo, cuerpo, suma]);
  };
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(ancho, 0); cabecera.writeUInt32BE(alto, 4);
  cabecera[8] = 8; cabecera[9] = 2; // 8 bits, RGB
  const filas = [];
  for (let y = 0; y < alto; y++) {
    const fila = Buffer.alloc(1 + ancho * 3);
    const claro = y > alto * 0.62 && y < alto * 0.78;
    for (let x = 0; x < ancho; x++) {
      fila[1 + x * 3] = claro ? 255 : r; fila[2 + x * 3] = claro ? 255 : g; fila[3 + x * 3] = claro ? 255 : b;
    }
    filas.push(fila);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque('IHDR', cabecera), bloque('IDAT', zlib.deflateSync(Buffer.concat(filas))), bloque('IEND', Buffer.alloc(0)),
  ]);
}

async function crearDatosPrueba(c) {
  const id = async (sql, params) => (await c.query(sql, params)).rows[0]?.id ?? null;
  const estado = (d) => id('SELECT id_estado AS id FROM tbl_estados_paciente WHERE descripcion = $1', [d]);
  const clinica = async (nombre) => id(
    `SELECT id_clinica AS id FROM tbl_clinica WHERE translate(upper(descripcion), 'ÁÉÍÓÚ', 'AEIOU') = $1`, [nombre]);
  const hemo = await clinica('HEMODIALISIS');
  const nutri = await clinica('NUTRICION');
  const psico = await clinica('PSICOLOGIA');
  if (!hemo || !nutri || !psico) throw new Error('Faltan las clínicas base (migración 003)');
  const estadoTurno = async (d) => id('SELECT id_estado_turno AS id FROM tbl_estados_turno WHERE descripcion = $1', [d]);
  const turno = {
    creada: await estadoTurno('Creada'), asignada: await estadoTurno('Asignada'), finalizado: await estadoTurno('Finalizado'),
    faltante: await estadoTurno('Faltante'), cancelado: await estadoTurno('Cancelado'), abandonado: await estadoTurno('Abandonado'),
  };
  const causa = async (d) => id('SELECT id_causa AS id FROM tbl_causa_egreso WHERE descripcion = $1', [d]);

  // 1. Limpiar lo creado antes por este script
  for (const t of ['tbl_parametros_laboratorio']) {
    await c.query(`DELETE FROM ${t} WHERE idlaboratorio IN (SELECT idlaboratorio FROM tbl_laboratorios WHERE no_afiliacion = ANY($1))`, [AFILIACIONES]);
  }
  for (const t of ['tbl_laboratorios', 'tbl_turnos', 'tbl_faltistas', 'tbl_historial_formularios', 'tbl_egresos', 'tbl_fallecimientos',
    'tbl_reingresos', 'tbl_referencias', 'tbl_informe_nutricion', 'tbl_informes_psicologia', 'tbl_casos_concluidos', 'tbl_pacientes']) {
    await c.query(`DELETE FROM ${t} WHERE no_afiliacion = ANY($1)`, [AFILIACIONES]);
  }

  // 2. Pacientes (con período de prestación vigente)
  for (const [naf, dpi, nombres, apellidos, sexo, nacimiento, est, jornada, acceso, depto, color] of PACIENTES) {
    const foto = color ? `${naf}.png` : null;
    if (foto) {
      fs.mkdirSync(FOTOS_DIR, { recursive: true });
      fs.writeFileSync(path.join(FOTOS_DIR, foto), png(160, 160, color));
    }
    await c.query(
      `INSERT INTO tbl_pacientes (no_afiliacion, dpi, no_paciente_proveedor, primer_nombre, segundo_nombre, primer_apellido,
         segundo_apellido, edad, fecha_nacimiento, sexo, direccion, fecha_ingreso, id_departamento, id_estado, id_acceso,
         numero_formulario_activo, id_jornada, sesiones_autorizadas_mes, inicio_prest_servicios, fin_prest_servicios,
         fecha_registro, url_foto, usuario_creacion, fecha_creacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, date_part('year', age($8::date))::int, $8, $9, $10,
         CURRENT_DATE - 400, $11, $12, $13, $14, $15, 13, date_trunc('month', CURRENT_DATE)::date,
         (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date, now(), $16, $17, now())`,
      [naf, dpi, `PRV-${naf.slice(-3)}`, nombres[0], nombres[1], apellidos[0], apellidos[1], nacimiento, sexo,
        `${Number(naf.slice(-1)) + 3}a. AVENIDA ${Number(naf.slice(-1)) * 7}-15, ZONA ${naf.slice(-1)}`,
        depto, await estado(est), acceso, `FORM-${naf.slice(-3)}-B`, jornada, foto, USUARIO]);
  }

  // 3. Turnos (fechas relativas a hoy). id: T-PRB-<afiliación>-<n>
  const turnos = [
    ['9100000001', hemo, turno.creada, 0], ['9100000001', nutri, turno.asignada, 0], ['9100000001', hemo, turno.finalizado, -7],
    ['9100000001', hemo, turno.faltante, -14], ['9100000001', psico, turno.cancelado, -3], ['9100000001', hemo, turno.creada, 2],
    ['9100000001', psico, turno.abandonado, -10],
    ['9100000002', hemo, turno.asignada, 0], ['9100000002', hemo, turno.finalizado, -2], ['9100000002', nutri, turno.creada, 5],
    ['9100000003', hemo, turno.creada, 0], ['9100000003', psico, turno.creada, 3],
    ['9100000007', hemo, turno.asignada, 0], ['9100000007', hemo, turno.finalizado, -1],
    ['9100000008', hemo, turno.asignada, 0], ['9100000008', nutri, turno.asignada, 0], ['9100000008', psico, turno.asignada, 0],
  ];
  const contador = {};
  for (const [naf, idClinica, idEstado, dias] of turnos) {
    contador[naf] = (contador[naf] || 0) + 1;
    const asignado = idEstado !== turno.creada && idEstado !== turno.cancelado;
    await c.query(
      `INSERT INTO tbl_turnos (id_turno, no_afiliacion, id_clinica, id_estado_turno, fecha_turno, fecha_asignacion,
         fecha_finalizacion, usuario_creacion, fecha_creacion, fecha_actualizacion)
       VALUES ($1, $2, $3, $4::bigint, CURRENT_DATE + $5::int, CASE WHEN $6::boolean THEN CURRENT_DATE + LEAST($5::int, 0) END,
         CASE WHEN $4::bigint = $7::bigint THEN CURRENT_DATE + $5::int END, $8, now() - interval '1 day' * (10 - $9::int), now())`,
      [`T-PRB-${naf}-${contador[naf]}`, naf, idClinica, idEstado, dias, asignado, turno.finalizado, USUARIO, contador[naf]]);
  }

  // 4. Faltas
  for (const [naf, idClinica, dias, motivo] of [
    ['9100000001', hemo, -14, 'No se presentó (Mensaje automático)'],
    ['9100000001', psico, -21, 'PACIENTE HOSPITALIZADO'],
    ['9100000002', nutri, -9, 'PROBLEMAS DE TRANSPORTE'],
    ['9100000007', hemo, -30, 'No se presentó (Mensaje automático)'],
  ]) {
    await c.query(
      `INSERT INTO tbl_faltistas (no_afiliacion, id_clinica, fecha_falta, motivo_falta, usuario_creacion, fecha_creacion)
       VALUES ($1, $2, CURRENT_DATE + $3::int, $4, $5, now())`, [naf, idClinica, dias, motivo, USUARIO]);
  }

  // 5. Historial de formularios (uno anterior y el vigente)
  for (const [naf, numero, autorizadas, realizadas, mesesAtras] of [
    ['9100000001', 'FORM-001-A', 13, 12, 1], ['9100000001', 'FORM-001-B', 13, null, 0],
    ['9100000002', 'FORM-002-B', 13, null, 0], ['9100000007', 'FORM-007-A', 12, 10, 3], ['9100000007', 'FORM-007-B', 13, null, 0],
  ]) {
    await c.query(
      `INSERT INTO tbl_historial_formularios (no_afiliacion, numero_formulario, sesiones_autorizadas_mes, sesiones_realizadas_mes,
         sesiones_no_realizadas_mes, inicio_prest_servicios, fin_prest_servicios, observaciones, usuario_creacion, fecha_creacion)
       VALUES ($1, $2, $3::int, $4::int, CASE WHEN $4::int IS NULL THEN NULL ELSE $3::int - $4::int END,
         (date_trunc('month', CURRENT_DATE) - interval '1 month' * $5::int)::date,
         (date_trunc('month', CURRENT_DATE) - interval '1 month' * $5::int + interval '1 month - 1 day')::date,
         $6, $7, now() - interval '30 days' * $5::int)`,
      [naf, numero, autorizadas, realizadas, mesesAtras, mesesAtras ? 'PERÍODO CERRADO' : null, USUARIO]);
  }

  // 6. Laboratorios con parámetros
  const laboratorios = [
    ['9100000001', 1, -40, true, { 'Albúmina gr/dl': '3.8', 'Nivel de Hemoglobina (Hb = g/dl)': '10.9', Creatinina: '7.4', Potasio: '5.1', 'Fósforo mg/dl': '5.6' }],
    ['9100000001', 1, -10, true, { 'Albúmina gr/dl': '3.9', 'Nivel de Hemoglobina (Hb = g/dl)': '11.2', Creatinina: '7.1', Potasio: '4.8', 'BUN Pre-Hemodiálisis': '62' }],
    ['9100000002', 2, -20, true, { 'Nivel de Hemoglobina (Hb = g/dl)': '9.8', 'Calcio mg/dl': '8.9', Sodio: '138' }],
    ['9100000008', 1, -5, false, {}],
  ];
  for (const [naf, periodicidad, dias, realizado, parametros] of laboratorios) {
    const idLab = await id(
      `INSERT INTO tbl_laboratorios (no_afiliacion, idperlaboratorio, fecha_laboratorio, infeccion_acceso, complicacion_acceso,
         observacion, examen_realizado, causa_no_realizado, virologia, antigeno_hepatitis_c, antigeno_superficie, hiv,
         usuario_creacion, fecha_creacion)
       VALUES ($1, $2, CURRENT_DATE + $3::int, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
       RETURNING idlaboratorio AS id`,
      [naf, periodicidad, dias, realizado ? 'No' : null, realizado ? 'No' : null, realizado ? 'CONTROL DE RUTINA' : null,
        realizado, realizado ? null : 'PACIENTE NO SE PRESENTÓ A LA TOMA DE MUESTRA', realizado ? 'Negativo' : null,
        realizado ? false : null, realizado ? false : null, realizado ? 'Negativo' : null, USUARIO]);
    for (const [parametro, valor] of Object.entries(parametros)) {
      await c.query(
        'INSERT INTO tbl_parametros_laboratorio (idlaboratorio, parametro, valor, usuario_creacion, fecha_creacion) VALUES ($1, $2, $3, $4, now())',
        [idLab, parametro, valor, USUARIO]);
    }
  }

  // 7. Nutrición y psicología
  for (const [naf, n, motivo, estadoNut, altura, peso, dias] of [
    ['9100000001', 1, 'Nuevo', 'Peso normal', 158, 56, -60], ['9100000001', 2, 'Control', 'Sobrepeso', 158, 64.5, -5],
    ['9100000002', 1, 'Nuevo', 'Bajo peso', 172, 53, -15],
  ]) {
    await c.query(
      `INSERT INTO tbl_informe_nutricion (id_informe, no_afiliacion, motivo_consulta, estado_nutricional, altura_cm, peso_kg, imc,
         observaciones, usuario_creacion, fecha_creacion)
       VALUES ($1, $2, $3, $4, $5, $6, round(($6 / (($5 / 100.0) ^ 2))::numeric, 2), $7, $8, now() + interval '1 day' * $9::int)`,
      [`NUT-PRB-${naf}-${n}`, naf, motivo, estadoNut, altura, peso, 'DIETA BAJA EN POTASIO', USUARIO, dias]);
  }
  for (const [naf, n, kdqol, dias] of [['9100000001', 1, true, -30], ['9100000002', 1, false, -12]]) {
    await c.query(
      `INSERT INTO tbl_informes_psicologia (id_informe, no_afiliacion, motivo_consulta, tipo_consulta, tipo_atencion,
         pronostico_paciente, aplicacion_kdqol, fisico_mental, enfermedad_renal, sintomas_problemas, efectos_enfermedad,
         vida_diaria, observaciones, usuario_creacion, fecha_creacion)
       VALUES ($1, $2, 'ANSIEDAD POR EL TRATAMIENTO', 'Consulta', 'Programada', 'Favorable', $3,
         CASE WHEN $3 THEN 62 END, CASE WHEN $3 THEN 55 END, CASE WHEN $3 THEN 70 END, CASE WHEN $3 THEN 48 END,
         CASE WHEN $3 THEN 66 END, 'SEGUIMIENTO MENSUAL', $4, now() + interval '1 day' * $5::int)`,
      [`PSI-PRB-${naf}-${n}`, naf, kdqol, USUARIO, dias]);
  }

  // 8. Referencias (con médicos de prueba si no hay ninguno)
  if (!(await id('SELECT id_medico AS id FROM tbl_medicos LIMIT 1'))) {
    await c.query(`INSERT INTO tbl_medicos (nombre_medico, estado, usuario_creacion, fecha_creacion)
      VALUES ('DR. PRUEBA NEFROLOGÍA', true, $1, now()), ('DRA. PRUEBA MEDICINA INTERNA', true, $1, now())`, [USUARIO]);
  }
  const medico = await id('SELECT id_medico AS id FROM tbl_medicos WHERE estado IS NOT FALSE ORDER BY id_medico LIMIT 1');
  await c.query(
    `INSERT INTO tbl_referencias (id_referencia, no_afiliacion, id_medico, fecha_referencia, motivo_traslado, especialidad_referencia,
       usuario_creacion, fecha_creacion)
     VALUES ('REF-PRB-9100000001-1', '9100000001', $1, CURRENT_DATE - 8, 'EVALUACIÓN DE ACCESO VASCULAR', 'CIRUGÍA VASCULAR', $2, now())`,
    [medico, USUARIO]);

  // 9. Egresos, fallecimiento y reingreso
  for (const [naf, causaEgreso, dias, descripcion] of [
    ['9100000004', 'Alta medica', -20, 'TRASPLANTE RENAL EXITOSO'],
    ['9100000005', 'Traslado', -35, 'TRASLADO A UNIDAD DE QUETZALTENANGO'],
    ['9100000006', 'Fallecido', -12, 'FALLECIMIENTO'],
    ['9100000007', 'Abandono de tratamiento', -90, 'DEJÓ DE ASISTIR'],
  ]) {
    await c.query(
      `INSERT INTO tbl_egresos (no_afiliacion, id_causa_egreso, descripcion, fecha_egreso, observaciones, usuario_creacion, fecha_creacion)
       VALUES ($1, $2, $3, CURRENT_DATE + $4::int, $5, $6, now() + interval '1 day' * $4::int)`,
      [naf, await causa(causaEgreso), descripcion, dias, `EGRESO REGISTRADO PARA PRUEBAS (${causaEgreso.toUpperCase()})`, USUARIO]);
  }
  await c.query(
    `INSERT INTO tbl_fallecimientos (no_afiliacion, comorbilidades, fechafallecido, lugarfallecimiento, causafallecimiento,
       observaciones, usuario_creacion, fecha_creacion)
     VALUES ('9100000006', 'DIABETES MELLITUS TIPO 2, HIPERTENSIÓN', CURRENT_DATE - 12, 'HOSPITAL GENERAL SAN JUAN DE DIOS',
       'PARO CARDIORRESPIRATORIO', 'DATOS DE PRUEBA', $1, now())`, [USUARIO]);
  await c.query(
    `INSERT INTO tbl_reingresos (no_afiliacion, numero_formulario, sesiones_autorizadas_mes, inicio_prest_servicios,
       fin_prest_servicios, fecha_reingreso, observaciones, usuario_creacion, fecha_creacion)
     VALUES ('9100000007', 'FORM-007-B', 13, date_trunc('month', CURRENT_DATE)::date,
       (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date, CURRENT_DATE - 30, 'REINICIA TRATAMIENTO', $1, now() - interval '30 days')`,
    [USUARIO]);

  return { pacientes: PACIENTES.length, turnos: turnos.length, laboratorios: laboratorios.length };
}

module.exports = { crearDatosPrueba, AFILIACIONES };

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
  if (process.env.NODE_ENV === 'production') {
    console.error('No se cargan datos de prueba con NODE_ENV=production.');
    process.exit(1);
  }
  const pool = require('./pool');
  (async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const r = await crearDatosPrueba(c);
      await c.query('COMMIT');
      console.log(`Datos de prueba listos: ${r.pacientes} pacientes (${AFILIACIONES[0]}..${AFILIACIONES.at(-1)}), ${r.turnos} turnos, ${r.laboratorios} laboratorios.`);
    } catch (err) {
      await c.query('ROLLBACK');
      console.error('No se cargaron los datos de prueba:', err.message);
      process.exitCode = 1;
    } finally {
      c.release();
      await pool.end();
    }
  })();
}
