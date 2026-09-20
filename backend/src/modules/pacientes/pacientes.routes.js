// Rutas HTTP de pacientes. Se exponen como routers separados porque en server.js se montan en el mismo
// orden que los controladores originales (algunas URLs se repiten entre pantallas y gana la primera).
const express = require('express');
const fs = require('fs');
const service = require('./pacientes.service');
const repo = require('./pacientes.repository');
const fotos = require('./fotos');
const { wrap } = require('../../shared/http');
const { actorFromRequest } = require('../../shared/auth');

function nuevoRouter() {
  const router = express.Router();
  router.use(express.json());
  return router;
}

const conError = (mensaje) => (err) => [500, { error: mensaje }];
const conDetalle = (mensaje) => (err) => [500, { error: mensaje, detalle: err.message }];

// ------------------------------------------------------------- Actualización
const actualizacion = nuevoRouter();

actualizacion.get('/Adepartamento', wrap(async (req, res) => res.json(await repo.departamentos()), conError('Error al obtener departamentos.')));
actualizacion.get('/Aaccesos-vascular', wrap(async (req, res) => res.json(await repo.accesosVasculares()), conError('Error al obtener accesos vasculares.')));
actualizacion.get('/Ajornada', wrap(async (req, res) => res.json(await repo.jornadasActivas()), conError('Error al obtener jornadas.')));

actualizacion.get('/Acheck-photo/:filename', (req, res) => {
  res.json({ exists: fotos.existeFoto(req.params.filename) });
});

// Foto por número de afiliación, tolerante a nombres con sufijos/espacios
actualizacion.get('/Afoto/:id', (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'id requerido' });
  const ruta = fotos.rutaFotoPorId(id);
  if (ruta && fs.existsSync(ruta)) return res.sendFile(ruta);
  return res.status(404).json({ error: 'foto_no_encontrada' });
});

actualizacion.put('/Apacientes/:no_afiliacion', wrap(
  async (req, res) => res.json(await service.actualizarPaciente(req.params.no_afiliacion, req.body, actorFromRequest(req))),
  () => [500, { success: false, detail: 'Error al actualizar paciente' }]
));

actualizacion.post('/Aupload-foto/:no_Afiliacion', wrap(
  async (req, res) => res.json(await service.subirFoto(req.params.no_Afiliacion, req.body.imagenBase64, actorFromRequest(req))),
  (err) => { console.error('Error al subir foto:', err); return [500, { detail: 'Error al guardar la foto.' }]; }
));

actualizacion.get('/Apacientes/actualizacion', wrap(
  async (req, res) => res.json(await service.pacienteParaActualizacion(req.query.dpi, req.query.no_afiliacion)),
  conDetalle('Error al buscar pacientes para actualizacion.')
));

// -------------------------------------------------------------------- Egreso
const egreso = nuevoRouter();

egreso.get('/pacientes/egreso', wrap(
  async (req, res) => res.json(await service.pacientesParaEgreso(req.query)),
  conDetalle('Error al buscar pacientes para egreso.')
));

egreso.put('/pacientes/:noAfiliacion', wrap(
  async (req, res) => res.json(await service.actualizarDesdeEgresoOReingreso(req.params.noAfiliacion, req.body, actorFromRequest(req))),
  (err) => {
    console.error('Error en PUT /pacientes/:noAfiliacion:', err.message, err.stack);
    return [500, { detail: err.message }];
  }
));

egreso.post('/egresos', wrap(
  async (req, res) => res.json(await service.registrarEgreso(req.body, actorFromRequest(req))),
  (err, req) => {
    if (err && (err.code === '55P03' || err.message === 'LOCKED')) {
      return [409, { error: 'El paciente está siendo editado. Intente nuevamente.' }];
    }
    console.error('Error en POST /egresos:', err.message, req.body);
    return [500, { error: 'Error al insertar egreso', detalle: err.message }];
  }
));

