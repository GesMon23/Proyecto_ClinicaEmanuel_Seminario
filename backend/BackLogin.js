// Router de Login/Roles
const express = require('express');
const pool = require('./db/pool');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.warn('[WARN] nodemailer no está instalado. El envío de correos estará deshabilitado.');
  nodemailer = null;
}

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

// ===================== TOKENS DE ACCIÓN USADOS (MEMORIA) =====================
// Almacena tokens ya utilizados para impedir su reutilización hasta que expiren
const usedAdminActionTokens = new Map(); // token -> expMs

function isAdminActionTokenUsed(token) {
  const t = String(token);
  const expMs = usedAdminActionTokens.get(t);
  if (!expMs) return false;
  if (Date.now() >= expMs) {
    usedAdminActionTokens.delete(t);
    return false;
  }
  return true;
}

function markAdminActionTokenUsed(token, expSeconds) {
  const t = String(token);
  const expMs = (Number(expSeconds) || 0) * 1000;
  const when = expMs > 0 ? expMs : Date.now() + 15 * 60 * 1000; // fallback 15m
  usedAdminActionTokens.set(t, when);
}

// Limpieza periódica (opcional)
setInterval(() => {
  const now = Date.now();
  for (const [t, exp] of usedAdminActionTokens.entries()) {
    if (now >= exp) usedAdminActionTokens.delete(t);
  }
}, 5 * 60 * 1000).unref?.();

// Generador de contraseña fuerte
function generateStrongPassword(length = 12) {
  const lowers = 'abcdefghijklmnopqrstuvwxyz';
  const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()_+[]{}|;:,.<>?';
  const all = lowers + uppers + digits + symbols;
  function pick(str) { return str[Math.floor(Math.random() * str.length)]; }
  // Garantizar al menos uno de cada tipo
  const req = [pick(lowers), pick(uppers), pick(digits), pick(symbols)];
  const remaining = Array.from({ length: Math.max(4, length) - req.length }, () => pick(all));
  const passArr = [...req, ...remaining];
  // Mezclar
  for (let i = passArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passArr[i], passArr[j]] = [passArr[j], passArr[i]];
  }
  return passArr.join('');
}

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
// Reset de contraseña con token (flujo de recuperación)
router.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, nueva } = req.body || {};
    if (!token || !nueva) return res.status(400).json({ error: 'token y nueva son requeridos' });
    if (String(nueva).length < 8) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (_) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    if (!payload || payload.purpose !== 'reset' || !payload.sub) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Actualizar contraseña del usuario indicado por el token
    const hash = await bcrypt.hash(String(nueva), 10);
    await pool.query('CALL public.sp_actualizar_password_usuario($1, $2)', [payload.sub, hash]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error en /auth/reset-password:', err);
    return res.status(500).json({ error: 'No fue posible restablecer la contraseña' });
  }
});

