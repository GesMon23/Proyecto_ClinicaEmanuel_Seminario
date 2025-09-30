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

// Control de intentos fallidos en memoria (sugerido migrar a BD o Redis)
const MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS || '10', 10);
const LOCK_MINUTES = parseInt(process.env.LOGIN_LOCK_MINUTES || '15', 10);
// Estructura: { count: number, lockUntil: number (ms epoch) }
const failedAttempts = new Map(); // key: usuario (string)

function isLocked(usuario) {
  const rec = failedAttempts.get(String(usuario).toLowerCase());
  if (!rec) return { locked: false };
  const now = Date.now();
  if (rec.lockUntil && rec.lockUntil > now) {
    const ms = rec.lockUntil - now;
    return { locked: true, msRemaining: ms };
  }
  return { locked: false };
}

function incAttempt(usuario) {
  const key = String(usuario).toLowerCase();
  const now = Date.now();
  const rec = failedAttempts.get(key) || { count: 0, lockUntil: 0 };
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockUntil = now + LOCK_MINUTES * 60 * 1000;
    rec.count = 0; // opcional: reset count al aplicar lock
  }
  failedAttempts.set(key, rec);
  return rec;
}

function clearAttempts(usuario) {
  const key = String(usuario).toLowerCase();
  if (failedAttempts.has(key)) failedAttempts.delete(key);
}

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

// Confirmación de contraseña del usuario autenticado
router.post('/auth/confirm-password', verifyJWT, async (req, res) => {
  try {
    const { sub } = req.user || {};
    if (!sub) return res.status(401).json({ error: 'No autorizado' });
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'password es requerido' });

    // Usar el SP con transacción y cursor
    const client = await pool.connect();
    let rows = [];
    try {
      await client.query('BEGIN');
      const cursorName = `cur_confirmar_${sub}`;
      await client.query('CALL public.sp_confirmar_pasword_usuario($1, $2)', [sub, cursorName]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      rows = fetchRes.rows;
      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
    const user = rows[0];
    if (!user || user.estado === false) return res.status(401).json({ error: 'No autorizado' });

    let ok = false;
    if (user.contrasenia && user.contrasenia.startsWith('$2')) {
      ok = await bcrypt.compare(password, user.contrasenia);
    } else {
      ok = user.contrasenia === password;
    }
    if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error en /auth/confirm-password:', err);
    return res.status(500).json({ error: 'No fue posible confirmar la contraseña' });
  }
});

