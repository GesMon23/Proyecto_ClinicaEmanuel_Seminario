// Acceso a datos de pacientes: llamadas a procedimientos almacenados (las reglas viven en PostgreSQL)
// y las pocas consultas directas que ya existían.
const { pool, withTransaction, runWithUser, fetchCursor, callProcedure } = require('../../shared/database');

// ---- Catálogos ----
const departamentos = () => withTransaction((c) => fetchCursor(c, 'public.sp_departamentos_lista', [], 'cur_departamentos_lista'));
const accesosVasculares = () => withTransaction((c) => fetchCursor(c, 'public.sp_accesos_vasculares_activos', [], 'cur_accesos_vasculares_activos'));
const jornadasActivas = () => withTransaction((c) => fetchCursor(c, 'public.sp_jornadas_activas', [], 'cur_jornadas_activas'));
const causasEgresoActivas = () => withTransaction((c) => fetchCursor(c, 'public.sp_causas_egreso_activas', [], 'cur_causas_egreso_activas'));

// ---- Existencia (unicidad) ----
async function existeDpi(dpi) {
  const filas = await withTransaction((c) => fetchCursor(c, 'public.sp_pacientes_existe_dpi', [dpi], 'cur_existe_dpi'));
  return filas[0]?.existe === true;
}
async function existeNoAfiliacion(noAfiliacion) {
  const filas = await withTransaction((c) => fetchCursor(c, 'public.sp_pacientes_existe_noafiliacion', [noAfiliacion], 'cur_existe_noaf'));
  return filas[0]?.existe === true;
}

// ---- Registro ----
// `parametros`: los 25 valores de sp_paciente_insertar antes del cursor
const insertarPaciente = (parametros, actor) =>
  runWithUser(actor, (c) => fetchCursor(c, 'public.sp_paciente_insertar', parametros, 'cur_paciente_insertar'));

const carnetDatos = (noAfiliacion) =>
  withTransaction((c) => fetchCursor(c, 'public.sp_paciente_carnet_datos', [noAfiliacion], 'cur_paciente_carnet'));

// ---- Actualización ----
const pacienteParaActualizacion = (dpi, noAfiliacion) =>
  withTransaction((c) => fetchCursor(c, 'public.sp_paciente_para_actualizacion', [dpi || null, noAfiliacion || null], 'cur_paciente_para_actualizacion'));

async function datosBasicos(noAfiliacion) {
  const r = await pool.query('SELECT dpi, id_jornada FROM public.tbl_pacientes WHERE no_afiliacion = $1', [noAfiliacion]);
  return r.rows[0] || null;
}

async function titularesDeDpi(dpi) {
  const r = await pool.query('SELECT no_afiliacion FROM public.tbl_pacientes WHERE dpi = $1', [dpi]);
  return r.rows.map((f) => String(f.no_afiliacion || ''));
}

// UPDATE directo (sin tocar el DPI) con todos los campos editables; devuelve la fila actualizada
async function actualizarDirecto(noAfiliacion, d) {
  const r = await pool.query(
    `UPDATE public.tbl_pacientes
        SET primer_nombre=$1, segundo_nombre=$2, otros_nombres=$3,
            primer_apellido=$4, segundo_apellido=$5, apellido_casada=$6,
            edad=$7, fecha_nacimiento=$8, sexo=$9, direccion=$10,
            fecha_ingreso=$11, id_departamento=$12, id_acceso=$13,
            numero_formulario_activo=$14, id_jornada=$15,
            sesiones_autorizadas_mes=$16, url_foto=$17
      WHERE no_afiliacion=$18
      RETURNING *`,
    [
      d.primer_nombre, d.segundo_nombre, d.otros_nombres,
      d.primer_apellido, d.segundo_apellido, d.apellido_casada,
      d.edad, d.fecha_nacimiento, d.sexo, d.direccion,
      d.fecha_ingreso, d.id_departamento, d.id_acceso,
      d.numero_formulario_activo, d.id_jornada,
      d.sesiones_autorizadas_mes, d.url_foto,
      noAfiliacion,
    ]
  );
  return r.rows[0] || null;
}

// `parametros`: los 20 valores de sp_actualizar_paciente_por_noafiliacion antes del cursor
const actualizarConProcedimiento = (parametros) =>
  withTransaction((c) => fetchCursor(c, 'public.sp_actualizar_paciente_por_noafiliacion', parametros, 'cur_actualizar_paciente_por_noafiliacion'));

const reprogramarTurnosPorJornada = (noAfiliacion, actor) =>
  pool.query('CALL public.sp_reprogramar_turnos_jornada($1, $2, 0)', [noAfiliacion, actor]);

const actualizarFoto = (noAfiliacion, filename, actor) =>
  withTransaction((c) => callProcedure(c, 'public.sp_paciente_actualizar_foto', [noAfiliacion, filename, String(actor)]));

