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

async function getNombreUsuario(req) {
  try {
    const auth = req.headers?.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET);
    const sub = payload?.sub;
    if (!sub) return null;
    const { rows } = await pool.query('SELECT * FROM fn_usuario_autenticado($1)', [sub]);
    const user = rows?.[0];
    return user?.nombre_usuario || null;
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
        $7::numeric,-- fisico_mental
        $8::numeric,-- enfermedad_renal
        $9::numeric,-- sintomas_problemas
        $10::numeric,-- efectos_enfermedad
        $11::numeric,-- vida_diaria
        $12::text,  -- observaciones
        $13::text   -- usuario_creacion
      ) AS result
    `;
    const usuarioNombre = await getNombreUsuario(req);
    const params = [
      no_afiliacion,
      motivo_consulta,
      tipo_consulta,
      tipo_atencion,
      pronostico_paciente,
      aplicacion_kdqol === 'Si' || aplicacion_kdqol === true,
      fisico_mental || null,
      enfermedad_renal || null,
      sintomas_problemas || null,
      efectos_enfermedad || null,
      vida_diaria || null,
      observaciones || null,
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

/*
router.post('/evaluacion', guardarEvaluacion);

// Endpoint para obtener historial de informes psicológicos de un paciente
router.get('/historial/:noafiliacion', async (req, res) => {
  try {
    const { noafiliacion } = req.params;
    
    const query = `
      SELECT 
        id_informe,
        motivo_consulta,
        tipo_consulta,
        tipo_atencion,
        pronostico,
        observaciones,
        kdqol,
        fecha_creacion,
        usuario_creacion
      FROM tbl_informes_psicologia 
      WHERE no_afiliacion = $1
      ORDER BY fecha_creacion DESC
    `;
    
    const result = await pool.query(query, [noafiliacion]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Endpoint para obtener datos KDQOL de un paciente
router.get('/kdqol/:noafiliacion', async (req, res) => {
  try {
    const { noafiliacion } = req.params;
    
    const query = `
      SELECT 
        id_kdqol,
        fecha_aplicacion,
        puntaje_fisico,
        puntaje_mental,
        puntaje_sintomas,
        puntaje_carga,
        puntaje_efectos,
        fecha_creacion,
        usuario_creacion
      FROM tbl_kdqol 
      WHERE no_afiliacion = $1
      ORDER BY fecha_aplicacion DESC
    `;
    
    const result = await pool.query(query, [noafiliacion]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error al obtener datos KDQOL:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});*/

module.exports = router;
