// Endpoints de estadísticas de un solo procedimiento. Cada definición indica:
//   ruta        -> /api/estadisticas/<ruta>
//   sp, cursor  -> procedimiento y nombre del cursor
//   parametros  -> (query) => { valores: [...], rango? }   (valores en el orden del procedimiento)
//   salida      -> 'items' | 'rango-items' (agrega el rango consultado)
//   error       -> mensaje 500
const P = require('./parametros');

// Filtros comunes de las gráficas de pacientes (acceso, estado, jornada, sexo)
const filtrosPacientes = (q) => ({
  valores: [P.texto(q.acceso), P.texto(q.estado), P.texto(q.jornada), P.sexoInicial(q.sexo)],
});
const pacientes = (ruta, sp, cursor, error) => ({ ruta, sp, cursor, parametros: filtrosPacientes, salida: 'items', error });

// Nutrición
const nutricion = (ruta, sp, cursor, parametros, salida, error) => ({ ruta, sp, cursor, parametros, salida, error });
const conRangoNutricion = (extra) => (q) => {
  const rango = P.rangoAbierto(q);
  return { rango, valores: [rango.desde, rango.hasta, ...extra(q)] };
};

// Psicología (rango por defecto: últimos 90 días)
const psicologia = (ruta, sp, cursor, conSexo, error) => ({
  ruta, sp, cursor, salida: 'rango-items', error,
  parametros: (q) => {
    const rango = P.rango90Dias(q);
    return { rango, valores: conSexo ? [rango.desde, rango.hasta, P.sexoMF(q.sexo)] : [rango.desde, rango.hasta] };
  },
});

module.exports = [
  // ---- Pacientes ----
  pacientes('pacientes-por-departamento', 'sp_pacientes_por_departamento_filtros', 'cur_pac_por_dep', 'Error al obtener pacientes por departamento.'),
  pacientes('pacientes-por-jornada', 'sp_pacientes_por_jornada', 'cur_pac_por_jornada', 'Error al obtener pacientes por jornada.'),
  pacientes('pacientes-por-sexo', 'sp_pacientes_por_sexo', 'cur_pac_por_sexo', 'Error al obtener pacientes por sexo.'),
  pacientes('pacientes-por-acceso', 'sp_pacientes_por_acceso', 'cur_pac_por_acceso', 'Error al obtener pacientes por acceso vascular.'),
  pacientes('pacientes-por-estado', 'sp_pacientes_por_estado', 'cur_pac_por_estado', 'Error al obtener pacientes por estado.'),

  // ---- Nutrición ----
  // por tipo (estado nutricional): desde, hasta, sexo, motivo; sin rango en la respuesta
  nutricion('nutricion-por-tipo', 'sp_nutricion_por_tipo', 'cur_nutri_tipo',
    (q) => { const r = P.rangoAbierto(q); return { valores: [r.desde, r.hasta, P.sexoCompleto(q.sexo), P.motivo(q.motivo)] }; },
    'items', 'Error al obtener nutrición por tipo.'),
  nutricion('nutricion-por-sexo', 'sp_nutricion_por_sexo', 'cur_nutri_sexo',
    conRangoNutricion((q) => [P.motivo(q.motivo)]), 'rango-items', 'Error al obtener nutrición por sexo.'),
  nutricion('nutricion-por-jornada', 'sp_nutricion_por_jornada', 'cur_nutri_jornada',
    conRangoNutricion((q) => [P.sexoCompleto(q.sexo), P.motivo(q.motivo)]), 'rango-items', 'Error al obtener nutrición por jornada.'),
  nutricion('nutricion-detalle', 'sp_nutricion_detalle', 'cur_nutri_detalle',
    conRangoNutricion((q) => [q.estado || null, P.sexoCompleto(q.sexo), P.motivo(q.motivo)]), 'rango-items', 'Error al obtener detalle de nutrición.'),
  nutricion('nutricion-por-motivo', 'sp_nutricion_por_motivo', 'cur_nutri_motivo',
    conRangoNutricion((q) => [P.sexoCompleto(q.sexo)]), 'rango-items', 'Error al obtener nutrición por motivo.'),

  // ---- Psicología ----
  psicologia('psicologia-por-tipo', 'sp_psicologia_por_tipo', 'cur_psico_tipo', true, 'Error al obtener psicología por tipo.'),
  psicologia('psicologia-por-atencion', 'sp_psicologia_por_atencion', 'cur_psico_atencion', true, 'Error al obtener psicología por tipo de atención.'),
  psicologia('psicologia-por-pronostico', 'sp_psicologia_por_pronostico', 'cur_psico_pronostico', true, 'Error al obtener psicología por pronóstico.'),
  psicologia('psicologia-por-sexo', 'sp_psico_informes_por_sexo', 'cur_psico_sexo', false, 'Error al obtener psicología por sexo.'),
  psicologia('psicologia-por-jornada', 'sp_psico_informes_por_jornada', 'cur_psico_jornada', false, 'Error al obtener psicología por jornada.'),
  psicologia('psicologia-kdqol-por-jornada', 'sp_psicologia_kdqol_por_jornada', 'cur_kdqol_jornada', true, 'Error al obtener KDQOL por jornada.'),
  psicologia('psicologia-kdqol-por-sexo', 'sp_psicologia_kdqol_por_sexo', 'cur_kdqol_sexo', false, 'Error al obtener KDQOL por sexo.'),
];