// ---- Egreso / Reingreso ----
const pacientesParaEgreso = (dpi, noAfiliacion) =>
  withTransaction((c) => fetchCursor(c, 'public.sp_pacientes_para_egreso', [dpi || null, noAfiliacion || null], 'cur_pacientes_para_egreso'));
const pacientesParaReingreso = (dpi, noAfiliacion) =>
  withTransaction((c) => fetchCursor(c, 'public.sp_pacientes_para_reingreso', [dpi || null, noAfiliacion || null], 'cur_pacientes_para_reingreso'));

// PUT /pacientes/:noAfiliacion: egreso o actualización de reingreso, auditado con el usuario. Devuelve la fila del paciente.
async function actualizarPorEgresoOReingreso({ noAfiliacion, modo, datos }, actor) {
  return runWithUser(actor, async (c) => {
    if (modo === 'egreso') {
      await callProcedure(c, 'public.sp_paciente_egreso', [
        noAfiliacion,
        datos.idcausa, datos.causaegreso, datos.fechaegreso, datos.nocasoconcluido,
        datos.observaciones, datos.comorbilidades, datos.fechafallecimiento, datos.lugarfallecimiento, datos.causafallecimiento,
        String(actor),
      ]);
    } else {
      await callProcedure(c, 'public.sp_paciente_reingreso_actualizar', [
        noAfiliacion,
        datos.primerNombre, datos.segundoNombre, datos.primerApellido, datos.segundoApellido,
        datos.numeroformulario, datos.sesionesautorizadasmes, datos.fechainicioperiodo, datos.fechafinperiodo,
        datos.observaciones, String(actor),
      ]);
    }
    const r = await c.query('SELECT * FROM public.tbl_pacientes WHERE no_afiliacion = $1', [noAfiliacion]);
    return r.rows[0] || null;
  });
}

// POST /egresos: registra el egreso y devuelve { insert, update } (egreso insertado y paciente actualizado)
async function registrarEgreso(d, actor) {
  return runWithUser(actor, async (c) => {
    await callProcedure(c, 'public.sp_paciente_registrar_egreso', [
      d.no_afiliacion,
      d.id_causa_egreso,
      d.descripcion || null,
      d.fecha_egreso || null,
      d.observaciones || null,
      d.comorbilidades || null,
      d.fechafallecimiento || null,
      d.lugarfallecimiento || null,
      d.causafallecimiento || null,
      String(actor),
      'cur_paciente_updated_after_egreso',
      'cur_egreso_insertado',
      'cur_tipo',
    ]);
    const paciente = await c.query('FETCH ALL FROM "cur_paciente_updated_after_egreso"');
    const egreso = await c.query('FETCH ALL FROM "cur_egreso_insertado"');
    return { insert: egreso.rows[0] || null, update: paciente.rows[0] || null };
  });
}

const insertarReingreso = (d, actor) =>
  runWithUser(actor, (c) => fetchCursor(c, 'public.sp_paciente_reingreso_insertar',
    [d.noAfiliacion, d.numeroFormulario, d.sesionesMes, d.inicioPrest, d.finPrest, d.fechaReingreso, d.observaciones],
    'cur_paciente_post_reingreso'));

const insertarHistorialReingreso = (d, actor) =>
  runWithUser(actor, (c) => fetchCursor(c, 'public.sp_reingreso_insertar',
    [d.noAfiliacion, d.numeroFormulario, d.fechaReingreso || null, d.observaciones || null, String(actor)],
    'cur_reingreso_insert'));

// ---- Formularios ----
// Datos de estado de cada paciente (un cursor por paciente dentro de la misma transacción)
const pacientesPorAfiliacion = (afiliaciones) =>
  withTransaction(async (c) => {
    const filas = [];
    for (let i = 0; i < afiliaciones.length; i++) {
      const r = await fetchCursor(c, 'public.sp_paciente_por_afiliacion', [afiliaciones[i]], `cur_pac_form_estado_${i}`);
      filas.push(r[0] || null);
    }
    return filas;
  });

const registrarFormularios = (pacientesJson, actor) =>
  runWithUser(actor, (c) => callProcedure(c, 'sp_registro_formularios', [pacientesJson, actor]));

const tablaFormularios = (noAfiliacion) =>
  withTransaction((c) => fetchCursor(c, 'public.sp_mostrar_pacientes_tabla_formularios', [noAfiliacion], 'cur_mostrar_pac_form'));

module.exports = {
  departamentos, accesosVasculares, jornadasActivas, causasEgresoActivas,
  existeDpi, existeNoAfiliacion,
  insertarPaciente, carnetDatos,
  pacienteParaActualizacion, datosBasicos, titularesDeDpi, actualizarDirecto, actualizarConProcedimiento,
  reprogramarTurnosPorJornada, actualizarFoto,
  pacientesParaEgreso, pacientesParaReingreso, actualizarPorEgresoOReingreso, registrarEgreso,
  insertarReingreso, insertarHistorialReingreso,
  pacientesPorAfiliacion, registrarFormularios, tablaFormularios,
};
