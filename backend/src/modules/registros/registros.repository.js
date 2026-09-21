// Acceso a datos de los registros clínicos (nutrición, psicología, laboratorios, referencias, médicos).
const { pool, withTransaction, runWithUser, fetchCursor } = require('../../shared/database');

// Datos de estado del paciente (null si no existe)
const pacientePorAfiliacion = (noAfiliacion) =>
  withTransaction(async (c) => {
    const filas = await fetchCursor(c, 'public.sp_paciente_por_afiliacion', [noAfiliacion], 'cur_pac_registro');
    return filas[0] || null;
  });

// Nombre con el que se firma el registro (fn_resolver_actor); null si no se puede resolver
async function resolverActor(payload) {
  if (!payload) return null;
  try {
    const idJwt = payload.sub ? Number(payload.sub) : null;
    const { rows } = await pool.query('SELECT public.fn_resolver_actor($1, $2) AS actor_nombre', [payload.nombre_usuario || null, idJwt]);
    return rows[0]?.actor_nombre || null;
  } catch {
    return null;
  }
}

const guardarNutricion = (params, actor) =>
  runWithUser(actor, async (c) => {
    const filas = await fetchCursor(c, 'public.sp_guardar_informe_nutricion', params, 'cur_guardar_informe_nutricion');
    return filas[0]?.result || null;
  });

const guardarPsicologia = (params, actor) =>
  runWithUser(actor, async (c) => {
    const filas = await fetchCursor(c, 'public.sp_guardar_evaluacion_psicologia', params, 'cur_guardar_evaluacion_psicologia');
    return filas[0]?.result;
  });

const laboratoriosPorAfiliacion = (noAfiliacion) =>
  withTransaction((c) => fetchCursor(c, 'public.sp_laboratorios_por_afiliacion', [noAfiliacion], 'cur_labs_afiliacion'));

const parametrosUltimoLaboratorio = (noAfiliacion) =>
  withTransaction((c) => fetchCursor(c, 'public.sp_laboratorios_parametros_ultimo', [noAfiliacion], 'cur_param_ult'));

const insertarLaboratorio = (params, actor) =>
  runWithUser(actor, async (c) => {
    const filas = await fetchCursor(c, 'public.sp_laboratorios_insertar', params, 'cur_ins_lab');
    return filas[0] || {};
  });

const registrarReferencia = (params, actor) =>
  runWithUser(actor, (c) => fetchCursor(c, 'public.sp_registrar_referencia', params, 'cur_registrar_referencia'));

const medicos = () =>
  withTransaction((c) => fetchCursor(c, 'public.sp_mostrar_medicos', [], 'cur_mostrar_medicos'));

module.exports = {
  pacientePorAfiliacion, resolverActor, guardarNutricion, guardarPsicologia,
  laboratoriosPorAfiliacion, parametrosUltimoLaboratorio, insertarLaboratorio,
  registrarReferencia, medicos,
};
