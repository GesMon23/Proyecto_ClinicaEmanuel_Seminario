const jwt = require('jsonwebtoken');

const jwtSecret = () => process.env.JWT_SECRET || 'dev_secret_change_me';

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

// Id numérico del usuario (claim "sub", igual que BackLogin.js); null sin sesión
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

// Middleware: exige sesión y deja el id en req.userId
function requireUser(req, res, next) {
  const id = userIdFromRequest(req);
  if (!id) {
    return res.status(401).json({ success: false, message: 'Sesión requerida', error: 'Sesión requerida' });
  }
  req.userId = id;
  next();
}

module.exports = { payloadFromRequest, userIdFromRequest, userNameFromRequest, actorFromRequest, requireUser };
