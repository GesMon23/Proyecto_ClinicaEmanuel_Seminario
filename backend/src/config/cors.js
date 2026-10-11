// Política CORS. Detrás de nginx el frontend y la API comparten dominio, así que se acepta siempre el mismo
// origen (Origin = Host de la petición) y no hace falta configurar nada por entorno.
// CORS_ORIGENES (separados por coma) agrega orígenes externos: "https://app.ejemplo.com" o "*.ejemplo.com"
// (cualquier subdominio). Fuera de producción también se aceptan los del servidor de Vite (localhost:3000).
const DESARROLLO = ['http://localhost:3000', 'http://127.0.0.1:3000'];

function origenesConfigurados(env = process.env) {
  const propios = (env.CORS_ORIGENES || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return env.NODE_ENV === 'production' ? propios : [...propios, ...DESARROLLO];
}

function coincide(url, entrada) {
  if (!entrada.startsWith('*.')) return url.origin === entrada;
  const dominio = entrada.slice(2);
  return url.hostname.endsWith(`.${dominio}`);
}

// `host` es el encabezado Host de la petición (con puerto si lo trae); sin Origin (curl, mismo servidor) se acepta
function origenPermitido(origin, host, origenes = origenesConfigurados()) {
  if (!origin) return true;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (host && url.host === String(host).toLowerCase()) return true;
  return origenes.some((e) => coincide(url, e));
}

const BASE = {
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true,
};

// Opciones por petición (el paquete cors acepta una función (req, cb))
function opcionesCors(req, callback) {
  const origin = req.headers.origin;
  if (!origenPermitido(origin, req.headers.host)) return callback(new Error('Not allowed by CORS'));
  callback(null, { ...BASE, origin: Boolean(origin) });
}

module.exports = { origenPermitido, origenesConfigurados, opcionesCors };
