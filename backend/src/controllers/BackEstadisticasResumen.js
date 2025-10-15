const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');

// GET /api/estadisticas/resumen?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/api/estadisticas/resumen', async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    // Rangos
    const desde30 = desde || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const hastaHoy = hasta || new Date().toISOString().slice(0, 10);

    // Consultas en paralelo
    const queries = {
      // Pacientes activos: sin registro en egresos
      pacientesActivos: {
        text: `SELECT COUNT(*)::int AS c
               FROM public.tbl_pacientes p
               LEFT JOIN public.tbl_egresos e ON e.no_afiliacion = p.no_afiliacion
               WHERE e.no_afiliacion IS NULL;`,
        values: [],
      },
      // Ingresos por mes (últimos 6 meses)
      ingresosMes: {
        text: `SELECT to_char(date_trunc('month', fecha_ingreso), 'YYYY-MM-01') AS mes,
                      COUNT(*)::int AS ingresos
               FROM public.tbl_pacientes
               WHERE fecha_ingreso >= (CURRENT_DATE - INTERVAL '6 months')
               GROUP BY 1
               ORDER BY 1`,
        values: [],
      },
      // Egresos por mes (últimos 6 meses)
      egresosMes: {
        text: `SELECT to_char(date_trunc('month', fecha_egreso), 'YYYY-MM-01') AS mes,
                      COUNT(*)::int AS egresos
               FROM public.tbl_egresos
               WHERE fecha_egreso IS NOT NULL
                 AND fecha_egreso >= (CURRENT_DATE - INTERVAL '6 months')
               GROUP BY 1
               ORDER BY 1`,
        values: [],
      },
      // Faltas vs turnos (últimos 30 días o rango desde/hasta)
      faltas: {
        text: `SELECT COUNT(*)::int AS total_faltas
               FROM public.tbl_faltistas
               WHERE fecha_falta BETWEEN $1 AND $2`,
        values: [desde30, hastaHoy],
      },
      turnos: {
        text: `SELECT COUNT(*)::int AS total_turnos
               FROM public.tbl_turnos
               WHERE fecha_turno BETWEEN $1 AND $2`,
        values: [desde30, hastaHoy],
      },
      // Ocupación hoy (asignados vs finalizados)
      ocupacionHoy: {
        text: `SELECT 
                 COUNT(*) FILTER (WHERE fecha_turno = CURRENT_DATE)::int AS asignados_hoy,
                 COUNT(*) FILTER (WHERE fecha_turno = CURRENT_DATE AND fecha_finalizacion IS NOT NULL)::int AS finalizados_hoy
               FROM public.tbl_turnos`,
        values: [],
      },
      // Reingresos <= 30 días posteriores al egreso
      reingresos30d: {
        text: `SELECT COUNT(*)::int AS reingresos_30d
               FROM public.tbl_reingresos r
               JOIN public.tbl_egresos e ON e.no_afiliacion = r.no_afiliacion
               WHERE r.fecha_reingreso IS NOT NULL
                 AND e.fecha_egreso IS NOT NULL
                 AND r.fecha_reingreso <= e.fecha_egreso + INTERVAL '30 days'`,
        values: [],
      },
      // Psicología últimos 30 días
      psicologia: {
        text: `SELECT COUNT(*)::int AS informes,
                      COALESCE(SUM(CASE WHEN kdqol THEN 1 ELSE 0 END),0)::int AS con_kdqol
               FROM public.tbl_informes_psicologia
               WHERE fecha_creacion >= (CURRENT_DATE - INTERVAL '30 days')`,
        values: [],
      },
      // Nutrición: IMC promedio últimos 90 días
      nutricion: {
        text: `SELECT ROUND(AVG(imc)::numeric,2) AS imc_promedio
               FROM public.tbl_informe_nutricion
               WHERE fecha_creacion >= (CURRENT_DATE - INTERVAL '90 days')`,
        values: [],
      },
      // Distribución causas de egreso (últimos 6 meses)
      causasEgreso: {
        text: `SELECT COALESCE(c.descripcion,'Sin causa') AS causa, COUNT(*)::int AS total
               FROM public.tbl_egresos e
               LEFT JOIN public.tbl_causa_egreso c ON c.id_causa = e.id_causa_egreso
               WHERE e.fecha_egreso IS NOT NULL
                 AND e.fecha_egreso >= (CURRENT_DATE - INTERVAL '6 months')
               GROUP BY 1
               ORDER BY 2 DESC
               LIMIT 10`,
        values: [],
      },
      // Estados nutricionales (distribución)
      estadosNutricionales: {
        text: `SELECT COALESCE(estado_nutricional,'N/D') AS estado, COUNT(*)::int AS total
               FROM public.tbl_informe_nutricion
               WHERE estado_nutricional IS NOT NULL
               GROUP BY 1
               ORDER BY 2 DESC
               LIMIT 10`,
        values: [],
      },
    };

    const keys = Object.keys(queries);
    const results = await Promise.all(keys.map(k => pool.query(queries[k].text, queries[k].values)));
    const map = Object.fromEntries(keys.map((k, i) => [k, results[i].rows]));

    const totalTurnos = map.turnos?.[0]?.total_turnos || 0;
    const totalFaltas = map.faltas?.[0]?.total_faltas || 0;
    const tasaInasistenciaPct = totalTurnos > 0 ? Number(((100.0 * totalFaltas) / totalTurnos).toFixed(2)) : 0;
    const asignadosHoy = map.ocupacionHoy?.[0]?.asignados_hoy || 0;
    const finalizadosHoy = map.ocupacionHoy?.[0]?.finalizados_hoy || 0;
    const ocupacionHoyPct = asignadosHoy > 0 ? Number(((100.0 * finalizadosHoy) / asignadosHoy).toFixed(2)) : 0;

    // Adaptar formatos para el frontend
    const resp = {
      kpis: {
        pacientesActivos: map.pacientesActivos?.[0]?.c || 0,
        ingresosHoy: map.ingresosMes?.filter?.(() => false) ? 0 : 0, // espacio para un KPI si se requiere
        faltasMes: totalFaltas,
        ocupacionHoyPct,
        reingresos30d: map.reingresos30d?.[0]?.reingresos_30d || 0,
        tasaInasistenciaPct,
        imcPromedio90d: map.nutricion?.[0]?.imc_promedio || null,
        informesPsico30d: map.psicologia?.[0]?.informes || 0,
        psicoConKdqol30d: map.psicologia?.[0]?.con_kdqol || 0,
      },
      series: {
        ingresosMes: (map.ingresosMes || []).map(r => ({ mes: r.mes, ingresos: Number(r.ingresos) })),
        egresosMes: (map.egresosMes || []).map(r => ({ mes: r.mes, egresos: Number(r.egresos) })),
      },
      distribuciones: {
        causasEgreso: (map.causasEgreso || []).map(r => ({ causa: r.causa, total: Number(r.total) })),
        estadosNutricionales: (map.estadosNutricionales || []).map(r => ({ estado: r.estado, total: Number(r.total) })),
      },
      rango: { desde: desde30, hasta: hastaHoy }
    };

    return res.json(resp);
  } catch (error) {
    console.error('[EstadisticasResumen] /api/estadisticas/resumen error:', error);
    res.status(500).json({ error: 'Error al generar resumen de estadísticas.' });
  }
});

