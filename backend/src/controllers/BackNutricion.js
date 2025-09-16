const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const jwt = require('jsonwebtoken');
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
async function getNombreUsuario(req) {
  try {
    const auth = req.headers?.authorization || '';
    const token = auth.startsWith('Bearer ')
      ? auth.slice(7)
      : null;
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
    // Llamar a la función SQL que encapsula validaciones, cálculo, código y el insert
    const sql = `
      SELECT public.fn_guardar_informe_nutricion(
        $1::text,     -- no_afiliacion
        $2::text,     -- motivo_consulta
        $3::numeric,  -- altura_cm
        $4::numeric,  -- peso_kg
        $5::text,     -- observaciones
        $6::text      -- usuario_creacion (nombre_usuario)
      ) AS result
    `;
    const usuarioNombre = await getNombreUsuario(req);
    const params = [
      no_afiliacion,
      motivo_consulta,
      altura_cm,
      peso_kg,
      observaciones || null,
      usuarioNombre || usuario_creacion || 'sistema'
    ];

    const { rows } = await pool.query(sql, params);

    return res.status(201).json({
      message: 'Informe de nutrición guardado exitosamente',
      informe: rows[0]?.result
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
/*
// GET /historial/:noafiliacion - historial de informes nutrición
router.get('/historial/:noafiliacion', async (req, res) => {
  try {
    const { noafiliacion } = req.params;
    const sql = `
      SELECT id_informe, motivo_consulta, estado_nutricional, observaciones,
             altura_cm, peso_kg, imc, usuario_creacion, fecha_creacion
      FROM public.tbl_informe_nutricion
      WHERE no_afiliacion = $1
      ORDER BY fecha_creacion DESC
    `;
    const { rows } = await pool.query(sql, [noafiliacion]);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en Nutrición /historial:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});*/

module.exports = router;
