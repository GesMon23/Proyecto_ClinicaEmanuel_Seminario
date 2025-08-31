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
router.get('/empleados/sin-usuario', verifyJWT, requireRole(['RolGestionUsuarios']), async (_req, res) => {
  const sql = `
    SELECT 
      e.id_empleado,
      e.dpi,
      e.primer_nombre,
      e.segundo_nombre,
      e.otros_nombres,
      e.primer_apellido,
      e.segundo_apellido,
      e.apellido_casada,
      CONCAT_WS(' ', e.primer_nombre, e.segundo_nombre, e.otros_nombres, e.primer_apellido, e.segundo_apellido, e.apellido_casada) AS nombre_completo
    FROM tbl_empleados e
    LEFT JOIN tbl_usuarios u ON u.id_empleado = e.id_empleado
    WHERE u.id_usuario IS NULL AND (e.estado IS DISTINCT FROM FALSE)
    ORDER BY e.id_empleado ASC
  `;
  try {
    const result = await pool.query(sql);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error en GET /empleados/sin-usuario:', err);
    return res.status(500).json({ error: 'No fue posible obtener empleados sin usuario' });
  }
});


// GET /usuarios/existe?usuario=xxxx - verifica si el nombre de usuario ya existe (case-insensitive)
router.get('/usuarios/existe', verifyJWT, requireRole(['RolGestionUsuarios']), async (req, res) => {
  try {
    const usuario = (req.query.usuario || '').toString().trim();
    if (!usuario) return res.status(400).json({ error: 'usuario es requerido' });
    const sql = `SELECT EXISTS (SELECT 1 FROM tbl_usuarios WHERE lower(nombre_usuario) = lower($1)) AS existe`;
    const { rows } = await pool.query(sql, [usuario]);
    return res.json({ existe: !!rows?.[0]?.existe });
  } catch (err) {
    console.error('Error en GET /usuarios/existe:', err);
    return res.status(500).json({ error: 'No fue posible validar usuario' });
  }
});

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

    // Verificar existencia de usuario
    const existRes = await pool.query(
      'SELECT EXISTS (SELECT 1 FROM tbl_usuarios WHERE lower(nombre_usuario)=lower($1)) existe',
      [usuario]
    );
    if (existRes.rows?.[0]?.existe) {
      return res.status(409).json({ error: 'El nombre de usuario ya existe' });
    }

    // Preparar hash de contraseña genérica
    const passwordPlano = 'Clinica1.';
    const hash = await bcrypt.hash(passwordPlano, 10);

    // Transacción con cliente dedicado
    client = await pool.connect();
    await client.query('BEGIN');

    // Insertar usuario
    const insUserSql = `
      INSERT INTO tbl_usuarios (nombre_usuario, contrasenia, id_empleado, estado, usuario_creacion, fecha_creacion)
      VALUES ($1, $2, $3, TRUE, $4, NOW())
      RETURNING id_usuario
    `;
    const usuario_creacion = req.user?.sub || 'sistema';
    const insUserRes = await client.query(insUserSql, [usuario, hash, id_empleado, String(usuario_creacion)]);
    const id_usuario = insUserRes.rows[0]?.id_usuario;

    // Asignar roles si vienen
    const rolesArr = Array.isArray(roles) ? roles : [];
    for (const id_rol of rolesArr) {
      await client.query(
        `INSERT INTO tbl_usuario_rol (id_usuario, id_rol, usuario_creacion, fecha_creacion)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (id_usuario, id_rol) DO NOTHING`,
        [id_usuario, id_rol, String(usuario_creacion)]
      );
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
