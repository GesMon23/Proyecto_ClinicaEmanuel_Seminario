// Casos de uso de estadísticas.
const repo = require('./estadisticas.repository');
const P = require('./parametros');

// Endpoint de un solo procedimiento (ver definiciones.js)
async function ejecutar(def, query) {
  const { valores, rango } = def.parametros(query || {});
  const items = await repo.consultar(def.sp, valores, def.cursor);
  return def.salida === 'rango-items' ? { rango, items } : { items };
}

// Dentro del programa: Reingreso, Activo, Nuevo ingreso. Fuera: Egresado, Fallecido.
async function programaResumen() {
  const filas = await repo.consultar('sp_pacientes_programa_resumen', [], 'cur_prog_res');
  const fila = filas[0] || { dentro: 0, fuera: 0 };
  return { dentro: Number(fila.dentro || 0), fuera: Number(fila.fuera || 0) };
}

async function pacientesTotal() {
  const filas = await repo.consultar('sp_pacientes_total', [], 'cur_pac_total');
  return { total: filas[0]?.total || 0 };
}

async function kdqolTotal(query) {
  const rango = P.rango90Dias(query);
  const filas = await repo.consultar('sp_psicologia_kdqol_total', [rango.desde, rango.hasta, P.sexoMF(query.sexo)], 'cur_kdqol_total');
  return { rango, total: filas[0]?.total || 0 };
}

// Promedios por dimensión + promedio global de las dimensiones presentes
async function kdqolPromedios(query) {
  const rango = P.rango90Dias(query);
  const filas = await repo.consultar('sp_psicologia_kdqol_promedios', [rango.desde, rango.hasta, P.sexoMF(query.sexo)], 'cur_kdqol_prom');
  const fila = filas[0] || {};
  const valores = ['fisico', 'mental', 'sintomas', 'carga', 'efectos'].map((k) => (fila[k] == null ? null : Number(fila[k])));
  const presentes = valores.filter((v) => typeof v === 'number' && !Number.isNaN(v));
  const global = presentes.length ? Number((presentes.reduce((a, b) => a + b, 0) / presentes.length).toFixed(2)) : null;
  return { rango, promedios: { ...fila, global } };
}

// Tablero principal: KPIs, series mensuales y distribuciones
async function resumen(query) {
  const desde = query.desde || P.haceDiasISO(30);
  const hasta = query.hasta || P.hoyISO();
  const filas = await repo.resumenCursores(desde, hasta);

  const totalTurnos = filas.turnos[0]?.total_turnos || 0;
  const totalFaltas = filas.faltas[0]?.total_faltas || 0;
  const tasaInasistenciaPct = totalTurnos > 0 ? Number(((100.0 * totalFaltas) / totalTurnos).toFixed(2)) : 0;
  const asignadosHoy = filas.ocupacionHoy[0]?.asignados_hoy || 0;
  const finalizadosHoy = filas.ocupacionHoy[0]?.finalizados_hoy || 0;
  const ocupacionHoyPct = asignadosHoy > 0 ? Number(((100.0 * finalizadosHoy) / asignadosHoy).toFixed(2)) : 0;

  return {
    kpis: {
      pacientesActivos: filas.pacientesActivos[0]?.c || 0,
      ingresosHoy: 0,
      faltasMes: totalFaltas,
      ocupacionHoyPct,
      reingresos30d: filas.reingresos30d[0]?.reingresos_30d || 0,
      tasaInasistenciaPct,
      imcPromedio90d: filas.nutricion[0]?.imc_promedio || null,
      informesPsico30d: filas.psicologia[0]?.informes || 0,
      psicoConKdqol30d: filas.psicologia[0]?.con_kdqol || 0,
    },
    series: {
      ingresosMes: filas.ingresosMes.map((r) => ({ mes: r.mes, ingresos: Number(r.ingresos) })),
      egresosMes: filas.egresosMes.map((r) => ({ mes: r.mes, egresos: Number(r.egresos) })),
    },
    distribuciones: {
      causasEgreso: filas.causasEgreso.map((r) => ({ causa: r.causa, total: Number(r.total) })),
      estadosNutricionales: filas.estadosNutricionales.map((r) => ({ estado: r.estado, total: Number(r.total) })),
    },
    rango: { desde, hasta },
  };
}

module.exports = { ejecutar, programaResumen, pacientesTotal, kdqolTotal, kdqolPromedios, resumen };
