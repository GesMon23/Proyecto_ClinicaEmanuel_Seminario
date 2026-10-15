// Control de acceso a la API, en un solo lugar y denegando por defecto:
//   1. Las rutas de esta lista son públicas. Para agregar una hay que justificarla aquí.
//   2. El resto exige un JWT válido de un usuario que siga activo (usuario y empleado).
//   3. Y además el permiso (pestaña) que config/permisos.js asigna a la ruta; sin regla -> 403.
const { payloadFromRequest } = require('../shared/auth');
const { SESION, permisosDeRuta } = require('./permisos');

const RUTAS_PUBLICAS = [
  ['GET', /^\/health$/],

  // Inicio de sesión y recuperación de contraseña (antes de tener sesión)
  ['POST', /^\/auth\/login$/],
  ['POST', /^\/auth\/forgot-password$/],
  ['GET', /^\/auth\/reset-password\/info$/],
  ['POST', /^\/auth\/reset-password$/],

  // Pantalla de TV de la sala de espera: funciona sin sesión todo el día y muestra lo mismo que ya es
  // visible en la sala (clínicas, turno en atención y su foto). Los eventos solo llevan clínica, acción y turno.
  // La foto solo se entrega si ese paciente está en atención en este momento.
  ['GET', /^\/GclinicasT$/],
  ['GET', /^\/Gturno-actual\/[^/]+$/],
  ['GET', /^\/turnos\/llamado-(sse|events)$/],
  ['GET', /^\/turnos-tv\/foto\/[^/]+$/],
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

// { activo, permisos: [códigos] } leído de la base (sp_acceso_usuario)
async function accesoDesdeBd(idUsuario) {
  const { accesoDeUsuario } = require('../modules/auth/auth.repository');
  return accesoDeUsuario(idUsuario);
}

// El acceso de cada usuario se guarda unos segundos para no consultar la base en cada petición. Un cambio de
// roles o de estado se ve como mucho tras VIGENCIA_MS; las pantallas que los cambian llaman a olvidarAccesos().
const VIGENCIA_MS = 30 * 1000;
const caches = new Set();

function olvidarAccesos() {
  caches.forEach((c) => c.clear());
}

// Middleware de acceso. Las pruebas pueden pasar su propio cargarAcceso(idUsuario).
function crearControlDeAcceso({ cargarAcceso = accesoDesdeBd, ahora = Date.now } = {}) {
  const cache = new Map();
  caches.add(cache);

  async function accesoDe(idUsuario) {
    const guardado = cache.get(idUsuario);
    if (guardado && guardado.vence > ahora()) return guardado;
    const leido = (await cargarAcceso(idUsuario)) || {};
    const acceso = { activo: leido.activo === true, permisos: new Set(leido.permisos || []), vence: ahora() + VIGENCIA_MS };
    cache.set(idUsuario, acceso);
    return acceso;
  }

  return async function controlDeAcceso(req, res, next) {
    if (req.method === 'OPTIONS' || esPublica(req.method, req.path)) return next();
    const payload = payloadFromRequest(req);
    const idUsuario = payload ? Number(payload.sub) : NaN;
    if (!Number.isFinite(idUsuario)) return res.status(401).json({ error: 'Sesión requerida' });

    let acceso;
    try {
      acceso = await accesoDe(idUsuario);
    } catch (err) {
      console.error('No fue posible validar el acceso:', err);
      return res.status(503).json({ error: 'No fue posible validar el acceso' });
    }
    // Usuario o empleado dado de baja: la sesión deja de servir aunque el token no haya vencido
    if (!acceso.activo) return res.status(401).json({ error: 'Sesión requerida' });

    const requeridos = permisosDeRuta(req.method, sinPrefijoApi(req.path));
    const permitido = requeridos === SESION || (Array.isArray(requeridos) && requeridos.some((p) => acceso.permisos.has(p)));
    if (!permitido) return res.status(403).json({ error: 'No autorizado' });

    req.user = req.user || payload;
    req.permisos = acceso.permisos;
    return next();
  };
}

module.exports = { crearControlDeAcceso, olvidarAccesos, esPublica, sinPrefijoApi, RUTAS_PUBLICAS, VIGENCIA_MS };
