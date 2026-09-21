// Política CORS: orígenes de producción y desarrollo, y cualquier subdominio de clinicaemanuel.com.gt.
const ORIGENES_PERMITIDOS = new Set([
  // producción (HTTP y HTTPS)
  'http://172.235.145.142',
  'https://172.235.145.142',
  'http://clinicaemanuel.com.gt',
  'https://clinicaemanuel.com.gt',
  'http://www.clinicaemanuel.com.gt',
  'https://www.clinicaemanuel.com.gt',

  'http://172.235.145.142:3000',
  'http://clinicaemanuel.com.gt:3000',
  'http://www.clinicaemanuel.com.gt:3000',

  // desarrollo local
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const DOMINIO = 'clinicaemanuel.com.gt';

// Sin origen (curl, Postman, mismo servidor) se acepta
function origenPermitido(origin) {
  if (!origin) return true;
  if (ORIGENES_PERMITIDOS.has(origin)) return true;
  try {
    const host = new URL(origin).hostname || '';
    return host === DOMINIO || host.endsWith(`.${DOMINIO}`);
  } catch {
    return false;
  }
}

const opcionesCors = {
  origin: (origin, callback) => (origenPermitido(origin) ? callback(null, true) : callback(new Error('Not allowed by CORS'))),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true,
};

module.exports = { origenPermitido, opcionesCors };
