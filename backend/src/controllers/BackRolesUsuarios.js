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

// GET /roles/activos - lista de roles activos
router.get(
  '/roles/activos',
  verifyJWT,
  requireRole(['RolGestionUsuarios']),
  async (_req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM public.fn_roles_activos()');
      return res.json(rows);
    } catch (err) {
      console.error('Error en GET /roles/activos:', err);
      return res.status(500).json({ error: 'No fue posible obtener roles' });
    }
  }
);

// GET /usuarios/by-usuario?usuario=xxxx - busca usuario por nombre_usuario
router.get(
  '/usuarios/by-usuario',
  verifyJWT,
  requireRole(['RolGestionUsuarios']),
  async (req, res) => {
    try {
      const usuario = (req.query.usuario || '').toString().trim();
      if (!usuario) return res.status(400).json({ error: 'usuario es requerido' });
      
      const { rows } = await pool.query(
        'SELECT * FROM public.fn_buscar_usuario_por_nombre($1)',
        [usuario]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
      return res.json(rows[0]);
    } catch (err) {
      console.error('Error en GET /usuarios/by-usuario:', err);
      return res.status(500).json({ error: 'No fue posible buscar el usuario' });
    }
  }
);

// GET /usuarios/:id/roles - obtiene roles asignados al usuario
router.get(
  '/usuarios/:id/roles',
  verifyJWT,
  requireRole(['RolGestionUsuarios']),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ error: 'id inválido' });
      
      const { rows } = await pool.query(
        'SELECT * FROM public.fn_roles_usuario_detalle($1)',
        [id]
      );
      return res.json(rows);
    } catch (err) {
      console.error('Error en GET /usuarios/:id/roles:', err);
      return res.status(500).json({ error: 'No fue posible obtener roles del usuario' });
    }
  }
);

// PUT /usuarios/:id/roles - reemplaza las asignaciones de roles del usuario
// body: { roles: number[] }
router.put(
  '/usuarios/:id/roles',
  verifyJWT,
  requireRole(['RolGestionUsuarios']),
  async (req, res) => {
    const id = Number(req.params.id);
    const roles = Array.isArray(req.body?.roles) ? req.body.roles.map(Number).filter(n => Number.isInteger(n)) : [];
    if (!id) return res.status(400).json({ error: 'id inválido' });
    
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      
      const usuario_creacion = String(req.user?.sub || 'sistema');
      await client.query(
        'CALL public.sp_actualizar_roles_usuario($1, $2, $3)',
        [id, roles, usuario_creacion]
      );
      
      await client.query('COMMIT');
      return res.json({ ok: true });
    } catch (err) {
      if (client) { 
        try { await client.query('ROLLBACK'); } catch (_) {} 
      }
      console.error('Error en PUT /usuarios/:id/roles:', err);
      return res.status(500).json({ error: 'No fue posible actualizar roles' });
    } finally {
      if (client) client.release();
    }
  }
);

// PATCH /usuarios/:id/estado - activa/inactiva un usuario
// body: { estado: boolean }
router.patch(
  '/usuarios/:id/estado',
  verifyJWT,
  requireRole(['RolGestionUsuarios']),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { estado } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id inválido' });
      if (typeof estado !== 'boolean') return res.status(400).json({ error: 'estado debe ser boolean' });
      
      await pool.query('SELECT public.fn_actualizar_estado_usuario($1, $2)', [id, estado]);
      return res.json({ ok: true });
    } catch (err) {
      console.error('Error en PATCH /usuarios/:id/estado:', err);
      return res.status(500).json({ error: 'No fue posible actualizar el estado del usuario' });
    }
  }
);
module.exports = router;
