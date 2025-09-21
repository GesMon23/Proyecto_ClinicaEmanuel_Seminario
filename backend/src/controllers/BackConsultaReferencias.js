const express = require('express');
const pool = require('../../db/pool');
const router = express.Router();
router.use(express.json());

// GET /api/referencias/consulta - consultar referencias mediante función SQL
router.get('/api/referencias/consulta', async (req, res) => {
  try {
    const { desde, hasta, idmedico, noafiliacion, idreferencia, sexo } = req.query;
    const toValOrNull = (v) => {
      const s = (v ?? '').toString().trim();
      return s === '' ? null : s;
    };
    const toIntOrNull = (v) => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
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
      toIntOrNull(idmedico),
      toValOrNull(noafiliacion),
      toValOrNull(idreferencia),
      normSexo,
    ];
    const sql = 'SELECT * FROM public.fn_consultar_referencias_filtrado($1, $2, $3, $4, $5, $6)';
    const { rows } = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('Error al consultar referencias:', err);
    return res.status(500).json({ detail: 'Error al consultar referencias.' });
  }
});

module.exports = router;