// Endpoint para consultar usuarios activos
router.get('/api/usuarios-activos', async (req, res) => {
  try {
    // Usar SP con transacción y cursor
    const client = await pool.connect();
    let rows = [];
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_usuarios_activos';
      await client.query('CALL public.sp_usuarios_activos($1)', [cursorName]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      rows = fetchRes.rows;
      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
    res.json(rows);
  } catch (error) {
    console.error('Error al consultar usuarios activos:', error);
    res.status(500).json({ error: 'Error al consultar usuarios activos' });
  }
});

// (Eliminado endpoint no autenticado de confirmación de contraseña)

// Login: valida usuario y devuelve token + roles
router.post('/auth/login', async (req, res) => {
  try {
    const { usuario, password } = req.body || {};
    if (!usuario || !password) {
      return res.status(400).json({ error: 'usuario y password son requeridos' });
    }
    // Verificar si la cuenta está temporalmente bloqueada
    const lock = isLocked(usuario);
    if (lock.locked) {
      // Tiempo restante en minutos y segundos
      const seconds = Math.ceil(lock.msRemaining / 1000);
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      return res.status(429).json({ error: `Usuario bloqueado. Intenta nuevamente en ${min}m ${sec}s` });
    }
    // Usar SPs con transacción y cursores
    const client = await pool.connect();
    let user;
    let roles = [];
    try {
      await client.query('BEGIN');

      // 1) Buscar usuario por nombre
      const curUser = 'cur_buscar_usuario_auth';
      await client.query('CALL public.sp_buscar_usuario_auth($1, $2)', [usuario, curUser]);
      const userRes = await client.query(`FETCH ALL FROM "${curUser}"`);
      user = userRes.rows[0];
      if (!user || !user.estado) {
        await client.query('ROLLBACK');
        client.release();
        incAttempt(usuario);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // 2) Comparar contraseña (hash bcrypt o texto plano)
      let ok = false;
      if (user.contrasenia && user.contrasenia.startsWith('$2')) {
        ok = await bcrypt.compare(password, user.contrasenia);
      } else {
        ok = user.contrasenia === password;
      }
      if (!ok) {
        await client.query('ROLLBACK');
        client.release();
        const rec = incAttempt(usuario);
        if (rec.lockUntil && rec.lockUntil > Date.now()) {
          const seconds = Math.ceil((rec.lockUntil - Date.now()) / 1000);
          const min = Math.floor(seconds / 60);
          const sec = seconds % 60;
          return res.status(429).json({ error: `Usuario bloqueado. Intenta nuevamente en ${min}m ${sec}s` });
        }
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // 3) Roles del usuario
      const curRoles = 'cur_roles_usuario';
      await client.query('CALL public.sp_roles_usuario($1, $2)', [user.id_usuario, curRoles]);
      const rres = await client.query(`FETCH ALL FROM "${curRoles}"`);
      roles = rres.rows.map(r => r.nombre);

      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      // Si no se ha liberado antes por retornos tempranos
      try { client.release(); } catch (_) {}
    }

    // Éxito: limpiar intentos fallidos
    clearAttempts(usuario);

    const token = jwt.sign({ sub: user.id_usuario, nombre_usuario: user.nombre_usuario, roles }, JWT_SECRET, { expiresIn: '8h' });
    // Considerar genérica si la contraseña del usuario coincide con 'Clinica1.' (hash o texto)
    let mustChangePassword = false;
    try {
      if (user.contrasenia && user.contrasenia.startsWith('$2')) {
        mustChangePassword = await bcrypt.compare('Clinica1.', user.contrasenia);
      } else {
        mustChangePassword = user.contrasenia === 'Clinica1.';
      }
    } catch (_) { /* noop */ }
    return res.json({ token, user: { id_usuario: user.id_usuario, nombre_usuario: user.nombre_usuario, roles }, mustChangePassword });
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
    // Usar SPs con transacción y cursores
    const client = await pool.connect();
    let user;
    let roles = [];
    try {
      await client.query('BEGIN');

      // 1) Usuario autenticado por id
      const curMe = 'cur_usuario_autenticado';
      await client.query('CALL public.sp_usuario_autenticado($1, $2)', [sub, curMe]);
      const meRes = await client.query(`FETCH ALL FROM "${curMe}"`);
      user = meRes.rows[0];
      if (!user || !user.estado) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(401).json({ error: 'No autorizado' });
      }

      // 2) Roles del usuario
      const curRoles = 'cur_roles_usuario_me';
      await client.query('CALL public.sp_roles_usuario($1, $2)', [user.id_usuario, curRoles]);
      const rres = await client.query(`FETCH ALL FROM "${curRoles}"`);
      roles = rres.rows.map(r => r.nombre);

      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      try { client.release(); } catch (_) {}
    }

    return res.json({ id_usuario: user.id_usuario, nombre_usuario: user.nombre_usuario, roles });
  } catch (err) {
    console.error('Error en /auth/me:', err);
    return res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// Solicitud de recuperación de contraseña (captura de datos)
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { dpi, nombres, apellidos, telefono, usuario } = req.body || {};
    if (!dpi || String(dpi).length < 6) return res.status(400).json({ error: 'DPI inválido' });
    if (!nombres || !apellidos) return res.status(400).json({ error: 'Nombres y apellidos son requeridos' });
    if (!telefono) return res.status(400).json({ error: 'Teléfono es requerido' });
    if (!usuario) return res.status(400).json({ error: 'Usuario es requerido' });

    // TODO: Integrar verificación contra BD y canal de validación (ej. notificación a un admin)
    // Por ahora, respondemos éxito para habilitar el flujo del frontend.
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error en /auth/forgot-password:', err);
    return res.status(500).json({ error: 'No fue posible procesar la solicitud' });
  }
});

// Cambio de contraseña del usuario autenticado
router.post('/auth/change-password', verifyJWT, async (req, res) => {
  try {
    const { sub } = req.user || {};
    if (!sub) return res.status(401).json({ error: 'No autorizado' });
    const { actual, nueva } = req.body || {};
    if (!actual || !nueva) return res.status(400).json({ error: 'actual y nueva son requeridas' });
    if (String(nueva).length < 8) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });

    // Usar el SP con transacción y cursor para obtener la contraseña actual
    const client = await pool.connect();
    let rows = [];
    try {
      await client.query('BEGIN');
      const cursorName = `cur_confirmar_${sub}`;
      await client.query('CALL public.sp_confirmar_pasword_usuario($1, $2)', [sub, cursorName]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      rows = fetchRes.rows;
      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
    const user = rows[0];
    if (!user || user.estado === false) return res.status(401).json({ error: 'No autorizado' });

    // Verificar contraseña actual
    let ok = false;
    if (user.contrasenia && user.contrasenia.startsWith('$2')) {
      ok = await bcrypt.compare(actual, user.contrasenia);
    } else {
      ok = user.contrasenia === actual;
    }
    if (!ok) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(String(nueva), 10);
    await pool.query('CALL public.sp_actualizar_password_usuario($1, $2)', [sub, hash]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error en /auth/change-password:', err);
    return res.status(500).json({ error: 'No fue posible cambiar la contraseña' });
  }
});


module.exports = router;