// GET /api/estadisticas/nutricion-por-sexo?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/api/estadisticas/nutricion-por-sexo', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let { motivo } = req.query;
    if (motivo) {
      const m = String(motivo).trim();
      if (!['Nuevo','Reconsulta'].includes(m)) motivo = null;
    }
    const conds = [];
    const params = [];
    if (desde && hasta) {
      conds.push(`(n.fecha_creacion::date BETWEEN $${params.length + 1} AND $${params.length + 2})`);
      params.push(desde, hasta);
    }
    if (motivo) {
      conds.push(`COALESCE(n.motivo_consulta,'N/D') = $${params.length + 1}`);
      params.push(motivo);
    }
    const where = conds.length ? ('WHERE ' + conds.join(' AND ')) : '';
    const q = `
      SELECT CASE 
               WHEN LOWER(COALESCE(p.sexo,'ND')) LIKE 'm%' THEN 'Masculino'
               WHEN LOWER(COALESCE(p.sexo,'ND')) LIKE 'f%' THEN 'Femenino'
               ELSE 'N/D'
             END AS sexo, 
             COUNT(*)::int AS total
      FROM public.tbl_informe_nutricion n
      LEFT JOIN public.tbl_pacientes p ON p.no_afiliacion = n.no_afiliacion
      ${where}
      GROUP BY 1
      ORDER BY 2 DESC
    `;
    const r = await pool.query(q, params);
    return res.json({ rango: { desde: desde || null, hasta: hasta || null }, items: r.rows });
  } catch (error) {
    console.error('[Estadisticas] nutricion-por-sexo error:', error);
    res.status(500).json({ error: 'Error al obtener nutrición por sexo.' });
  }
});

