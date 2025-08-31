const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../../db/pool');

const router = express.Router();
router.use(express.json());

// ===== Auth helpers (alineado con BackLogin.js) =====
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function verifyJWT(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function requireRole(roles = []) {
  return (req, res, next) => {
    try {
      const userRoles = (req.user && req.user.roles) || [];
      const ok = roles.length === 0 || roles.some(r => userRoles.includes(r));
      if (!ok) return res.status(403).json({ error: 'No autorizado' });
      return next();
    } catch (e) {
      return res.status(403).json({ error: 'No autorizado' });
    }
  };
}
// ====================================================

// GET /empleados - listado con filtros básicos
router.get('/empleados', verifyJWT, requireRole(['RolGestionUsuarios']), async (req, res) => {
  const { q = '', estado, limit = 50, offset = 0 } = req.query || {};
  const term = String(q || '').trim();
  const hasEstado = typeof estado !== 'undefined' && estado !== '';

  // La función fn_listar_empleados ya aplica filtros, orden y paginación, y devuelve las columnas listas para la UI
  const sql = `SELECT * FROM fn_listar_empleados($1, $2, $3, $4)`;
  const params = [term || null, hasEstado ? String(estado) === 'true' : null, Number(limit) || 50, Number(offset) || 0];

  try {
    const result = await pool.query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error en GET /empleados (función):', err);
    return res.status(501).json({
      error: 'Listado de empleados no disponible',
      detalle: 'Asegúrate de tener la función fn_listar_empleados(q, estado, limit, offset) en la BD o ajusta el nombre/parámetros.',
    });
  }
});

// PUT /empleados/:dpi - actualizar datos del empleado
router.put('/empleados/:dpi', verifyJWT, requireRole(['RolGestionUsuarios']), async (req, res) => {
  const { dpi } = req.params;
  if (!dpi) return res.status(400).json({ error: 'DPI requerido' });

  // Campos permitidos a actualizar
  const allowed = [
    'dpi', 'primer_nombre', 'segundo_nombre', 'otros_nombres', 'primer_apellido', 'segundo_apellido',
    'apellido_casada', 'fecha_nacimiento', 'sexo', 'direccion', 'telefono', 'email', 'fecha_ingreso'
  ];

  // Construimos un JSON solo con los campos presentes en el body ('' -> null)
  const datos = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      datos[key] = req.body[key] === '' ? null : req.body[key];
    }
  }
  if (Object.keys(datos).length === 0) {
    return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
  }

  // Auditoría (actor)
  const actor = (req.user && (req.user.nombre_usuario || req.user.usuario || req.user.sub || req.user.id_usuario || req.user.id)) || null;

  // Llamamos a función/ procedimiento en BD
  // sp_actualizar_empleado(original_dpi text, datos jsonb, actor text) RETURNS boolean
  const sql = `SELECT sp_actualizar_empleado($1, $2::jsonb, $3) AS success`;
  const params = [dpi, JSON.stringify(datos), actor];

  try {
    const result = await pool.query(sql, params);
    const ok = result?.rows?.[0]?.success === true || result?.rows?.[0]?.sp_actualizar_empleado === true;
    if (!ok) {
      // Si la función devuelve false, asumimos que no encontró el registro
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Error en PUT /empleados/:dpi (función):', err);
    // Manejo de violación de unique (por ejemplo, DPI duplicado)
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Conflicto de datos', detalle: 'El DPI ya existe.' });
    }
    return res.status(501).json({
      error: 'Actualización no disponible',
      detalle: 'Asegúrate de tener sp_actualizar_empleado(original_dpi, datos jsonb, actor) en la BD o ajusta el nombre/parámetros.',
    });
  }
});

// PATCH /empleados/:dpi/estado - activar/inactivar empleado
router.patch('/empleados/:dpi/estado', verifyJWT, requireRole(['RolGestionUsuarios']), async (req, res) => {
  const { dpi } = req.params;
  const { activo } = req.body || {};
  if (!dpi || typeof activo === 'undefined') {
    return res.status(400).json({ error: 'dpi y activo son requeridos' });
  }
  const actor = (req.user && (req.user.nombre_usuario || req.user.usuario || req.user.sub || req.user.id_usuario || req.user.id)) || null;

  // Procedimiento/función en BD
  // sp_cambiar_estado_empleado(dpi text, activo boolean, actor text) RETURNS boolean
  const sql = `SELECT sp_cambiar_estado_empleado($1, $2, $3) AS success`;
  const params = [dpi, Boolean(activo), actor];
  try {
    const result = await pool.query(sql, params);
    const ok = result?.rows?.[0]?.success === true || result?.rows?.[0]?.sp_cambiar_estado_empleado === true;
    if (!ok) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Error en PATCH /empleados/:dpi/estado (función):', err);
    return res.status(501).json({
      error: 'Cambio de estado no disponible',
      detalle: 'Asegúrate de tener sp_cambiar_estado_empleado(dpi, activo, actor) en la BD o ajusta el nombre/parámetros.',
    });
  }
});

module.exports = router;
