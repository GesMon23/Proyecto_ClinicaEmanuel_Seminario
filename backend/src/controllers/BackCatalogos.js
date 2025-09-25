const express = require('express');
const pool = require('../../db/pool');
const router = express.Router();
router.use(express.json());

// GET /medicos - listado de médicos desde SP
router.get('/medicos', async (req, res) => {
  try {
    const client = await pool.connect();
    let rows = [];
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_mostrar_medicos';
      await client.query('CALL public.sp_mostrar_medicos($1)', [cursorName]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      rows = fetchRes.rows || [];
      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
    const mapped = rows.map(r => {
      const id = r.idmedico ?? r.id_medico ?? r.id ?? r.iddoctor ?? r.id_doctor ?? null;
      const nombre = r.nombrecompleto ?? r.nombre_completo ?? r.nombre ?? r.nombremedico ?? r.nombre_medico ?? null;
      return {
        idmedico: id,
        nombrecompleto: nombre ?? (id != null ? String(id) : '')
      };
    });
    res.json(mapped);
  } catch (error) {
    console.error('Error al obtener médicos:', error);
    res.status(500).json({ detail: 'Error al obtener médicos.' });
  }
});

module.exports = router;