// GET /api/estadisticas/nutricion-por-jornada?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/api/estadisticas/nutricion-por-jornada', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let { motivo } = req.query;
    if (motivo) {
      const m = String(motivo).trim();
      if (!['Nuevo','Reconsulta'].includes(m)) motivo = null;
    }
    let { sexo } = req.query;
    if (sexo) {
      const s = String(sexo).toLowerCase();
      if (s.startsWith('m')) sexo = 'Masculino';
      else if (s.startsWith('f')) sexo = 'Femenino';
    }
    const conds = [];
    const params = [];
    if (desde && hasta) {
      conds.push(`(n.fecha_creacion::date BETWEEN $${params.length + 1} AND $${params.length + 2})`);
      params.push(desde, hasta);
    }
    if (sexo && ['Masculino','Femenino'].includes(sexo)) {
      conds.push(`COALESCE(p.sexo,'N/D') = $${params.length + 1}`);
      params.push(sexo);
    }
    if (motivo) {
      conds.push(`COALESCE(n.motivo_consulta,'N/D') = $${params.length + 1}`);
      params.push(motivo);
    }
    const where = conds.length ? ('WHERE ' + conds.join(' AND ')) : '';
    const q = `
      SELECT 
        COALESCE(j.descripcion, 'N/D') AS jornada,
        COUNT(*)::int AS total
      FROM public.tbl_informe_nutricion n
      LEFT JOIN public.tbl_pacientes p ON p.no_afiliacion = n.no_afiliacion
      LEFT JOIN public.tbl_jornadas j ON j.id_jornada = p.id_jornada
      ${where}
      GROUP BY 1
      ORDER BY 2 DESC
    `;
    const r = await pool.query(q, params);
    return res.json({ rango: { desde: desde || null, hasta: hasta || null }, items: r.rows });
  } catch (error) {
    console.error('[Estadisticas] nutricion-por-jornada error:', error);
    res.status(500).json({ error: 'Error al obtener nutrición por jornada.' });
  }
});

