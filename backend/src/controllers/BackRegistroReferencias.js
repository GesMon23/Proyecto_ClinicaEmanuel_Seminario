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
    const sql = `
      SELECT * FROM public.fn_registrar_referencia(
        $1::text,   -- no_afiliacion
        $2::date,   -- fecha_referencia
        $3::text,   -- motivo_traslado
        $4::int,    -- id_medico
        $5::text,   -- especialidad_referencia
        $6::text    -- usuario_creacion
      )
    `;
    const params = [
      String(noafiliacion).trim(),
      fechareferencia,
      String(motivotraslado).trim(),
      Number(idmedico),
      String(especialidadreferencia).trim(),
      usuarioNombre || 'sistema'
    ];
    const { rows } = await pool.query(sql, params);
    res.status(201).json({ success: true, referencia: rows?.[0] || null });
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
