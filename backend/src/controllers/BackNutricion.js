const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const jwt = require('jsonwebtoken');
const { runWithUser } = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function getUserIdFromReq(req) {
  try {
    const auth = req.headers?.authorization || '';
    const token = auth.startsWith('Bearer ')
      ? auth.slice(7)
      : null;
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET);
    return payload?.sub ? String(payload.sub) : null;
  } catch (_) {
    return null;
  }
}
async function resolveActorNombre(req) {
  try {
    const auth = req.headers?.authorization || '';
    const token = auth.startsWith('Bearer ')
      ? auth.slice(7)
      : null;
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

// Helper: clasificar IMC
function clasificarIMC(imc) {
  if (imc == null) return null;
  if (imc < 18.5) return 'Bajo peso';
  if (imc < 25) return 'Normal';
  if (imc < 30) return 'Sobrepeso';
  return 'Obesidad';
}

// POST /evaluacion - crear informe de nutrición
router.post('/evaluacion', async (req, res) => {
  try {
    const {
      no_afiliacion,
      motivo_consulta,
      altura_cm,
      peso_kg,
      observaciones,
      usuario_creacion
    } = req.body;
    // Derivar usuario para GUC app.current_user
    let userName = 'web';
    try {
      const auth = req.headers?.authorization || '';
      if (auth.startsWith('Bearer ')) {
        const token = auth.slice(7);
        const payloadJwt = jwt.verify(token, JWT_SECRET);
        userName = payloadJwt?.nombre_usuario || String(payloadJwt?.sub || 'web');
      }
    } catch (_) {}

    // Prevalidación estado del paciente: no permitir egresado o fallecido
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const cur = 'cur_pac_para_nutri';
        await client.query('CALL public.sp_paciente_por_afiliacion($1,$2)', [no_afiliacion, cur]);
        const r = await client.query(`FETCH ALL FROM "${cur}"`);
        await client.query('COMMIT');
        const pac = r.rows?.[0] || null;
        if (!pac) return res.status(404).json({ error: 'Paciente no encontrado' });
        const idEstado = Number(pac.id_estado ?? pac.idestado ?? 0);
        const idCausa = Number(pac.id_causa ?? pac.idcausa ?? 0);
        const causaDesc = String(pac.causaegreso_descripcion ?? pac.causa_egreso_descripcion ?? pac.descripcion ?? '').toLowerCase();
        const estadoDesc = String(pac.estado_descripcion ?? pac.estado ?? '').toLowerCase();
        const esEgresado = idEstado === 3 || estadoDesc.includes('egres');
        const esFallecido = idCausa === 1 || causaDesc.includes('fallec') || estadoDesc.includes('fallec');
        if (esEgresado || esFallecido) {
          return res.status(400).json({ error: 'No se puede registrar nutrición para pacientes egresados o fallecidos.' });
        }
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        // Si falla la consulta, devolver error controlado
        return res.status(500).json({ error: 'Error al validar estado del paciente.' });
      } finally {
        try { client.release(); } catch (_) {}
      }
    } catch (_) {
      return res.status(500).json({ error: 'Error al validar estado del paciente.' });
    }

    // Llamar al SP dentro de runWithUser para que los triggers tomen app.current_user
    const usuarioNombre = await resolveActorNombre(req);
    const params = [
      no_afiliacion,
      motivo_consulta,
      altura_cm,
      peso_kg,
      observaciones || null,
      usuarioNombre || 'sistema'
    ];

    const payload = await runWithUser(String(userName), async (client) => {
      const cursorName = 'cur_guardar_informe_nutricion';
      await client.query('CALL public.sp_guardar_informe_nutricion($1, $2, $3, $4, $5, $6, $7)', [...params, cursorName]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      return fetchRes.rows?.[0]?.result || null;
    });

    return res.status(201).json({
      message: 'Informe de nutrición guardado exitosamente',
      informe: payload
    });
  } catch (error) {
    // Manejo de errores levantados en la función (validaciones/paciente no encontrado)
    if (error.code === 'P0001') {
      if (/Paciente no encontrado/i.test(error.message)) {
        return res.status(404).json({ error: 'Paciente no encontrado' });
      }
      return res.status(400).json({ error: error.message });
    }
    console.error('Error en Nutrición /evaluacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor', detalle: error.message });
  }
});


module.exports = router;
