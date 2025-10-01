const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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

// GET /empleados/sin-usuario - empleados activos que no tienen usuario asignado
router.get(
  '/empleados/sin-usuario',
  verifyJWT,
  requireRole(['RolGestionUsuarios']),
  async (_req, res) => {
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const cursorName = 'cur_empleados_sin_usuario';
        await client.query('CALL public.sp_empleados_sin_usuario($1)', [cursorName]);
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
      console.error('Error en GET /empleados/sin-usuario:', err);
      return res.status(500).json({ error: 'No fue posible obtener empleados sin usuario' });
    }
  }
);


// GET /usuarios/existe?usuario=xxxx - verifica si el nombre de usuario ya existe (case-insensitive)
router.get(
  '/usuarios/existe',
  verifyJWT,
  requireRole(['RolGestionUsuarios']),
  async (req, res) => {
    try {
      const usuario = (req.query.usuario || '').toString().trim();
      if (!usuario) return res.status(400).json({ error: 'usuario es requerido' });

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const cursorName = 'cur_usuario_existe';
        await client.query('CALL public.sp_usuario_existe($1, $2)', [usuario, cursorName]);
        const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
        await client.query('COMMIT');
        const existe = fetchRes.rows?.[0]?.existe === true;
        return res.json({ existe });
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        throw e;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Error en GET /usuarios/existe:', err);
      return res.status(500).json({ error: 'No fue posible validar usuario' });
    }
  }
);

// POST /usuarios - crea un usuario con contraseña genérica y asigna roles
// body: { usuario: string(8 letras), id_empleado: number, roles: number[] }
router.post('/usuarios', verifyJWT, requireRole(['RolGestionUsuarios']), async (req, res) => {
  const { usuario, id_empleado, roles } = req.body || {};
  let client;
  try {
    // Validaciones básicas
    if (!usuario || !/^[a-z]{8}$/.test(usuario)) {
      return res.status(400).json({ error: 'usuario debe ser 8 letras (a-z)' });
    }
    if (!id_empleado) {
      return res.status(400).json({ error: 'id_empleado es requerido' });
    }

    // Verificar existencia de usuario via SP
    {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const cursorName = 'cur_usuario_existe_pre';
        await client.query('CALL public.sp_usuario_existe($1, $2)', [usuario, cursorName]);
        const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
        await client.query('COMMIT');
        if (fetchRes.rows?.[0]?.existe === true) {
          client.release();
          return res.status(409).json({ error: 'El nombre de usuario ya existe' });
        }
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        client.release();
        throw e;
      }
      client.release();
    }

    // Preparar hash de contraseña genérica (se mantiene en Node)
    const passwordPlano = 'Clinica1.';
    const hash = await bcrypt.hash(passwordPlano, 10);

    // Resolver nombre de usuario (actor) para auditoría de creación
    let actorNombre = (req.user && (req.user.nombre_usuario || req.user.usuario)) || null;
    if (!actorNombre) {
      const idU = req.user && (req.user.id_usuario || req.user.id || req.user.sub);
      if (idU) {
        try {
          const rUser = await pool.query(
            'SELECT nombre_usuario FROM public.tbl_usuarios WHERE id_usuario = $1 LIMIT 1',
            [Number(idU)]
          );
          actorNombre = rUser.rows?.[0]?.nombre_usuario || null;
        } catch (_) {
          actorNombre = null;
        }
      }
    }

    // Transacción
    client = await pool.connect();
    await client.query('BEGIN');

    const usuario_creacion = String(actorNombre || 'sistema');
    const rolesArr = Array.isArray(roles) ? roles : [];

    // Crear usuario + asignar roles en DB via SP con cursor
    const cursorName = 'cur_crear_usuario_con_roles';
    await client.query('CALL public.sp_crear_usuario_con_roles($1, $2, $3, $4, $5, $6)', [
      usuario,
      id_empleado,
      hash,
      rolesArr,
      usuario_creacion,
      cursorName,
    ]);
    const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
    const id_usuario = fetchRes.rows?.[0]?.id_usuario || null;
    // Marcar para forzar cambio de contraseña en el primer login
    if (id_usuario) {
      try {
        await client.query('CALL public.sp_usuario_flag_force_change_set($1, $2)', [id_usuario, true]);
      } catch (_) { /* noop: no bloquear creación por error de flag */ }
    }

    await client.query('COMMIT');
    return res.status(201).json({ id_usuario });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      client.release();
      client = null;
    }
    console.error('Error en POST /usuarios:', err);
    return res.status(500).json({ error: 'No fue posible crear el usuario' });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