// Reset de contraseña por Administrador
router.post('/auth/admin/reset-user-password', verifyJWT, async (req, res) => {
  try {
    const auth = req.user || {};
    const roles = Array.isArray(auth.roles) ? auth.roles : [];
    // Requiere rol de gestión de usuarios
    if (!roles.includes('RolGestionUsuarios')) {
      return res.status(403).json({ error: 'Requiere rol de administrador (RolGestionUsuarios)' });
    }

    const { id_usuario, nueva } = req.body || {};
    const id = Number(id_usuario);
    if (!id || Number.isNaN(id)) return res.status(400).json({ error: 'id_usuario inválido' });
    if (!nueva) return res.status(400).json({ error: 'La nueva contraseña es requerida' });

    // Complejidad: 8+ con minúscula, mayúscula, dígito y caracter especial
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strong.test(String(nueva))) {
      return res.status(400).json({
        error: 'La contraseña debe tener mínimo 8 caracteres, incluir minúscula, mayúscula, número y símbolo',
      });
    }

    const hash = await bcrypt.hash(String(nueva), 10);
    await pool.query('CALL public.sp_actualizar_password_usuario($1, $2)', [id, hash]);
    // Marcar para forzar cambio en el próximo login
    try {
      await pool.query('CALL public.sp_usuario_flag_force_change_set($1, $2)', [id, true]);
    } catch (_) { }

    // TODO: registrar auditoría (admin auth.sub cambia password de id)
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error en /auth/admin/reset-user-password:', err);
    return res.status(500).json({ error: 'No fue posible restablecer la contraseña' });
  }
});
// Reset de contraseña por token de acción (enlace de correo para admin)
router.post('/auth/admin/reset-user-password/token', async (req, res) => {
  try {
    const { token, nueva } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token es requerido' });

    let payload;
    try {
      payload = jwt.verify(String(token), JWT_SECRET);
    } catch (_) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    // Rechazar si ya fue usado
    if (isAdminActionTokenUsed(token)) {
      return res.status(401).json({ error: 'Token ya utilizado' });
    }
    if (!payload || payload.purpose !== 'admin_reset_user' || !payload.target) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Tomar la contraseña nueva o generar una aleatoria fuerte
    const plain = nueva && String(nueva).trim().length > 0 ? String(nueva) : generateStrongPassword(12);
    // Validar complejidad si viene del body
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (nueva && !strong.test(plain)) {
      return res.status(400).json({
        error: 'La contraseña debe tener mínimo 8 caracteres, incluir minúscula, mayúscula, número y símbolo',
      });
    }

    const hash = await bcrypt.hash(plain, 10);
    await pool.query('CALL public.sp_actualizar_password_usuario($1, $2)', [payload.target, hash]);
    // Marcar para forzar cambio en el próximo login
    try {
      await pool.query('CALL public.sp_usuario_flag_force_change_set($1, $2)', [payload.target, true]);
    } catch (_) { }
    
    // Intentar enviar correo al usuario afectado con la nueva contraseña
    try {
      const t = getTransporter();
      if (t) {
        // Buscar correo del usuario objetivo
        let correoUsuario = null;
        try {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            const cur = 'cur_usuario_target_for_email';
            await client.query('CALL public.sp_usuario_autenticado($1, $2)', [payload.target, cur]);
            const cRes = await client.query(`FETCH ALL FROM "${cur}"`);
            const u = cRes.rows?.[0];
            correoUsuario = u?.correo || u?.email || null;
            // Si no vino correo desde el SP, consultar join usuarios->empleados
            if (!correoUsuario) {
              const curEmail = 'cur_usuario_email_by_id';
              await client.query('CALL public.sp_usuario_email_by_id($1, $2)', [payload.target, curEmail]);
              const jr = await client.query(`FETCH ALL FROM "${curEmail}"`);
              correoUsuario = jr.rows?.[0]?.email || null;
            }
            await client.query('COMMIT');
          } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
          } finally {
            try { client.release(); } catch (_) {}
          }
        } catch (_) {}

        const to = correoUsuario || process.env.ADMIN_EMAIL;
        if (to) {
          const baseApp = process.env.APP_BASE_URL || 'http://localhost:3000';
          const loginLink = `${baseApp}`;
          await t.sendMail({
            from: `Soporte Clínica <${process.env.SMTP_USER}>`,
            to,
            subject: 'Credenciales actualizadas',
            html: `
              <!doctype html>
              <html>
                <body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#2d3748;">
                  <div style="max-width:640px;margin:24px auto;padding:0 16px;">
                    <div style="background:#16a34a;color:#fff;padding:16px 20px;border-top-left-radius:8px;border-top-right-radius:8px;">
                      <h1 style="margin:0;font-size:18px;">Tu contraseña ha sido restablecida</h1>
                    </div>
                    <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-bottom-left-radius:8px;border-bottom-right-radius:8px;padding:20px;">
                      <p style="margin:0 0 12px;">Se ha restablecido tu contraseña en el sistema.</p>
                      <p style="margin:0 0 8px;font-weight:bold;">Nueva contraseña temporal:</p>
                      <div style="background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:6px;padding:10px 12px;margin:0 0 16px;">
                        <code style="font-family:Consolas,Monaco,monospace;font-size:14px;">${plain}</code>
                      </div>
                      <a href="${loginLink}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">Ir al inicio de sesión</a>
                      <p style="margin:16px 0 0;color:#64748b;">Por seguridad, cambia tu contraseña al iniciar sesión.</p>
                    </div>
                    <div style="text-align:center;color:#94a3b8;font-size:12px;margin-top:10px;">
                      Clínica Renal Emanuel — Soporte
                    </div>
                  </div>
                </body>
              </html>
            `.trim()
          });
        }
      }
    } catch (e) {
      console.error('No fue posible enviar el correo de nueva contraseña:', e);
    }
    // Marcar como usado hasta su expiración real
    try {
      if (payload && payload.exp) markAdminActionTokenUsed(token, payload.exp);
    } catch (_) {}
    // TODO: invalidar token (almacenamiento de uso único). Requiere soporte en BD o caché.
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error en /auth/admin/reset-user-password/token:', err);
    return res.status(500).json({ error: 'No fue posible restablecer la contraseña' });
  }
});
// ========================================================

