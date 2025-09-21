const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');

// GET /api/psicologia/historial (con filtros): desde, hasta, noafiliacion, idinforme, sexo
router.get('/historial', async (req, res) => {
  try {
    const { desde, hasta, noafiliacion, idinforme, sexo } = req.query;
    const toValOrNull = (v) => {
      const s = (v ?? '').toString().trim();
      return s === '' ? null : s;
    };
    // Normalizar sexo a valores reales en BD: 'Masculino' | 'Femenino'
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
    const sql = 'SELECT * FROM public.fn_historial_psicologia_filtrado($1, $2, $3, $4, $5)';
    const { rows } = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en Psicología /historial (filtros):', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// GET /api/psicologia/historial/:noafiliacion - historial por afiliación
router.get('/historial/:noafiliacion', async (req, res) => {
  try {
    const { noafiliacion } = req.params;
    const sql = 'SELECT * FROM public.fn_historial_psicologia_por_afiliacion($1)';
    const { rows } = await pool.query(sql, [noafiliacion]);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en Psicología /historial:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

module.exports = router;
