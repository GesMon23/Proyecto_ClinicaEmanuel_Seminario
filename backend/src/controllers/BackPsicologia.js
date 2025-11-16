const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const jwt = require('jsonwebtoken');
const { runWithUser } = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function getUserIdFromReq(req) {
  try {
    const auth = req.headers?.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
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

// Endpoint para guardar evaluación psicológica (usando función SQL)
const guardarEvaluacion = async (req, res) => {
  try {
    const { 
      no_afiliacion, 
      motivo_consulta, 
      tipo_consulta, 
      tipo_atencion, 
      pronostico_paciente,
      aplicacion_kdqol,
      fisico_mental,
      enfermedad_renal,
      sintomas_problemas,
      efectos_enfermedad,
      vida_diaria,
      observaciones
    } = req.body;

    const usuarioNombre = await resolveActorNombre(req);
    // Normalizaciones
    const quitarAcentos = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const esSi = (v) => {
      if (typeof v === 'boolean') return v === true;
      const t = quitarAcentos(String(v || '')).trim().toLowerCase();
      return t === 'si';
    };
    const toIntOrNull = (v) => {
      if (v === null || v === undefined || v === '') return null;
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    };

    const params = [
      no_afiliacion || null,
      (motivo_consulta || '').trim() || null,
      (tipo_consulta || '').trim() || null,
      (tipo_atencion || '').trim() || null,
      (pronostico_paciente || '').trim() || null,
      esSi(aplicacion_kdqol),
      toIntOrNull(fisico_mental),
      toIntOrNull(enfermedad_renal),
      toIntOrNull(sintomas_problemas),
      toIntOrNull(efectos_enfermedad),
      toIntOrNull(vida_diaria),
      (observaciones || '').trim() || null,
      usuarioNombre || 'sistema'
    ];

    // Prevalidación: NO permitir registro si paciente está egresado o fallecido
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const cur = 'cur_paciente_psico';
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
          return res.status(400).json({ error: 'No se puede registrar psicología para pacientes egresados o fallecidos.' });
        }
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        return res.status(500).json({ error: 'Error al validar estado del paciente.' });
      } finally {
        try { client.release(); } catch (_) {}
      }
    } catch (_) {
      return res.status(500).json({ error: 'Error al validar estado del paciente.' });
    }

    // Derivar usuario autenticado para GUC app.current_user
    let userName = 'web';
    try {
      const auth = req.headers?.authorization || '';
      if (auth.startsWith('Bearer ')) {
        const token = auth.slice(7);
        const payloadJwt = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
        userName = payloadJwt?.nombre_usuario || String(payloadJwt?.sub || 'web');
      }
    } catch (_) {}

    // Llamar al SP dentro de runWithUser para que los triggers de auditoría tomen app.current_user
    const payload = await runWithUser(String(userName), async (client) => {
      const cursorName = 'cur_guardar_evaluacion_psicologia';
      await client.query('CALL public.sp_guardar_evaluacion_psicologia($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)', [...params, cursorName]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      return fetchRes.rows?.[0]?.result;
    });

    return res.status(201).json({
      message: 'Evaluación psicológica guardada exitosamente',
      informe: payload?.informe || null,
      kdqol: payload?.kdqol || null
    });
  } catch (error) {
    // Manejo de excepciones levantadas en la función (ej. paciente no encontrado)
    if (error.code === 'P0001' && /Paciente no encontrado/i.test(error.message)) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    console.error('Error al guardar evaluación:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      detalle: error.message 
    });
  };
};

// Registrar endpoint activo para guardar evaluación
router.post('/evaluacion', guardarEvaluacion);


module.exports = router;