// Información de token de acción (sin consumirlo): id y nombre del usuario
router.get('/auth/admin/reset-user-token-info', async (req, res) => {
  try {
    const token = req.query.token || '';
    if (!token) return res.status(400).json({ error: 'token es requerido' });

    let payload;
    try {
      payload = jwt.verify(String(token), JWT_SECRET);
    } catch (_) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    if (isAdminActionTokenUsed(token)) {
      return res.status(401).json({ error: 'Token ya utilizado' });
    }
    if (!payload || payload.purpose !== 'admin_reset_user' || !payload.target) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Consultar datos básicos del usuario
    let user = null;
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const cur = 'cur_usuario_target_for_info';
        await client.query('CALL public.sp_usuario_autenticado($1, $2)', [payload.target, cur]);
        const r = await client.query(`FETCH ALL FROM "${cur}"`);
        user = r.rows?.[0] || null;
        await client.query('COMMIT');
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch (_) {}
      } finally {
        try { await client.release(); } catch (_) {}
      }
    } catch (_) {}

    const nombre = user?.nombre_usuario || null;
    return res.json({ id_usuario: payload.target, nombre_usuario: nombre });
  } catch (err) {
    console.error('Error en /auth/admin/reset-user-token-info:', err);
    return res.status(500).json({ error: 'No fue posible obtener la información del token' });
  }
});

