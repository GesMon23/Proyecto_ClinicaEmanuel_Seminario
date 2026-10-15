// Consultas de historiales (laboratorios, nutrición, psicología, referencias): un procedimiento por consulta.
const { withTransaction, fetchCursor } = require('../../shared/database');

const consultar = (procedimiento, parametros, cursor) =>
  withTransaction((c) => fetchCursor(c, `public.${procedimiento}`, parametros, cursor));

// ---- Laboratorios ----
async function catalogosLaboratorios() {
  return withTransaction(async (c) => {
    const periodicidades = await fetchCursor(c, 'public.sp_laboratorios_catalogo_periodicidades', [], 'cur_cat_periodicidades_lab');
    const sexos = await fetchCursor(c, 'public.sp_laboratorios_catalogo_sexos', [], 'cur_cat_sexos_lab');
    return {
      periodicidades: periodicidades.map((r) => r.descripcion).filter(Boolean),
      sexos: sexos.map((r) => r.sexo).filter(Boolean),
    };
  });
}
const laboratoriosPorAfiliacion = (noAfiliacion) =>
  consultar('sp_laboratorios_historial_por_afiliacion', [noAfiliacion], 'cur_lab_historial_afiliacion');
const laboratoriosFiltrado = (p) =>
  consultar('sp_laboratorios_historial_filtrado', [p.desde, p.hasta, p.noAfiliacion, p.idLaboratorio, p.sexo, p.periodicidad], 'cur_lab_historial_filtrado');

// ---- Nutrición ----
const nutricionPorAfiliacion = (noAfiliacion) =>
  consultar('sp_historial_nutricion_por_afiliacion', [noAfiliacion], 'cur_hist_nutri_afiliacion');
const nutricionFiltrado = (p) =>
  consultar('sp_historial_nutricion_filtrado', [p.desde, p.hasta, p.noAfiliacion, p.idInforme, p.sexo], 'cur_hist_nutri_filtrado');

// ---- Psicología ----
const psicologiaPorAfiliacion = (noAfiliacion) =>
  consultar('sp_historial_psicologia_por_afiliacion', [noAfiliacion], 'cur_hist_psico_afiliacion');
const psicologiaFiltrado = (p) =>
  consultar('sp_historial_psicologia_filtrado', [p.desde, p.hasta, p.noAfiliacion, p.idInforme, p.sexo], 'cur_hist_psico_filtrado');

// ---- Referencias ----
const referenciasFiltrado = (p) =>
  consultar('sp_consultar_referencias_filtrado', [p.desde, p.hasta, p.idMedico, p.noAfiliacion, p.idReferencia, p.sexo], 'cur_consulta_referencias_filtrado');

module.exports = {
  catalogosLaboratorios, laboratoriosPorAfiliacion, laboratoriosFiltrado,
  nutricionPorAfiliacion, nutricionFiltrado,
  psicologiaPorAfiliacion, psicologiaFiltrado,
  referenciasFiltrado,
};
