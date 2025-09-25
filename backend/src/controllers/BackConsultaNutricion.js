const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');

// GET /historial/:noafiliacion - historial de informes nutrición
router.get('/historial/:noafiliacion', async (req, res) => {
  try {
    const { noafiliacion } = req.params;
    // Usar SP con cursor
    const client = await pool.connect();
    let rows = [];
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_hist_nutri_afiliacion';
      await client.query('CALL public.sp_historial_nutricion_por_afiliacion($1, $2)', [noafiliacion, cursorName]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      rows = fetchRes.rows;
      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en Nutrición /historial:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// GET /historial (con filtros)
// Query params opcionales: desde (YYYY-MM-DD), hasta (YYYY-MM-DD), noafiliacion, idinforme, sexo (M/F)
router.get('/historial', async (req, res) => {
  try {
    const { desde, hasta, noafiliacion, idinforme, sexo } = req.query;
    const toValOrNull = (v) => {
      const s = (v ?? '').toString().trim();
      return s === '' ? null : s;
    };
    // Normalizar sexo a valores reales de la BD: 'Masculino' | 'Femenino'
    const normSexo = (() => {
      const raw = (sexo ?? '').toString().trim().toLowerCase();
      if (!raw) return null;
      if (raw === 'm' || raw.startsWith('masc')) return 'Masculino';
      if (raw === 'f' || raw.startsWith('feme')) return 'Femenino';
      return null;
    })();
    const params = [
      toValOrNull(desde),
      toValOrNull(hasta),
      toValOrNull(noafiliacion),
      toValOrNull(idinforme),
      normSexo,
    ];
    // Usar SP con cursor
    const client = await pool.connect();
    let rows = [];
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_hist_nutri_filtrado';
      await client.query('CALL public.sp_historial_nutricion_filtrado($1, $2, $3, $4, $5, $6)', [...params, cursorName]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      rows = fetchRes.rows;
      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en Nutrición /historial (filtros):', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

module.exports = router;
