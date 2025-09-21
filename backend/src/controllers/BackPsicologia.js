const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const jwt = require('jsonwebtoken');
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

    const sql = `
      SELECT public.fn_guardar_evaluacion_psicologia(
        $1::text,   -- no_afiliacion
        $2::text,   -- motivo_consulta
        $3::text,   -- tipo_consulta
        $4::text,   -- tipo_atencion
        $5::text,   -- pronostico
        $6::boolean,-- aplicacion_kdqol
        $7::int,    -- fisico_mental
        $8::int,    -- enfermedad_renal
        $9::int,    -- sintomas_problemas
        $10::int,   -- efectos_enfermedad
        $11::int,   -- vida_diaria
        $12::text,  -- observaciones
        $13::text   -- usuario_creacion
      ) AS result
    `;
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

    const { rows } = await pool.query(sql, params);
    const payload = rows[0]?.result;

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
