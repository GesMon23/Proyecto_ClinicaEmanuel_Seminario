// Router de Login/Roles
const express = require('express');
const pool = require('./db/pool');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();
router.use(express.json());

// Pool compartido importado de ./db/pool

// ===================== HELPERS AUTH =====================
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
// ========================================================

// Endpoint para consultar usuarios activos
router.get('/api/usuarios-activos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * from fn_usuarios_activos()'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar usuarios activos:', error);
    res.status(500).json({ error: 'Error al consultar usuarios activos' });
  }
});

// Confirmación de contraseña para acciones sensibles
router.post('/auth/confirm-password', async (req, res) => {
  try {
    const { usuario, password } = req.body || {};
    if (!usuario || !password) {
      return res.status(400).json({ error: 'usuario y password son requeridos' });
    }
    const ures = await pool.query(
      'SELECT * from fn_buscar_usuario_auth($1)',
      [usuario]
    );
    const user = ures.rows[0];
    if (!user || !user.estado) return res.status(401).json({ error: 'Credenciales inválidas' });

    let ok = false;
    if (user.contrasenia && user.contrasenia.startsWith('$2')) {
      ok = await bcrypt.compare(password, user.contrasenia);
    } else {
      ok = user.contrasenia === password;
    }
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Error en /auth/confirm-password:', err);
    return res.status(500).json({ error: 'Error al confirmar contraseña' });
  }
});

// Login: valida usuario y devuelve token + roles
router.post('/auth/login', async (req, res) => {
  try {
    const { usuario, password } = req.body || {};
    if (!usuario || !password) {
      return res.status(400).json({ error: 'usuario y password son requeridos' });
    }
    const ures = await pool.query(
      'SELECT * from fn_buscar_usuario_auth($1)',
      [usuario]
    );
    const user = ures.rows[0];
    if (!user || !user.estado) return res.status(401).json({ error: 'Credenciales inválidas' });

    // Comparar contraseña (hash bcrypt o texto plano)
    let ok = false;
    if (user.contrasenia && user.contrasenia.startsWith('$2')) {
      ok = await bcrypt.compare(password, user.contrasenia);
    } else {
      ok = user.contrasenia === password;
    }
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    // Roles del usuario
    const rres = await pool.query(
      `Select * from fn_roles_usuario($1)`,
      [user.id_usuario]
    );
    const roles = rres.rows.map(r => r.nombre);

    const token = jwt.sign({ sub: user.id_usuario, roles }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token, user: { id_usuario: user.id_usuario, nombre_usuario: user.nombre_usuario, roles } });
  } catch (err) {
    console.error('Error en /auth/login:', err);
    return res.status(500).json({ error: 'Error en login' });
  }
});

// Perfil del usuario autenticado
router.get('/auth/me', verifyJWT, async (req, res) => {
  try {
    const { sub } = req.user || {};
    if (!sub) return res.status(401).json({ error: 'No autorizado' });
    const ures = await pool.query(
      'SELECT * FROM fn_usuario_autenticado($1)',
      [sub]
    );
    const user = ures.rows[0];
    if (!user || !user.estado) return res.status(401).json({ error: 'No autorizado' });
    const rres = await pool.query(
      `Select * from fn_roles_usuario($1)`,
      [user.id_usuario]
    );
    const roles = rres.rows.map(r => r.nombre);
    return res.json({ id_usuario: user.id_usuario, nombre_usuario: user.nombre_usuario, roles });
  } catch (err) {
    console.error('Error en /auth/me:', err);
    return res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

module.exports = router;

