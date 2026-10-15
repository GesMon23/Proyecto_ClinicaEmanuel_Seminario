const jwt = require('jsonwebtoken');

// Sin valor por defecto: un secreto conocido permitiría falsificar tokens
function jwtSecret() {
  if (!process.env.JWT_SECRET) throw new Error('Falta la variable de entorno JWT_SECRET');
  return process.env.JWT_SECRET;
}

// Payload del JWT del encabezado Authorization: Bearer <token>; null si no hay token o es inválido
function payloadFromRequest(req) {
  const auth = (req.headers && req.headers.authorization) || '';
  if (!auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), jwtSecret());
  } catch {
    return null;
  }
}

// Id numérico del usuario (claim "sub" del login); null sin sesión
function userIdFromRequest(req) {
  const payload = payloadFromRequest(req);
  if (!payload) return null;
  const id = Number(payload.sub);
  return Number.isFinite(id) ? id : null;
}

// Nombre de usuario para columnas de auditoría de texto; null sin sesión
function userNameFromRequest(req) {
  const payload = payloadFromRequest(req);
  if (!payload) return null;
  return payload.nombre_usuario || (payload.sub != null ? String(payload.sub) : null);
}

// Actor que se registra en auditoría; usa `fallback` cuando no hay sesión (p. ej. 'web')
function actorFromRequest(req, fallback = 'web') {
  const payload = payloadFromRequest(req);
  if (!payload) return fallback;
  return payload.nombre_usuario || String(payload.sub || fallback);
}

// Datos de la sesión que necesitan los servicios, como objeto simple: las rutas lo arman con la petición y los
// servicios no dependen de Express. actor: nombre para las columnas de auditoría ('web' sin sesión).
function sesionDe(req, fallback = 'web') {
  const payload = payloadFromRequest(req);
  const id = payload ? Number(payload.sub) : NaN;
  return {
    idUsuario: Number.isFinite(id) ? id : null,
    nombreUsuario: payload?.nombre_usuario || null,
    actor: actorFromRequest(req, fallback),
  };
}

// Middleware: exige sesión y deja el id en req.userId
function requireUser(req, res, next) {
  const id = userIdFromRequest(req);
  if (!id) {
    return res.status(401).json({ success: false, message: 'Sesión requerida', error: 'Sesión requerida' });
  }
  req.userId = id;
  next();
}

// Middleware: exige un JWT válido y deja el payload en req.user (401 { error } igual que el login)
function verifyJWT(req, res, next) {
  const auth = (req.headers && req.headers.authorization) || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(auth.slice(7), jwtSecret());
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Los permisos por pestaña se validan en un solo lugar: config/acceso.js con las reglas de config/permisos.js
module.exports = { jwtSecret, payloadFromRequest, userIdFromRequest, userNameFromRequest, actorFromRequest, sesionDe, requireUser, verifyJWT };