egreso.get('/causas_egreso', wrap(
  async (req, res) => res.json(await repo.causasEgresoActivas()),
  conDetalle('Error al obtener causas de egreso.')
));

// ----------------------------------------------------------------- Reingreso
const reingreso = nuevoRouter();

reingreso.get('/pacientes/reingreso', wrap(
  async (req, res) => res.json(await service.pacientesParaReingreso(req.query)),
  (err) => { console.error('[GET reingreso/pacientes/reingreso] ERROR:', err); return [500, { error: 'Error al buscar pacientes para reingreso.' }]; }
));

reingreso.post('/pacientes/reingreso', wrap(
  async (req, res) => res.json(await service.registrarReingreso(req.body || {}, actorFromRequest(req))),
  (err) => { console.error('[POST reingreso/pacientes/reingreso] ERROR:', err); return [500, { success: false, error: 'Error al registrar el reingreso.' }]; }
));

reingreso.post('/historial/reingresos', wrap(
  async (req, res) => res.status(201).json(await service.registrarHistorialReingreso(req.body || {}, actorFromRequest(req))),
  (err) => { console.error('[POST historial/reingresos] ERROR:', err); return [500, { error: 'Error al crear reingreso.' }]; }
));

// ------------------------------------------------------------------ Registro
const registro = nuevoRouter();

registro.get('/departamentos', wrap(async (req, res) => res.json(await repo.departamentos()), conError('Error al obtener departamentos')));
registro.get('/accesos-vasculares', wrap(async (req, res) => res.json(await repo.accesosVasculares()), conError('Error al obtener accesos vasculares')));
registro.get('/jornadas', wrap(async (req, res) => res.json(await repo.jornadasActivas()), conError('Error al obtener jornadas')));

registro.get('/pacientes/existe/dpi/:dpi', wrap(
  async (req, res) => res.json(await service.existePorDpi(req.params.dpi)),
  conError('Error al buscar paciente por DPI.')
));

registro.get('/pacientes/existe/noafiliacion/:noafiliacion', wrap(
  async (req, res) => res.json(await service.existePorNoAfiliacion(req.params.noafiliacion)),
  conError('Error al obtener paciente.')
));

registro.post('/pacientes', wrap(
  async (req, res) => res.status(201).json(await service.registrarPaciente(req.body || {}, actorFromRequest(req))),
  (err) => {
    console.error('[POST /pacientes] ERROR:', err.message, err.code);
    if (err.code === '23505') return [409, { error: 'no_afiliacion o dpi ya existe' }];
    return [500, { error: 'Error al registrar el paciente' }];
  }
));

registro.get('/carnet/forzar/:noafiliacion', wrap(
  async (req, res) => {
    const { noaf, rutaCarnet } = await service.generarCarnet(req.params.noafiliacion);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${noaf}_carnet.pdf"`);
    const stream = fs.createReadStream(rutaCarnet);
    stream.on('end', () => { try { fs.unlinkSync(rutaCarnet); } catch (_) { /* ya borrado */ } });
    stream.pipe(res);
  },
  (err) => {
    console.error('Error en GET /carnet/forzar/:noafiliacion:', err);
    return [500, { error: 'Error al generar el carné.', detalle: err.message }];
  }
));

// --------------------------------------------------------------- Formularios
const formularios = nuevoRouter();

formularios.put('/api/pacientes/masivo', wrap(
  async (req, res) => res.json(await service.registrarFormularios(req.body?.pacientes, actorFromRequest(req))),
  (err) => {
    console.error('Error en actualización masiva:', err);
    return [500, { error: 'Error al actualizar pacientes.', detalle: err.message }];
  }
));

formularios.get('/consulta_pacientes_formularios/:noafiliacion', wrap(
  async (req, res) => res.json(await service.tablaFormularios(req.params.noafiliacion)),
  (err) => { console.error('Error en /consulta_pacientes_formularios:', err); return [500, { error: 'Error al obtener paciente.', detalle: err.message }]; }
));

module.exports = { actualizacion, egreso, reingreso, registro, formularios };
