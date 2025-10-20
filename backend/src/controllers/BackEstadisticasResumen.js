const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');

// GET /api/estadisticas/resumen?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/api/estadisticas/resumen', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const desde30 = desde || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const hastaHoy = hasta || new Date().toISOString().slice(0, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const curs = {
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
        estadosNutricionales: 'cur_est_nutri'
      };
      await client.query(
        'CALL public.sp_estadisticas_resumen($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
        [
          desde30,
          hastaHoy,
          curs.pacientesActivos,
          curs.ingresosMes,
          curs.egresosMes,
          curs.faltas,
          curs.turnos,
          curs.ocupacionHoy,
          curs.reingresos30d,
          curs.psicologia,
          curs.nutricion,
          curs.causasEgreso,
          curs.estadosNutricionales
        ]
      );
      const map = {};
      for (const [k, cname] of Object.entries(curs)) {
        map[k] = (await client.query(`FETCH ALL FROM "${cname}"`)).rows || [];
      }
      await client.query('COMMIT');

      const totalTurnos = map.turnos?.[0]?.total_turnos || 0;
      const totalFaltas = map.faltas?.[0]?.total_faltas || 0;
      const tasaInasistenciaPct = totalTurnos > 0 ? Number(((100.0 * totalFaltas) / totalTurnos).toFixed(2)) : 0;
      const asignadosHoy = map.ocupacionHoy?.[0]?.asignados_hoy || 0;
      const finalizadosHoy = map.ocupacionHoy?.[0]?.finalizados_hoy || 0;
      const ocupacionHoyPct = asignadosHoy > 0 ? Number(((100.0 * finalizadosHoy) / asignadosHoy).toFixed(2)) : 0;

      const resp = {
        kpis: {
          pacientesActivos: map.pacientesActivos?.[0]?.c || 0,
          ingresosHoy: map.ingresosMes?.filter?.(() => false) ? 0 : 0,
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
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[EstadisticasResumen] resumen SP error:', e);
      return res.status(500).json({ error: 'Error al generar resumen de estadísticas.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[EstadisticasResumen] /api/estadisticas/resumen error:', error);
    res.status(500).json({ error: 'Error al generar resumen de estadísticas.' });
  }
});

// GET /api/estadisticas/nutricion-por-tipo?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&sexo=Masculino|Femenino&motivo=Nuevo|Reconsulta
router.get('/api/estadisticas/nutricion-por-tipo', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let { sexo } = req.query;
    let { motivo } = req.query;
    if (sexo) {
      const s = String(sexo).toLowerCase();
      if (s.startsWith('m')) sexo = 'Masculino';
      else if (s.startsWith('f')) sexo = 'Femenino';
      else sexo = null;
    }
    if (motivo) {
      const m = String(motivo).trim();
      if (!['Nuevo','Reconsulta'].includes(m)) motivo = null; else motivo = m;
    }
    const desdeDef = desde || null;
    const hastaDef = hasta || null;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_nutri_tipo';
      await client.query('CALL public.sp_nutricion_por_tipo($1,$2,$3,$4,$5)', [
        desdeDef, hastaDef, sexo || null, motivo || null, cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] nutricion-por-tipo SP error:', e);
      return res.status(500).json({ error: 'Error al obtener nutrición por tipo.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] nutricion-por-tipo error:', error);
    res.status(500).json({ error: 'Error al obtener nutrición por tipo.' });
  }
});

