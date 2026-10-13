// Control de acceso a la API: TODO exige sesión salvo esta lista (se deniega por defecto, así una ruta nueva
// nace protegida). Para agregar una ruta pública hay que justificarla aquí.
const { payloadFromRequest } = require('../shared/auth');

const RUTAS_PUBLICAS = [
  ['GET', /^\/health$/],

  // Inicio de sesión y recuperación de contraseña (antes de tener sesión)
  ['POST', /^\/auth\/login$/],
  ['POST', /^\/auth\/forgot-password$/],
  ['GET', /^\/auth\/reset-password\/info$/],
  ['POST', /^\/auth\/reset-password$/],

  // Pantalla de TV de la sala de espera: funciona sin sesión todo el día y muestra lo mismo que ya es
  // visible en la sala (clínicas, turno llamado y foto). Los eventos solo llevan clínica, acción y turno.
  ['GET', /^\/GclinicasT$/],
  ['GET', /^\/Gturno-actual\/[^/]+$/],
  ['GET', /^\/turnos\/llamado-(sse|events)$/],
  ['GET', /^\/foto\/[^/]+$/],

  // TEMPORAL: las fotos se cargan con <img>, que no puede enviar el token. Pendiente servirlas con sesión.
  ['GET', /^\/fotos\/[^/]+$/],
];

// Los routers responden con y sin el prefijo /api (y el frontend a veces lo duplica: /api/api/...)
function sinPrefijoApi(ruta) {
  let r = ruta;
  while (r === '/api' || r.startsWith('/api/')) r = r.slice(4) || '/';
  return r;
}

function esPublica(metodo, ruta) {
  const m = metodo === 'HEAD' ? 'GET' : metodo;
  const r = sinPrefijoApi(ruta);
  return RUTAS_PUBLICAS.some(([permitido, patron]) => permitido === m && patron.test(r));
}

// Middleware: deja pasar las rutas públicas y los preflight de CORS; el resto necesita un JWT válido
function exigirSesion(req, res, next) {
  if (req.method === 'OPTIONS' || esPublica(req.method, req.path)) return next();
  const payload = payloadFromRequest(req);
  if (!payload) return res.status(401).json({ error: 'Sesión requerida' });
  req.user = req.user || payload;
  return next();
}

module.exports = { exigirSesion, esPublica, sinPrefijoApi, RUTAS_PUBLICAS };
