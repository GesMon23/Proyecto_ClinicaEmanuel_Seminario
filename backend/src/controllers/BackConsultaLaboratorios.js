const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');

// GET /api/laboratorios/historial/:noafiliacion - historial por afiliación
router.get('/api/laboratorios/historial/:noafiliacion', async (req, res) => {
  try {
    const { noafiliacion } = req.params;
    const sql = `
      SELECT
        l.*,
        l.idlaboratorio                 AS id_laboratorio,
        l.no_afiliacion                 AS no_afiliacion,
        p.primer_nombre,
        p.segundo_nombre,
        p.primer_apellido,
        p.segundo_apellido,
        p.sexo,
        l.fecha_laboratorio,
        per.descripcion                 AS periodicidad,
        l.examen_realizado,
        l.causa_no_realizado,
        l.infeccion_acceso,
        l.complicacion_acceso,
        l.virologia,
        l.antigeno_hepatitis_c,
        l.antigeno_superficie,
        l.hiv,
        l.observacion,
        NULL::text AS usuario_creacion,
        l.fecha_registro,
        COALESCE(params.parametros, '[]'::json) AS parametros
      FROM public.tbl_laboratorios l
      INNER JOIN public.tbl_pacientes p ON p.no_afiliacion = l.no_afiliacion
      LEFT JOIN public.tbl_periodicidadlaboratorio per ON per.idperlaboratorio = l.idperlaboratorio
      LEFT JOIN LATERAL (
        SELECT json_agg(
                 json_build_object(
                   'idparametro', pl.idparametro,
                   'parametro', pl.parametro,
                   'valor', pl.valor
                 )
                 ORDER BY pl.parametro
               ) AS parametros
        FROM public.tbl_parametros_laboratorio pl
        WHERE pl.idlaboratorio = l.idlaboratorio
      ) params ON true
      WHERE l.no_afiliacion = $1
      ORDER BY l.idlaboratorio DESC
    `;
    const { rows } = await pool.query(sql, [noafiliacion]);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en Laboratorios /historial/:noafiliacion', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// GET /api/laboratorios/historial - filtros opcionales
// Query params: desde (YYYY-MM-DD), hasta (YYYY-MM-DD), noafiliacion, idlaboratorio, sexo (M/F)
router.get('/api/laboratorios/historial', async (req, res) => {
  try {
    const { desde, hasta, noafiliacion, idlaboratorio, sexo } = req.query;
    const toValOrNull = (v) => {
      const s = (v ?? '').toString().trim();
      return s === '' ? null : s;
    };
    const toIntOrNull = (v) => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    // Normalizar sexo a valores reales de la BD: 'Masculino' | 'Femenino'
    const normSexo = (() => {
      const raw = (sexo ?? '').toString().trim().toLowerCase();
      if (!raw) return null;
      if (raw === 'm' || raw.startsWith('masc')) return 'Masculino';
      if (raw === 'f' || raw.startsWith('feme')) return 'Femenino';
      return null;
    })();
    const filtros = [];
    const params = [];
    let idx = 1;
    if (toValOrNull(desde)) {
      filtros.push(`l.fecha_laboratorio >= $${idx}`);
      params.push(toValOrNull(desde));
      idx++;
    }
    if (toValOrNull(hasta)) {
      filtros.push(`l.fecha_laboratorio <= $${idx}`);
      params.push(toValOrNull(hasta));
      idx++;
    }
    if (toValOrNull(noafiliacion)) {
      filtros.push(`l.no_afiliacion = $${idx}`);
      params.push(toValOrNull(noafiliacion));
      idx++;
    }
    const idLab = toIntOrNull(idlaboratorio);
    if (idLab !== null) {
      filtros.push(`l.idlaboratorio = $${idx}`);
      params.push(idLab);
      idx++;
    }
    if (normSexo) {
      filtros.push(`p.sexo = $${idx}`);
      params.push(normSexo);
      idx++;
    }

    const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
    const sql = `
      SELECT
        l.*,
        l.idlaboratorio                 AS id_laboratorio,
        l.no_afiliacion                 AS no_afiliacion,
        p.primer_nombre,
        p.segundo_nombre,
        p.primer_apellido,
        p.segundo_apellido,
        p.sexo,
        l.fecha_laboratorio,
        per.descripcion                 AS periodicidad,
        l.examen_realizado,
        l.causa_no_realizado,
        l.infeccion_acceso,
        l.complicacion_acceso,
        l.virologia,
        l.antigeno_hepatitis_c,
        l.antigeno_superficie,
        l.hiv,
        l.observacion,
        NULL::text AS usuario_creacion,
        l.fecha_registro,
        COALESCE(params.parametros, '[]'::json) AS parametros
      FROM public.tbl_laboratorios l
      INNER JOIN public.tbl_pacientes p ON p.no_afiliacion = l.no_afiliacion
      LEFT JOIN public.tbl_periodicidadlaboratorio per ON per.idperlaboratorio = l.idperlaboratorio
      LEFT JOIN LATERAL (
        SELECT json_agg(
                 json_build_object(
                   'idparametro', pl.idparametro,
                   'parametro', pl.parametro,
                   'valor', pl.valor
                 )
                 ORDER BY pl.parametro
               ) AS parametros
        FROM public.tbl_parametros_laboratorio pl
        WHERE pl.idlaboratorio = l.idlaboratorio
      ) params ON true
      ${where}
      ORDER BY l.idlaboratorio DESC
      LIMIT 500
    `;
    const { rows } = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en Laboratorios /historial (filtros):', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

module.exports = router;
