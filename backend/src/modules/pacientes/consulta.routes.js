// Rutas de Consulta de Pacientes (lectura). El orden de las rutas se conserva del controlador original.
const express = require('express');
const fs = require('fs');
const repo = require('./consulta.repository');
const service = require('./consulta.service');
const { wrap } = require('../../shared/http');

const router = express.Router();
router.use(express.json());

// Error genérico { error: mensaje } con el detalle en la consola
const conError = (mensaje) => (err) => {
  console.error(mensaje, err);
  return [500, { error: mensaje }];
};

// GET <ruta> -> res.json(await consultar(req.params))
function lectura(ruta, consultar, mensajeError) {
  router.get(ruta, wrap(async (req, res) => res.json(await consultar(req.params)), conError(mensajeError)));
}

// ---- Catálogos ----
lectura('/departamentos', () => repo.departamentos(), 'Error al obtener departamentos.');

// ---- Historiales por paciente ----
lectura('/laboratorios/:noafiliacion', (p) => service.laboratoriosPorAfiliacion(p.noafiliacion), 'Error al obtener laboratorios por afiliación');
lectura('/laboratorios/dpi/:dpi', (p) => service.laboratoriosPorDpi(p.dpi), 'Error al obtener laboratorios por DPI');
lectura('/turnos/:noafiliacion', (p) => repo.turnos(p.noafiliacion), 'Error al obtener turnos del paciente');

router.post('/historial/formularios', wrap(
  async (req, res) => res.status(201).json(await service.crearHistorialFormulario(req.body || {})),
  conError('Error al crear historial de formulario')
));

router.post('/historial/egresos', wrap(
  async (req, res) => res.status(201).json(await service.crearEgreso(req.body || {})),
  conError('Error al crear egreso')
));

router.get('/estados-paciente', wrap(
  async (req, res) => res.json(await repo.estadosPaciente()),
  conError('Error al obtener los estados de paciente.')
));

lectura('/accesos-vasculares', () => repo.accesosVasculares(), 'Error al obtener accesos vasculares.');

// ---- Paciente ----
router.get('/pacientes/:noafiliacion', wrap(
  async (req, res) => res.json(await service.pacientePorAfiliacion(req.params.noafiliacion)),
  conError('Error al obtener paciente.')
));

router.get('/pacientes/dpi/:dpi', wrap(
  async (req, res) => res.json(await service.pacientePorDpi(req.params.dpi)),
  conError('Error al buscar paciente por DPI.')
));

lectura('/historial/:noafiliacion', (p) => repo.historial(p.noafiliacion), 'Error al obtener historial.');
lectura('/referencias/:noafiliacion', (p) => repo.referencias(p.noafiliacion), 'Error al obtener referencias');
lectura('/nutricion/:noafiliacion', (p) => repo.nutricion(p.noafiliacion), 'Error al obtener informes de nutrición');
lectura('/psicologia/:noafiliacion', (p) => repo.psicologia(p.noafiliacion), 'Error al obtener informes de psicología');
lectura('/formularios/:noafiliacion', (p) => repo.formularios(p.noafiliacion), 'Error al obtener formularios');
lectura('/faltistas/:noafiliacion', (p) => repo.faltistas(p.noafiliacion), 'Error al obtener faltistas del paciente');
lectura('/faltistas/dpi/:dpi', (p) => service.faltistasPorDpi(p.dpi), 'Error al obtener faltistas por DPI');

// ---- Fotos ----
router.get('/check-photo/:id', wrap(
  async (req, res) => res.json(await service.verificarFoto(req.params.id, 'debug' in req.query)),
  (err) => { console.error('Error en /check-photo:', err); return [500, { exists: false, error: 'internal_error' }]; }
));

router.get('/foto/:id', wrap(
  async (req, res) => res.sendFile(await service.rutaFotoParaServir(req.params.id)),
  (err) => { console.error('Error en GET /foto/:id', err); return [500, { error: 'Error interno al servir la foto' }]; }
));

// ---- Carné ----
router.get('/carnet/forzar/:noafiliacion', wrap(
  async (req, res) => {
    const noAfiliacion = req.params.noafiliacion;
    // URL del frontend para el QR: variable de entorno o cabeceras del proxy
    const protocolo = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const baseFrontend = process.env.FRONTEND_URL || `${protocolo}://${host}`;

    const rutaCarnet = await service.generarCarnet(noAfiliacion, baseFrontend);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="carnet_${noAfiliacion}.pdf"`);
    const stream = fs.createReadStream(rutaCarnet);
    stream.pipe(res);
    stream.on('end', () => { fs.unlink(rutaCarnet, () => { /* archivo temporal */ }); });
  },
  (err) => [500, { error: 'Error al generar el carné.', detalle: err.message }]
));

module.exports = router;
