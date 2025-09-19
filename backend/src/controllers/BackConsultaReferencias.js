const express = require('express');
const pool = require('../../db/pool');
const router = express.Router();
router.use(express.json());

// GET /api/referencias/consulta - consultar referencias mediante función SQL
router.get('/api/referencias/consulta', async (req, res) => {
  try {
    const { desde, hasta, idmedico } = req.query;
    const { rows } = await pool.query(
      'SELECT * FROM FN_mostrar_referencias($1, $2, $3)',
      [
        desde || null,
        hasta || null,
        idmedico || null
      ]
    );
    return res.json(rows);
  } catch (err) {
    console.error('Error al consultar referencias:', err);
    return res.status(500).json({ detail: 'Error al consultar referencias.' });
  }
});

module.exports = router;