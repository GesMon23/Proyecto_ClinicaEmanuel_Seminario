// Rutas de los registros clínicos. server.js monta cada router donde ya vivía:
//   nutricion -> /nutricion y /api/nutricion      psicologia -> /psicologia y /api/psicologia
//   laboratorios -> /laboratorios y /api          referencias y catalogos -> raíz y /api
const express = require('express');
const service = require('./registros.service');
const { wrap } = require('../../shared/http');

const errorInterno = (mensaje, log) => (err) => {
  console.error(log, err);
  return [500, { error: 'Error interno del servidor', detalle: err.message, ...(mensaje ? { message: mensaje } : {}) }];
};

// ---- Nutrición ----
const nutricion = express.Router();
nutricion.post('/evaluacion', wrap(async (req, res) => {
  const informe = await service.guardarNutricion(req);
  res.status(201).json({ message: 'Informe de nutrición guardado exitosamente', informe });
}, (err) => {
  console.error('Error en Nutrición /evaluacion:', err);
  return [500, { error: 'Error interno del servidor', detalle: err.message }];
}));

// ---- Psicología ----
const psicologia = express.Router();
psicologia.post('/evaluacion', wrap(async (req, res) => {
  const { informe, kdqol } = await service.guardarPsicologia(req);
  res.status(201).json({ message: 'Evaluación psicológica guardada exitosamente', informe, kdqol });
}, (err) => {
  console.error('Error al guardar evaluación:', err);
  return [500, { error: 'Error interno del servidor', detalle: err.message }];
}));

// ---- Laboratorios ----
const laboratorios = express.Router();
laboratorios.get('/:noafiliacion', wrap(async (req, res) => {
  res.json({ success: true, data: await service.laboratoriosPorAfiliacion(req.params.noafiliacion) });
}, (err) => {
  console.error('Error en Laboratorios GET /:noafiliacion:', err);
  return [500, { success: false, message: 'Error al listar laboratorios por afiliación' }];
}));

laboratorios.post('/', wrap(async (req, res) => {
  const r = await service.guardarLaboratorio(req);
  res.status(201).json({
    message: 'Registro de laboratorio guardado exitosamente',
    idlaboratorio: r.idlaboratorio,
    parametros_insertados: r.parametros_insertados,
  });
}, errorInterno(null, 'Error en Laboratorios POST /:')));

laboratorios.get('/:noafiliacion/parametros/ultimo', wrap(async (req, res) => {
  res.json({ success: true, idlaboratorio: null, data: await service.parametrosUltimoLaboratorio(req.params.noafiliacion) });
}, (err) => {
  console.error('Error en Laboratorios GET /:noafiliacion/parametros/ultimo:', err);
  return [500, { success: false, message: 'Error al obtener últimos parámetros' }];
}));

// ---- Referencias ----
const referencias = express.Router();
referencias.post('/api/referencias', wrap(async (req, res) => {
  res.status(201).json({ success: true, referencia: await service.registrarReferencia(req) });
}, (err) => {
  console.error('Error al registrar referencia:', err);
  return [500, { detail: 'Error al registrar referencia.' }];
}));

// ---- Catálogos ----
const catalogos = express.Router();
catalogos.get('/medicos', wrap(async (req, res) => {
  res.json(await service.listarMedicos());
}, (err) => {
  console.error('Error al obtener médicos:', err);
  return [500, { detail: 'Error al obtener médicos.' }];
}));

module.exports = { nutricion, psicologia, laboratorios, referencias, catalogos };
