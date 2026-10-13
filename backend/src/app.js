// Aplicación Express: middlewares y montaje de los módulos. server.js solo la levanta.
// El orden de montaje importa: cuando dos routers comparten una URL gana el primero.
const express = require('express');
const cors = require('cors');
const { opcionesCors } = require('./config/cors');
const { crearControlDeAcceso } = require('./config/acceso');

const auth = require('./modules/auth');
const consultas = require('./modules/consultas');
const estadisticas = require('./modules/estadisticas');
const llamados = require('./modules/llamados');
const pacientes = require('./modules/pacientes');
const qr = require('./modules/qr');
const registros = require('./modules/registros');
const reportes = require('./modules/reportes');
const turnos = require('./modules/turnos');
const usuarios = require('./modules/usuarios');
const { FOTOS_DIR } = require('./modules/pacientes/fotos');
const { pool } = require('./shared/database');

// Para Docker y el monitoreo: 200 si el proceso responde y la BD acepta consultas, 503 si no
async function salud(_req, res) {
  try {
    await pool.query('SELECT 1');
    res.json({ estado: 'ok' });
  } catch {
    res.status(503).json({ estado: 'error', detalle: 'Base de datos no disponible' });
  }
}

// opciones.cargarAcceso: solo para pruebas (simula usuarios y permisos sin la base)
function crearApp(opciones = {}) {
  const app = express();
  app.get(['/health', '/api/health'], salud);
  // Un origen no permitido recibe 403 (sin pasar por el manejador de errores ni ensuciar el log)
  const politicaCors = cors(opcionesCors);
  app.use((req, res, next) => politicaCors(req, res, (err) => (err ? res.status(403).json({ error: 'Origen no permitido' }) : next())));
  // Sesión, usuario activo y permiso de la pestaña (config/acceso.js y config/permisos.js), antes de leer el cuerpo
  app.use(crearControlDeAcceso({ cargarAcceso: opciones.cargarAcceso }));
  app.use(express.json({ limit: '50mb' }));

  // El frontend usa baseURL '/api', pero algunos proxies quitan el prefijo: cada router responde en ambos
  const enRaizYApi = (...routers) => routers.forEach((r) => { app.use(r); app.use('/api', r); });
  const enPrefijos = (prefijos, ...routers) => prefijos.forEach((p) => routers.forEach((r) => app.use(p, r)));

  // QR y llamados van primero: sus URLs (/api/qr, /api/turnos/llamado-*) las taparían rutas con parámetro
  // como /api/:noafiliacion (laboratorios) o /turnos/:noafiliacion (consulta de pacientes)
  app.use(qr.router);
  app.use(llamados.router);

  enRaizYApi(consultas.laboratorios, turnos.router, reportes.pacientes, reportes.fallecidos, estadisticas.router);
  app.use('/fotos', express.static(FOTOS_DIR));
  app.use('/api/fotos', express.static(FOTOS_DIR));

  enRaizYApi(auth.router, pacientes.formularios, usuarios.router);
  enPrefijos(['/api/psicologia', '/psicologia'], registros.psicologia, consultas.psicologia);
  enPrefijos(['/api/nutricion', '/nutricion'], registros.nutricion, consultas.nutricion);
  enRaizYApi(
    registros.referencias, reportes.nuevoIngreso, consultas.referencias, registros.catalogos,
    pacientes.actualizacion, pacientes.egreso, pacientes.reingreso, pacientes.consulta, pacientes.registro
  );
  // Antes se montaba en '/api' a secas: el frontend pide /api/laboratorios/... y guardar laboratorios daba 404
  app.use('/laboratorios', registros.laboratorios);
  app.use('/api/laboratorios', registros.laboratorios);
  enRaizYApi(reportes.faltistas, reportes.egreso);

  return app;
}

module.exports = { crearApp };
