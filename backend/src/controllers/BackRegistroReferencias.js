const express = require('express');
const pool = require('../../db/pool');
const router = express.Router();
router.use(express.json());
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

async function resolveActorNombre(req) {
  try {
    const auth = req.headers?.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET);
    const nombreJWT = payload?.nombre_usuario || null;
    const idJWT = payload?.sub ? Number(payload.sub) : null;
    const { rows } = await pool.query('SELECT public.fn_resolver_actor($1, $2) AS actor_nombre', [nombreJWT, idJWT]);
    return rows?.[0]?.actor_nombre || null;
  } catch (_) {
    return null;
  }
}

// POST /api/referencias - Registrar una nueva referencia
router.post('/api/referencias', async (req, res) => {
  const { noafiliacion, fechareferencia, motivotraslado, idmedico, especialidadreferencia } = req.body;
  if (!noafiliacion || !fechareferencia || !motivotraslado || !idmedico || !especialidadreferencia) {
    return res.status(400).json({ detail: 'Todos los campos son obligatorios.' });
  }
  try {
    const usuarioNombre = await resolveActorNombre(req);
    const params = [
      String(noafiliacion).trim(),
      fechareferencia,
      String(motivotraslado).trim(),
      Number(idmedico),
      String(especialidadreferencia).trim(),
      usuarioNombre || 'sistema'
    ];

    // Llamar SP con transacción y cursor
    const client = await pool.connect();
    let refRows = [];
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_registrar_referencia';
      await client.query('CALL public.sp_registrar_referencia($1, $2, $3, $4, $5, $6, $7)', [...params, cursorName]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      refRows = fetchRes.rows || [];
      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
    res.status(201).json({ success: true, referencia: refRows?.[0] || null });
  } catch (err) {
    console.error('Error al registrar referencia:', err);
    // Mapear errores específicos lanzados por la función
    const msg = err?.message || '';
    if (/Paciente no encontrado/i.test(msg)) {
      return res.status(404).json({ detail: 'Paciente no encontrado.' });
    }
    if (/id_medico invalido/i.test(msg)) {
      return res.status(400).json({ detail: 'ID de médico inválido.' });
    }
    res.status(500).json({ detail: 'Error al registrar referencia.' });
  }
});

module.exports = router;
