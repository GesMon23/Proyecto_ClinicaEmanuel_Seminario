const express = require('express');
const pool = require('../../db/pool');
const router = express.Router();
router.use(express.json());

// GET /medicos - listado de médicos desde función
router.get('/medicos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM FN_mostrar_medicos()');
    const rows = result.rows || [];
    const mapped = rows.map(r => {
      // Detectar posibles nombres para ID
      const id = r.idmedico ?? r.id_medico ?? r.id ?? r.iddoctor ?? r.id_doctor ?? null;
      // Detectar posibles nombres para nombre completo
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
