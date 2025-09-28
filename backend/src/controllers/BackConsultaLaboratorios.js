const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');

// GET /api/laboratorios/catalogos - catálogos para filtros (SELECT simple)
router.get('/api/laboratorios/catalogos', async (_req, res) => {
  try {
    const [periodicidades, sexos] = await Promise.all([
      pool.query('SELECT descripcion FROM public.tbl_periodicidadlaboratorio ORDER BY descripcion'),
      pool.query("SELECT DISTINCT sexo FROM public.tbl_pacientes WHERE sexo IS NOT NULL ORDER BY sexo"),
    ]);
    res.json({
      periodicidades: periodicidades.rows.map(r => r.descripcion).filter(Boolean),
      sexos: sexos.rows.map(r => r.sexo).filter(Boolean),
    });
  } catch (error) {
    console.error('Error en Laboratorios /catalogos:', error);
    res.status(500).json({ error: 'Error al cargar catálogos.' });
  }
});

// GET /api/laboratorios/historial/:noafiliacion - historial por afiliación
router.get('/api/laboratorios/historial/:noafiliacion', async (req, res) => {
  try {
    const { noafiliacion } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_lab_historial_afiliacion';
      await client.query('CALL public.sp_laboratorios_historial_por_afiliacion($1,$2)', [
        noafiliacion,
        cursorName,
      ]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      await client.query('COMMIT');
      return res.json({ success: true, data: fetchRes.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error en Laboratorios /historial/:noafiliacion', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// GET /api/laboratorios/historial - filtros opcionales
// Query params: desde (YYYY-MM-DD), hasta (YYYY-MM-DD), noafiliacion, idlaboratorio, sexo (M/F)
router.get('/api/laboratorios/historial', async (req, res) => {
  try {
    const { desde, hasta, noafiliacion, idlaboratorio, sexo, periodicidad } = req.query;
    const toValOrNull = (v) => {
      const s = (v ?? '').toString().trim();
      return s === '' ? null : s;
    };
    const toIntOrNull = (v) => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_lab_historial_filtrado';
      await client.query('CALL public.sp_laboratorios_historial_filtrado($1,$2,$3,$4,$5,$6,$7)', [
        toValOrNull(desde),
        toValOrNull(hasta),
        toValOrNull(noafiliacion),
        toIntOrNull(idlaboratorio),
        toValOrNull(sexo),
        toValOrNull(periodicidad),
        cursorName,
      ]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      await client.query('COMMIT');
      return res.json({ success: true, data: fetchRes.rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error en Laboratorios /historial (filtros):', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

module.exports = router;
