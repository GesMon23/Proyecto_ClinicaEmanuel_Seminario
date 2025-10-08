const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../../db/pool');
const { runWithUser } = require('../db');

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

  // Usar SP con cursor: sp_listar_empleados
  const params = [term || null, hasEstado ? String(estado) === 'true' : null, Number(limit) || 50, Number(offset) || 0];

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_listar_empleados';
      await client.query('CALL public.sp_listar_empleados($1, $2, $3, $4, $5)', [...params, cursorName]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      await client.query('COMMIT');
      return res.json(fetchRes.rows);
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error en GET /empleados (SP):', err);
    return res.status(501).json({
      error: 'Listado de empleados no disponible',
      detalle: 'Verifica que exista sp_listar_empleados(q, estado, limit, offset, refcursor) en la BD.',
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

  // Usar runWithUser para propagar app.current_user
  const userName = String(req.user?.nombre_usuario || req.user?.usuario || req.user?.sub || 'sistema');
  try {
    let ok = false;
    await runWithUser(userName, async (client) => {
      // Auditoría (actor): resolver con función de BD en la misma transacción
      const nombreJWT = (req.user && (req.user.nombre_usuario || req.user.usuario)) || null;
      const idJWT = Number(req.user && (req.user.id_usuario || req.user.id || req.user.sub)) || null;
      const rActor = await client.query('SELECT public.fn_resolver_actor($1, $2) AS actor_nombre', [nombreJWT, idJWT]);
      const actorNombre = rActor.rows?.[0]?.actor_nombre || null;

      const cursorName = 'cur_actualizar_empleado';
      await client.query('CALL public.sp_actualizar_empleado($1, $2, $3, $4)', [dpi, JSON.stringify(datos), actorNombre, cursorName]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      ok = fetchRes.rows?.[0]?.success === true;
    });
    if (!ok) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Error en PUT /empleados/:dpi (SP):', err);
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Conflicto de datos', detalle: 'El DPI ya existe.' });
    }
    return res.status(501).json({
      error: 'Actualización no disponible',
      detalle: 'Verifica que exista sp_actualizar_empleado(original_dpi, datos jsonb, actor, refcursor) en la BD.',
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
  const userName = String(req.user?.nombre_usuario || req.user?.usuario || req.user?.sub || 'sistema');
  try {
    let ok = false;
    await runWithUser(userName, async (client) => {
      // Resolver actor con función de BD en la misma transacción
      const nombreJWT2 = (req.user && (req.user.nombre_usuario || req.user.usuario)) || null;
      const idJWT2 = Number(req.user && (req.user.id_usuario || req.user.id || req.user.sub)) || null;
      const rActor2 = await client.query('SELECT public.fn_resolver_actor($1, $2) AS actor_nombre', [nombreJWT2, idJWT2]);
      const actorNombre = rActor2.rows?.[0]?.actor_nombre || null;

      const cursorName = 'cur_cambiar_estado_empleado';
      await client.query('CALL public.sp_cambiar_estado_empleado($1, $2, $3, $4)', [dpi, Boolean(activo), actorNombre, cursorName]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      ok = fetchRes.rows?.[0]?.success === true;
    });
    if (!ok) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Error en PATCH /empleados/:dpi/estado (SP):', err);
    return res.status(501).json({
      error: 'Cambio de estado no disponible',
      detalle: 'Verifica que exista sp_cambiar_estado_empleado(dpi, activo, actor, refcursor) en la BD.',
    });
  }
});

module.exports = router;