// GET /api/estadisticas/pacientes-por-departamento
router.get('/api/estadisticas/pacientes-por-departamento', async (req, res) => {
  try {
    const { acceso, estado, jornada, sexo } = req.query || {};
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_pac_por_dep';
      await client.query('CALL public.sp_pacientes_por_departamento_filtros($1,$2,$3,$4,$5)', [
        acceso ? String(acceso).trim() : null,
        estado ? String(estado).trim() : null,
        jornada ? String(jornada).trim() : null,
        sexo ? String(sexo).trim().toLowerCase().charAt(0) : null,
        cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] pacientes-por-departamento SP error:', e);
      return res.status(500).json({ error: 'Error al obtener pacientes por departamento.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] pacientes-por-departamento error:', error);
    res.status(500).json({ error: 'Error al obtener pacientes por departamento.' });
  }
});

// GET /api/estadisticas/pacientes-por-jornada
router.get('/api/estadisticas/pacientes-por-jornada', async (req, res) => {
  try {
    const { acceso, estado, jornada, sexo } = req.query || {};
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_pac_por_jornada';
      await client.query('CALL public.sp_pacientes_por_jornada($1,$2,$3,$4,$5)', [
        acceso ? String(acceso).trim() : null,
        estado ? String(estado).trim() : null,
        jornada ? String(jornada).trim() : null,
        sexo ? String(sexo).trim().toLowerCase().charAt(0) : null,
        cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] pacientes-por-jornada SP error:', e);
      return res.status(500).json({ error: 'Error al obtener pacientes por jornada.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] pacientes-por-jornada error:', error);
    res.status(500).json({ error: 'Error al obtener pacientes por jornada.' });
  }
});

// GET /api/estadisticas/pacientes-programa-resumen
// Dentro del programa: Reingreso, Activo, Nuevo ingreso
// Fuera del programa: Egresado, Fallecido
router.get('/api/estadisticas/pacientes-programa-resumen', async (_req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_prog_res';
      await client.query('CALL public.sp_pacientes_programa_resumen($1)', [cur]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      const row = r?.rows?.[0] || { dentro: 0, fuera: 0 };
      return res.json({ dentro: Number(row.dentro || 0), fuera: Number(row.fuera || 0) });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[pacientes-programa-resumen] SP error:', e);
      return res.status(500).json({ error: 'Error al obtener resumen de pacientes del programa.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] pacientes-programa-resumen error:', error);
    res.status(500).json({ error: 'Error al obtener resumen de pacientes del programa.' });
  }
});

// GET /api/estadisticas/pacientes-por-sexo
router.get('/api/estadisticas/pacientes-por-sexo', async (req, res) => {
  try {
    const { acceso, estado, jornada, sexo } = req.query || {};
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_pac_por_sexo';
      await client.query('CALL public.sp_pacientes_por_sexo($1,$2,$3,$4,$5)', [
        acceso ? String(acceso).trim() : null,
        estado ? String(estado).trim() : null,
        jornada ? String(jornada).trim() : null,
        sexo ? String(sexo).trim().toLowerCase().charAt(0) : null,
        cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] pacientes-por-sexo SP error:', e);
      return res.status(500).json({ error: 'Error al obtener pacientes por sexo.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] pacientes-por-sexo error:', error);
    res.status(500).json({ error: 'Error al obtener pacientes por sexo.' });
  }
});

// GET /api/estadisticas/pacientes-por-acceso
router.get('/api/estadisticas/pacientes-por-acceso', async (req, res) => {
  try {
    const { acceso, estado, jornada, sexo } = req.query || {};
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_pac_por_acceso';
      await client.query('CALL public.sp_pacientes_por_acceso($1,$2,$3,$4,$5)', [
        acceso ? String(acceso).trim() : null,
        estado ? String(estado).trim() : null,
        jornada ? String(jornada).trim() : null,
        sexo ? String(sexo).trim().toLowerCase().charAt(0) : null,
        cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] pacientes-por-acceso SP error:', e);
      return res.status(500).json({ error: 'Error al obtener pacientes por acceso vascular.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] pacientes-por-acceso error:', error);
    res.status(500).json({ error: 'Error al obtener pacientes por acceso vascular.' });
  }
});

// GET /api/estadisticas/pacientes-por-estado
router.get('/api/estadisticas/pacientes-por-estado', async (req, res) => {
  try {
    const { acceso, estado, jornada, sexo } = req.query || {};
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_pac_por_estado';
      await client.query('CALL public.sp_pacientes_por_estado($1,$2,$3,$4,$5)', [
        acceso ? String(acceso).trim() : null,
        estado ? String(estado).trim() : null,
        jornada ? String(jornada).trim() : null,
        sexo ? String(sexo).trim().toLowerCase().charAt(0) : null,
        cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] pacientes-por-estado SP error:', e);
      return res.status(500).json({ error: 'Error al obtener pacientes por estado.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] pacientes-por-estado error:', error);
    res.status(500).json({ error: 'Error al obtener pacientes por estado.' });
  }
});

// GET /api/estadisticas/pacientes-total
router.get('/api/estadisticas/pacientes-total', async (_req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_pac_total';
      await client.query('CALL public.sp_pacientes_total($1)', [cur]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      const total = r?.rows?.[0]?.total || 0;
      return res.json({ total });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] pacientes-total SP error:', e);
      return res.status(500).json({ error: 'Error al obtener total de pacientes.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] pacientes-total error:', error);
    res.status(500).json({ error: 'Error al obtener total de pacientes.' });
  }
});

// GET /api/estadisticas/psicologia-kdqol-por-jornada?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&sexo=m|f
router.get('/api/estadisticas/psicologia-kdqol-por-jornada', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let { sexo } = req.query; // m|f
    if (sexo) {
      const s = String(sexo).toLowerCase();
      if (s.startsWith('m')) sexo = 'm';
      else if (s.startsWith('f')) sexo = 'f';
      else sexo = null;
    }
    const desdeDef = desde || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const hastaDef = hasta || new Date().toISOString().slice(0, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_kdqol_jornada';
      await client.query('CALL public.sp_psicologia_kdqol_por_jornada($1,$2,$3,$4)', [
        desdeDef, hastaDef, sexo ? sexo : null, cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ rango: { desde: desdeDef, hasta: hastaDef }, items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] psicologia-kdqol-por-jornada SP error:', e);
      return res.status(500).json({ error: 'Error al obtener KDQOL por jornada.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] psicologia-kdqol-por-jornada error:', error);
    res.status(500).json({ error: 'Error al obtener KDQOL por jornada.' });
  }
});

// GET /api/estadisticas/psicologia-kdqol-por-sexo?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/api/estadisticas/psicologia-kdqol-por-sexo', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const desdeDef = desde || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const hastaDef = hasta || new Date().toISOString().slice(0, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_kdqol_sexo';
      await client.query('CALL public.sp_psicologia_kdqol_por_sexo($1,$2,$3)', [
        desdeDef, hastaDef, cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ rango: { desde: desdeDef, hasta: hastaDef }, items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] psicologia-kdqol-por-sexo SP error:', e);
      return res.status(500).json({ error: 'Error al obtener KDQOL por sexo.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] psicologia-kdqol-por-sexo error:', error);
    res.status(500).json({ error: 'Error al obtener KDQOL por sexo.' });
  }
});

// GET /api/estadisticas/psicologia-kdqol-promedios?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/api/estadisticas/psicologia-kdqol-promedios', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let { sexo } = req.query; // m|f
    if (sexo) {
      const s = String(sexo).toLowerCase();
      if (s.startsWith('m')) sexo = 'm';
      else if (s.startsWith('f')) sexo = 'f';
      else sexo = null;
    }
    const desdeDef = desde || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const hastaDef = hasta || new Date().toISOString().slice(0, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_kdqol_prom';
      await client.query('CALL public.sp_psicologia_kdqol_promedios($1,$2,$3,$4)', [
        desdeDef, hastaDef, sexo ? sexo : null, cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      const row = r.rows?.[0] || {};
      const vals = ['fisico','mental','sintomas','carga','efectos']
        .map(k => (row[k] == null ? null : Number(row[k])));
      const present = vals.filter(v => typeof v === 'number' && !isNaN(v));
      const global = present.length ? Number((present.reduce((a,b)=>a+b,0) / present.length).toFixed(2)) : null;
      return res.json({ rango: { desde: desdeDef, hasta: hastaDef }, promedios: { ...row, global } });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] psicologia-kdqol-promedios SP error:', e);
      return res.status(500).json({ error: 'Error al obtener promedios KDQOL.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] psicologia-kdqol-promedios error:', error);
    res.status(500).json({ error: 'Error al obtener promedios KDQOL.' });
  }
});

// GET /api/estadisticas/psicologia-kdqol-total?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&sexo=m|f
router.get('/api/estadisticas/psicologia-kdqol-total', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let { sexo } = req.query; // m|f
    if (sexo) {
      const s = String(sexo).toLowerCase();
      if (s.startsWith('m')) sexo = 'm';
      else if (s.startsWith('f')) sexo = 'f';
      else sexo = null;
    }
    const desdeDef = desde || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const hastaDef = hasta || new Date().toISOString().slice(0, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_kdqol_total';
      await client.query('CALL public.sp_psicologia_kdqol_total($1,$2,$3,$4)', [
        desdeDef, hastaDef, sexo ? sexo : null, cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ rango: { desde: desdeDef, hasta: hastaDef }, total: r.rows?.[0]?.total || 0 });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] psicologia-kdqol-total SP error:', e);
      return res.status(500).json({ error: 'Error al obtener KDQOL de psicología.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] psicologia-kdqol-total error:', error);
    res.status(500).json({ error: 'Error al obtener KDQOL de psicología.' });
  }
});

// GET /api/estadisticas/nutricion-por-sexo?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/api/estadisticas/nutricion-por-sexo', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let { motivo } = req.query;
    if (motivo) {
      const m = String(motivo).trim();
      if (!['Nuevo','Reconsulta'].includes(m)) motivo = null; else motivo = m;
    }
    const desdeDef = desde || null;
    const hastaDef = hasta || null;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_nutri_sexo';
      await client.query('CALL public.sp_nutricion_por_sexo($1,$2,$3,$4)', [
        desdeDef, hastaDef, motivo || null, cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ rango: { desde: desdeDef, hasta: hastaDef }, items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] nutricion-por-sexo SP error:', e);
      return res.status(500).json({ error: 'Error al obtener nutrición por sexo.' });
    } finally {
      client.release();
    }
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
      if (!['Nuevo','Reconsulta'].includes(m)) motivo = null; else motivo = m;
    }
    let { sexo } = req.query;
    if (sexo) {
      const s = String(sexo).toLowerCase();
      if (s.startsWith('m')) sexo = 'Masculino';
      else if (s.startsWith('f')) sexo = 'Femenino';
      else sexo = null;
    }
    const desdeDef = desde || null;
    const hastaDef = hasta || null;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_nutri_jornada';
      await client.query('CALL public.sp_nutricion_por_jornada($1,$2,$3,$4,$5)', [
        desdeDef, hastaDef, sexo || null, motivo || null, cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ rango: { desde: desdeDef, hasta: hastaDef }, items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] nutricion-por-jornada SP error:', e);
      return res.status(500).json({ error: 'Error al obtener nutrición por jornada.' });
    } finally {
      client.release();
    }
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
      if (!['Nuevo','Reconsulta'].includes(m)) motivo = null; else motivo = m;
    }
    let { sexo } = req.query;
    if (sexo) {
      const s = String(sexo).toLowerCase();
      if (s.startsWith('m')) sexo = 'Masculino';
      else if (s.startsWith('f')) sexo = 'Femenino';
      else sexo = null;
    }
    const desdeDef = desde || null;
    const hastaDef = hasta || null;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_nutri_detalle';
      await client.query('CALL public.sp_nutricion_detalle($1,$2,$3,$4,$5,$6)', [
        desdeDef, hastaDef, estado || null, sexo || null, motivo || null, cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ rango: { desde: desdeDef, hasta: hastaDef }, items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] nutricion-detalle SP error:', e);
      return res.status(500).json({ error: 'Error al obtener detalle de nutrición.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] nutricion-detalle error:', error);
    res.status(500).json({ error: 'Error al obtener detalle de nutrición.' });
  }
});

// GET /api/estadisticas/nutricion-por-motivo?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&sexo=Masculino|Femenino
router.get('/api/estadisticas/nutricion-por-motivo', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let { sexo } = req.query;
    if (sexo) {
      const s = String(sexo).toLowerCase();
      if (s.startsWith('m')) sexo = 'Masculino';
      else if (s.startsWith('f')) sexo = 'Femenino';
      else sexo = null;
    }
    const desdeDef = desde || null;
    const hastaDef = hasta || null;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_nutri_motivo';
      await client.query('CALL public.sp_nutricion_por_motivo($1,$2,$3,$4)', [
        desdeDef, hastaDef, sexo || null, cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ rango: { desde: desdeDef, hasta: hastaDef }, items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] nutricion-por-motivo SP error:', e);
      return res.status(500).json({ error: 'Error al obtener nutrición por motivo.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] nutricion-por-motivo error:', error);
    res.status(500).json({ error: 'Error al obtener nutrición por motivo.' });
  }
});

// GET /api/estadisticas/psicologia-por-tipo?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/api/estadisticas/psicologia-por-tipo', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let { sexo } = req.query;
    if (sexo) {
      const s = String(sexo).toLowerCase();
      if (s.startsWith('m')) sexo = 'm';
      else if (s.startsWith('f')) sexo = 'f';
      else sexo = null;
    }
    const desdeDef = desde || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const hastaDef = hasta || new Date().toISOString().slice(0, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_psico_tipo';
      await client.query('CALL public.sp_psicologia_por_tipo($1,$2,$3,$4)', [
        desdeDef, hastaDef, sexo ? sexo : null, cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ rango: { desde: desdeDef, hasta: hastaDef }, items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] psicologia-por-tipo SP error:', e);
      return res.status(500).json({ error: 'Error al obtener psicología por tipo.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] psicologia-por-tipo error:', error);
    res.status(500).json({ error: 'Error al obtener psicología por tipo.' });
  }
});

// GET /api/estadisticas/psicologia-por-atencion?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/api/estadisticas/psicologia-por-atencion', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let { sexo } = req.query;
    if (sexo) {
      const s = String(sexo).toLowerCase();
      if (s.startsWith('m')) sexo = 'm';
      else if (s.startsWith('f')) sexo = 'f';
      else sexo = null;
    }
    const desdeDef = desde || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const hastaDef = hasta || new Date().toISOString().slice(0, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_psico_atencion';
      await client.query('CALL public.sp_psicologia_por_atencion($1,$2,$3,$4)', [
        desdeDef, hastaDef, sexo ? sexo : null, cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ rango: { desde: desdeDef, hasta: hastaDef }, items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] psicologia-por-atencion SP error:', e);
      return res.status(500).json({ error: 'Error al obtener psicología por tipo de atención.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] psicologia-por-atencion error:', error);
    res.status(500).json({ error: 'Error al obtener psicología por tipo de atención.' });
  }
});

// GET /api/estadisticas/psicologia-por-pronostico?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/api/estadisticas/psicologia-por-pronostico', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let { sexo } = req.query;
    if (sexo) {
      const s = String(sexo).toLowerCase();
      if (s.startsWith('m')) sexo = 'm';
      else if (s.startsWith('f')) sexo = 'f';
      else sexo = null;
    }
    const desdeDef = desde || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const hastaDef = hasta || new Date().toISOString().slice(0, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_psico_pronostico';
      await client.query('CALL public.sp_psicologia_por_pronostico($1,$2,$3,$4)', [
        desdeDef, hastaDef, sexo ? sexo : null, cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ rango: { desde: desdeDef, hasta: hastaDef }, items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] psicologia-por-pronostico SP error:', e);
      return res.status(500).json({ error: 'Error al obtener psicología por pronóstico.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] psicologia-por-pronostico error:', error);
    res.status(500).json({ error: 'Error al obtener psicología por pronóstico.' });
  }
});

// GET /api/estadisticas/psicologia-por-sexo?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/api/estadisticas/psicologia-por-sexo', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const desdeDef = desde || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const hastaDef = hasta || new Date().toISOString().slice(0, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_psico_sexo';
      await client.query('CALL public.sp_psico_informes_por_sexo($1,$2,$3)', [
        desdeDef, hastaDef, cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ rango: { desde: desdeDef, hasta: hastaDef }, items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] psicologia-por-sexo SP error:', e);
      return res.status(500).json({ error: 'Error al obtener psicología por sexo.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] psicologia-por-sexo error:', error);
    res.status(500).json({ error: 'Error al obtener psicología por sexo.' });
  }
});

// GET /api/estadisticas/psicologia-por-jornada?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
router.get('/api/estadisticas/psicologia-por-jornada', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const desdeDef = desde || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const hastaDef = hasta || new Date().toISOString().slice(0, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_psico_jornada';
      await client.query('CALL public.sp_psico_informes_por_jornada($1,$2,$3)', [
        desdeDef, hastaDef, cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ rango: { desde: desdeDef, hasta: hastaDef }, items: r.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[Estadisticas] psicologia-por-jornada SP error:', e);
      return res.status(500).json({ error: 'Error al obtener psicología por jornada.' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Estadisticas] psicologia-por-jornada error:', error);
    res.status(500).json({ error: 'Error al obtener psicología por jornada.' });
  }
});

module.exports = router;