// ===================== EMAIL (Nodemailer) =====================
let transporter;
function getTransporter() {
  if (transporter) return transporter;
  if (!nodemailer) return null;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn('[WARN] SMTP no configurado: defina SMTP_HOST, SMTP_USER y SMTP_PASS');
    return null;
  }
  transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  return transporter;
}
// ==============================================================

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

      // 3) Validar que el empleado asociado al usuario esté ACTIVO
      try {
        const curEmp = 'cur_empleado_estado_login';
        await client.query('CALL public.sp_usuario_empleado_estado_get($1, $2)', [user.id_usuario, curEmp]);
        const eRes = await client.query(`FETCH ALL FROM "${curEmp}"`);
        const empleadoActivo = eRes.rows?.[0]?.empleado_activo === true;
        if (!empleadoActivo) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(401).json({ error: 'Credenciales inválidas' });
        }
      } catch (e) {
        await client.query('ROLLBACK');
        client.release();
        throw e;
      }

      // 4) Roles del usuario
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
    // Forzar cambio en primer login si está marcado en BD (SP + cursor)
    let mustChangePassword = false;
    try {
      const client2 = await pool.connect();
      try {
        await client2.query('BEGIN');
        const curFlag = 'cur_flag_force_change_login';
        await client2.query('CALL public.sp_usuario_flag_force_change_get($1, $2)', [user.id_usuario, curFlag]);
        const fRes = await client2.query(`FETCH ALL FROM "${curFlag}"`);
        const flag = fRes.rows?.[0]?.usuario_actualizacion || null;
        mustChangePassword = flag === 'FORCE_CHANGE_PASSWORD';
        await client2.query('COMMIT');
      } catch (e) {
        try { await client2.query('ROLLBACK'); } catch (_) {}
      } finally {
        try { client2.release(); } catch (_) {}
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

      // 2) Validar estado del empleado asociado
      try {
        const curEmp = 'cur_empleado_estado_me';
        await client.query('CALL public.sp_usuario_empleado_estado_get($1, $2)', [user.id_usuario, curEmp]);
        const eRes = await client.query(`FETCH ALL FROM "${curEmp}"`);
        const empleadoActivo = eRes.rows?.[0]?.empleado_activo === true;
        if (!empleadoActivo) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(403).json({ error: 'Credenciales inválidas' });
        }
      } catch (e) {
        await client.query('ROLLBACK');
        client.release();
        throw e;
      }

      // 3) Roles del usuario
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

    // Buscar usuario para obtener email (respuesta siempre debe ser genérica)
    let user = null;
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const curUser = 'cur_buscar_usuario_auth_forgot';
        await client.query('CALL public.sp_buscar_usuario_auth($1, $2)', [usuario, curUser]);
        const userRes = await client.query(`FETCH ALL FROM "${curUser}"`);
        user = userRes.rows[0] || null;
        await client.query('COMMIT');
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch (_) {}
      } finally {
        try { await client.release(); } catch (_) {}
      }
    } catch (_) { /* noop */ }

    // Preparar envío de correo (si hay configuración SMTP) al ADMINISTRADOR
    try {
      const t = getTransporter();
      if (t) {
        const to = process.env.ADMIN_EMAIL;
        if (to) {
          // Generar token de acción para admin (15 minutos) si existe el usuario
          let adminActionToken = null;
          try {
            if (user && user.id_usuario) {
              adminActionToken = jwt.sign({ purpose: 'admin_reset_user', target: user.id_usuario }, JWT_SECRET, { expiresIn: '15m' });
            }
          } catch (_) { /* noop */ }

          const base = process.env.APP_BASE_URL || 'http://localhost:3000';
          const adminLink = adminActionToken
            ? `${base}/admin/reset-user?token=${adminActionToken}`
            : `${base}/admin/reset-user`;
          await t.sendMail({
            from: `Solicitud cambio de correo usuario '${usuario}' <${process.env.SMTP_USER}>`,
            to,
            subject: 'Solicitud de recuperación de contraseña (acción requerida)',
            html: `
              <!doctype html>
              <html>
                <body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#2d3748;">
                  <div style="max-width:640px;margin:24px auto;padding:0 16px;">
                    <div style="background:#16a34a;color:#fff;padding:16px 20px;border-top-left-radius:8px;border-top-right-radius:8px;">
                      <h1 style="margin:0;font-size:18px;">Solicitud de recuperación de contraseña</h1>
                    </div>
                    <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-bottom-left-radius:8px;border-bottom-right-radius:8px;padding:20px;">
                      <p style="margin:0 0 12px;">Se recibió una solicitud de recuperación de contraseña desde el login.</p>
                      <p style="margin:0 0 8px;font-weight:bold;">Datos suministrados por el usuario:</p>
                      <ul style="margin:0 0 16px;padding-left:18px;line-height:1.6;">
                        <li><strong>DPI:</strong> ${dpi}</li>
                        <li><strong>Nombres:</strong> ${nombres}</li>
                        <li><strong>Apellidos:</strong> ${apellidos}</li>
                        <li><strong>Teléfono:</strong> ${telefono}</li>
                        <li><strong>Usuario:</strong> ${usuario}</li>
                      </ul>
                      ${user && user.id_usuario ? `<p style="margin:0 0 16px;"><strong>ID Usuario en sistema:</strong> ${user.id_usuario}</p>` : ''}
                      <a href="${adminLink}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">Abrir acción rápida (expira en 15 min)</a>
                      <p style="margin:16px 0 0;color:#64748b;">Favor validar la identidad y proceder al cambio de contraseña en el sistema si corresponde.</p>
                    </div>
                    <div style="text-align:center;color:#94a3b8;font-size:12px;margin-top:10px;">
                      Clínica Renal Emanuel — Sistema de Gestión
                    </div>
                  </div>
                </body>
              </html>
            `.trim(),
          });
        }
      }
    } catch (e) {
      console.error('Error enviando correo forgot-password:', e);
      // Continuamos con respuesta genérica
    }

    // Respuesta genérica siempre 200
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
    // Limpiar bandera de forzar cambio
    try {
      await pool.query(
        `UPDATE public.tbl_usuarios
         SET usuario_actualizacion = NULL, fecha_actualizacion = NOW()
         WHERE id_usuario = $1`,
        [sub]
      );
    } catch (_) { }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error en /auth/change-password:', err);
    return res.status(500).json({ error: 'No fue posible cambiar la contraseña' });
  }
});


module.exports = router;