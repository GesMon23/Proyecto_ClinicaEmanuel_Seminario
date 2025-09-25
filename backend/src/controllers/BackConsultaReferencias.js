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
    // Llamar SP con transacción y cursor
    const client = await pool.connect();
    let rows = [];
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_consulta_referencias_filtrado';
      await client.query('CALL public.sp_consultar_referencias_filtrado($1, $2, $3, $4, $5, $6, $7)', [...params, cursorName]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      rows = fetchRes.rows;
      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
    return res.json(rows);
  } catch (err) {
    console.error('Error al consultar referencias:', err);
    return res.status(500).json({ detail: 'Error al consultar referencias.' });
  }
});

module.exports = router;