// GET /api/estadisticas/nutricion-detalle?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/api/estadisticas/nutricion-detalle', async (req, res) => {
  try {
    const { desde, hasta, estado } = req.query;
    let { motivo } = req.query;
    if (motivo) {
      const m = String(motivo).trim();
      if (!['Nuevo','Reconsulta'].includes(m)) motivo = null;
    }
    let { sexo } = req.query;
    if (sexo) {
      const s = String(sexo).toLowerCase();
      if (s.startsWith('m')) sexo = 'Masculino';
      else if (s.startsWith('f')) sexo = 'Femenino';
    }
    const conds = [];
    const params = [];
    if (desde && hasta) {
      conds.push(`n.fecha_creacion::date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
      params.push(desde, hasta);
    }
    if (estado) {
      conds.push(`COALESCE(n.estado_nutricional,'N/D') = $${params.length + 1}`);
      params.push(estado);
    }
    if (sexo && ['Masculino','Femenino'].includes(sexo)) {
      conds.push(`COALESCE(p.sexo,'N/D') = $${params.length + 1}`);
      params.push(sexo);
    }
    if (motivo) {
      conds.push(`COALESCE(n.motivo_consulta,'N/D') = $${params.length + 1}`);
      params.push(motivo);
    }
    const where = conds.length ? ('WHERE ' + conds.join(' AND ')) : '';
    const q = `
      SELECT 
        n.no_afiliacion,
        TRIM(CONCAT_WS(' ', p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido)) AS nombre_paciente,
        COALESCE(n.motivo_consulta,'N/D') AS motivo_consulta,
        COALESCE(n.estado_nutricional,'N/D') AS estado_nutricional,
        n.altura_cm AS altura,
        n.peso_kg AS peso,
        n.imc,
        n.fecha_creacion::date AS fecha
      FROM public.tbl_informe_nutricion n
      LEFT JOIN public.tbl_pacientes p ON p.no_afiliacion = n.no_afiliacion
      ${where}
      ORDER BY n.fecha_creacion DESC
      LIMIT 500
    `;
    const r = await pool.query(q, params);
    return res.json({ rango: { desde: desde || null, hasta: hasta || null }, items: r.rows });
  } catch (error) {
    console.error('[Estadisticas] nutricion-detalle error:', error);
    res.status(500).json({ error: 'Error al obtener detalle de nutrición.' });
  }
});

module.exports = router;

// --------------------- Dashboards Específicos ---------------------

// GET /api/estadisticas/nutricion-por-tipo?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/api/estadisticas/nutricion-por-tipo', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let { motivo } = req.query;
    if (motivo) {
      const m = String(motivo).trim();
      if (!['Nuevo','Reconsulta'].includes(m)) motivo = null;
    }
    let { sexo } = req.query;
    if (sexo) {
      const s = String(sexo).toLowerCase();
      if (s.startsWith('m')) sexo = 'Masculino';
      else if (s.startsWith('f')) sexo = 'Femenino';
    }
    const conds = [];
    const params = [];
    if (desde && hasta) {
      conds.push(`(fecha_creacion::date BETWEEN $${params.length + 1} AND $${params.length + 2})`);
      params.push(desde, hasta);
    }
    if (sexo && ['Masculino','Femenino'].includes(sexo)) {
      conds.push(`EXISTS (SELECT 1 FROM public.tbl_pacientes p WHERE p.no_afiliacion = public.tbl_informe_nutricion.no_afiliacion AND COALESCE(p.sexo,'N/D') = $${params.length + 1})`);
      params.push(sexo);
    }
    if (motivo) {
      conds.push(`COALESCE(motivo_consulta,'N/D') = $${params.length + 1}`);
      params.push(motivo);
    }
    const where = conds.length ? ('WHERE ' + conds.join(' AND ')) : '';
    const q = `
      SELECT 
        COALESCE(estado_nutricional,'N/D') AS estado, 
        COUNT(*)::int AS total,
        ROUND(AVG(imc)::numeric, 2) AS imc_promedio,
        ROUND(AVG(peso_kg)::numeric, 2) AS peso_promedio,
        ROUND(AVG(altura_cm)::numeric, 2) AS altura_promedio
      FROM public.tbl_informe_nutricion
      ${where}
      GROUP BY 1
      ORDER BY 2 DESC
    `;
    const r = await pool.query(q, params);
    return res.json({ rango: { desde: desde || null, hasta: hasta || null }, items: r.rows });
  } catch (error) {
    console.error('[Estadisticas] nutricion-por-tipo error:', error);
    res.status(500).json({ error: 'Error al obtener nutrición por tipo.' });
  }
});

// GET /api/estadisticas/nutricion-por-motivo?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&sexo=Masculino|Femenino
router.get('/api/estadisticas/nutricion-por-motivo', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let { sexo } = req.query;
    // Siempre limitar a motivos permitidos
    if (sexo) {
      const s = String(sexo).toLowerCase();
      if (s.startsWith('m')) sexo = 'Masculino';
      else if (s.startsWith('f')) sexo = 'Femenino';
    }
    const conds = [];
    const params = [];
    if (desde && hasta) {
      conds.push(`(n.fecha_creacion::date BETWEEN $${params.length + 1} AND $${params.length + 2})`);
      params.push(desde, hasta);
    }
    if (sexo && ['Masculino','Femenino'].includes(sexo)) {
      conds.push(`COALESCE(p.sexo,'N/D') = $${params.length + 1}`);
      params.push(sexo);
    }
    // Forzar solo motivos 'Nuevo' y 'Reconsulta'
    conds.push(`COALESCE(n.motivo_consulta,'N/D') IN ('Nuevo','Reconsulta')`);
    const where = 'WHERE ' + conds.join(' AND ');
    const q = `
      SELECT COALESCE(n.motivo_consulta,'N/D') AS motivo, COUNT(*)::int AS total
      FROM public.tbl_informe_nutricion n
      LEFT JOIN public.tbl_pacientes p ON p.no_afiliacion = n.no_afiliacion
      ${where}
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 12
    `;
    const r = await pool.query(q, params);
    return res.json({ rango: { desde: desde || null, hasta: hasta || null }, items: r.rows });
  } catch (error) {
    console.error('[Estadisticas] nutricion-por-motivo error:', error);
    res.status(500).json({ error: 'Error al obtener nutrición por motivo.' });
  }
});

// GET /api/estadisticas/psicologia-por-tipo?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/api/estadisticas/psicologia-por-tipo', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const desdeDef = desde || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const hastaDef = hasta || new Date().toISOString().slice(0, 10);
    const q = `
      SELECT COALESCE(tipo_consulta,'N/D') AS tipo, COUNT(*)::int AS total
      FROM public.tbl_informes_psicologia
      WHERE (fecha_creacion::date BETWEEN $1 AND $2)
      GROUP BY 1
      ORDER BY 2 DESC
    `;
    const r = await pool.query(q, [desdeDef, hastaDef]);
    return res.json({ rango: { desde: desdeDef, hasta: hastaDef }, items: r.rows });
  } catch (error) {
    console.error('[Estadisticas] psicologia-por-tipo error:', error);
    res.status(500).json({ error: 'Error al obtener psicología por tipo.' });
  }
});
