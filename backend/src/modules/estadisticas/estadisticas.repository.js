// Acceso a datos de estadísticas: procedimientos con cursor.
const { withTransaction, fetchCursor, callProcedure } = require('../../shared/database');

const consultar = (procedimiento, valores, cursor) =>
  withTransaction((c) => fetchCursor(c, `public.${procedimiento}`, valores, cursor));

// Varios procedimientos en una sola conexión/transacción: [[procedimiento, valores, cursor], ...] -> [filas, ...]
// (cada cursor debe tener un nombre distinto)
const consultarVarios = (consultas) => withTransaction(async (c) => {
  const resultados = [];
  for (const [procedimiento, valores, cursor] of consultas) {
    resultados.push(await fetchCursor(c, `public.${procedimiento}`, valores, cursor));
  }
  return resultados;
});

// Cursores de sp_estadisticas_resumen, en el orden en que el procedimiento los recibe
const CURSORES_RESUMEN = {
  pacientesActivos: 'cur_pac_act',
  ingresosMes: 'cur_ing_mes',
  egresosMes: 'cur_egr_mes',
  faltas: 'cur_faltas',
  turnos: 'cur_turnos',
  ocupacionHoy: 'cur_ocup_hoy',
  reingresos30d: 'cur_rei_30d',
  psicologia: 'cur_psico_30d',
  nutricion: 'cur_nutri_90d',
  causasEgreso: 'cur_causas_eg',
  estadosNutricionales: 'cur_est_nutri',
};

// { pacientesActivos: [...filas], ingresosMes: [...], ... }
function resumenCursores(desde, hasta) {
  return withTransaction(async (c) => {
    await callProcedure(c, 'public.sp_estadisticas_resumen', [desde, hasta, ...Object.values(CURSORES_RESUMEN)]);
    const filas = {};
    for (const [clave, cursor] of Object.entries(CURSORES_RESUMEN)) {
      filas[clave] = (await c.query(`FETCH ALL FROM "${cursor}"`)).rows || [];
    }
    return filas;
  });
}

module.exports = { consultar, consultarVarios, resumenCursores };
