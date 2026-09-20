// Consulta de pacientes (lectura): cada función llama a un procedimiento almacenado.
const { pool, withTransaction, fetchCursor } = require('../../shared/database');

const porAfiliacion = (procedimiento, cursor) => (noAfiliacion) =>
  withTransaction((c) => fetchCursor(c, `public.${procedimiento}`, [noAfiliacion], cursor));

// ---- Catálogos ----
const departamentos = () => withTransaction((c) => fetchCursor(c, 'public.sp_catalogo_departamentos', [], 'cur_cat_deptos'));
const accesosVasculares = () => withTransaction((c) => fetchCursor(c, 'public.sp_catalogo_accesos_vascular', [], 'cur_cat_accesos'));

// Si el procedimiento falla se consulta la tabla directamente
async function estadosPaciente() {
  try {
    return await withTransaction((c) => fetchCursor(c, 'public.sp_catalogo_estados_paciente', [], 'cur_cat_estados'));
  } catch (err) {
    console.error('Error SP sp_catalogo_estados_paciente, aplicando fallback SELECT:', err);
    const r = await pool.query('SELECT id_estado, descripcion FROM public.tbl_estados_paciente ORDER BY descripcion ASC');
    return r.rows;
  }
}

// ---- Paciente ----
async function pacientePorAfiliacion(noAfiliacion) {
  const filas = await withTransaction((c) => fetchCursor(c, 'public.sp_paciente_por_afiliacion', [noAfiliacion], 'cur_pac_af'));
  return filas[0] || null;
}

async function pacientePorDpi(dpi) {
  const filas = await withTransaction((c) => fetchCursor(c, 'public.sp_paciente_por_dpi', [dpi], 'cur_pac_dpi'));
  return filas[0] || null;
}

async function filaPaciente(noAfiliacion) {
  const r = await pool.query('SELECT * FROM tbl_pacientes WHERE no_afiliacion = $1', [noAfiliacion]);
  return r.rows[0] || null;
}

// Resuelve el no. de afiliación de un DPI; null si no existe
async function noAfiliacionDeDpi(dpi) {
  const filas = await withTransaction((c) => fetchCursor(c, 'public.sp_resolver_no_afiliacion_por_dpi', [dpi], 'cur_resolve_af'));
  return filas[0]?.no_afiliacion || null;
}

// url_foto registrada del paciente; la foto es opcional, así que un fallo se trata como "sin dato"
async function urlFoto(noAfiliacion) {
  try {
    const filas = await withTransaction((c) => fetchCursor(c, 'public.sp_paciente_url_foto', [noAfiliacion], 'cur_pac_url_foto'));
    return filas[0]?.url_foto || null;
  } catch (_) {
    return null;
  }
}

// ---- Historiales por afiliación ----
const laboratorios = porAfiliacion('sp_laboratorios_historial_por_afiliacion', 'cur_lab_historial_afiliacion_consulta_pac');
const turnos = porAfiliacion('sp_consulta_turnos_por_afiliacion', 'cur_turnos_pac');
const historial = porAfiliacion('sp_historial_paciente', 'cur_hist_pac');
const referencias = porAfiliacion('sp_referencias_por_afiliacion', 'cur_ref_pac');
const nutricion = porAfiliacion('sp_nutricion_por_afiliacion', 'cur_nutri_pac');
const psicologia = porAfiliacion('sp_psicologia_por_afiliacion', 'cur_psico_pac');
const formularios = porAfiliacion('sp_formularios_por_afiliacion', 'cur_form_pac');
const faltistas = porAfiliacion('sp_faltistas_por_afiliacion', 'cur_falt_pac');

// ---- Altas de historial ----
async function crearHistorialFormulario(d) {
  const filas = await withTransaction((c) => fetchCursor(c, 'public.sp_historial_formulario_crear', [
    d.no_afiliacion,
    d.numero_formulario,
    d.sesiones_autorizadas_mes || null,
    d.sesiones_realizadas_mes || null,
    d.sesiones_no_realizadas_mes || null,
    d.usuario_creacion || 'sistema',
    d.inicio_prest_servicios || null,
    d.fin_prest_servicios || null,
  ], 'cur_ins_hist_form'));
  return filas[0] || {};
}

async function crearEgreso(d) {
  const filas = await withTransaction((c) => fetchCursor(c, 'public.sp_egreso_crear', [
    d.no_afiliacion,
    d.id_causa_egreso,
    d.descripcion || null,
    d.fecha_egreso || null,
    d.observaciones || null,
    d.usuario_creacion || 'sistema',
  ], 'cur_ins_egreso'));
  return filas[0] || {};
}

module.exports = {
  departamentos, accesosVasculares, estadosPaciente,
  pacientePorAfiliacion, pacientePorDpi, filaPaciente, noAfiliacionDeDpi, urlFoto,
  laboratorios, turnos, historial, referencias, nutricion, psicologia, formularios, faltistas,
  crearHistorialFormulario, crearEgreso,
};
