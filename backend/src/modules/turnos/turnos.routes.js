// Rutas HTTP de turnos. Solo traducen request -> servicio -> response; se conservan las URLs y los
// formatos de error que ya consume el frontend.
const express = require('express');
const service = require('./turnos.service');
const repo = require('./turnos.repository');
const { wrap, noCache, parseBusinessError } = require('../../shared/http');
const { requireUser, userIdFromRequest, userNameFromRequest } = require('../../shared/auth');

const router = express.Router();
router.use(express.json());

// Formatos de error por endpoint
const conDetalle = (err) => [500, { detail: err.message }];
const conError = (mensaje) => (err) => [500, { error: mensaje, detalle: err.message }];
const conMensaje = (mensaje) => (err) => [500, { success: false, message: mensaje, detalle: err.message }];

const CODIGOS_NEGOCIO = ['USUARIO_CON_TURNO', 'TURNO_NO_DISPONIBLE', 'TURNO_NO_EN_ATENCION', 'TURNO_NO_CREADA', 'TURNO_NO_CANCELABLE'];
// Reglas de negocio de los procedimientos -> 409 con mensaje legible; el resto -> 500
const conReglasDeNegocio = (mensajeGenerico) => (err) => {
  const negocio = parseBusinessError(err, CODIGOS_NEGOCIO);
  if (negocio) return [409, { success: false, code: negocio.codigo, message: negocio.mensaje, error: negocio.mensaje }];
  return [500, { success: false, message: mensajeGenerico, error: err.message }];
};

// ---- Catálogos ----
router.get('/GestadosTurnoT', wrap(async (req, res) => res.json(await repo.estados()), conDetalle));

router.get('/jornadas', wrap(async (req, res) => res.json(await repo.jornadas()), (err) => {
  console.error('Error en /jornadas (turnos):', err);
  return [500, { error: 'Error al obtener jornadas.' }];
}));

router.get('/GclinicasT', wrap(async (req, res) => res.json(await repo.clinicas()), conDetalle));

router.get('/GpacientesT/:noafiliacion', wrap(
  async (req, res) => res.json(await service.pacienteDetalle(req.params.noafiliacion)),
  conError('Error al obtener paciente.')
));

// ---- Listados ----
router.get('/GmuestraTurnosT', wrap(
  async (req, res) => res.json(await repo.turnosPendientesPaciente(req.query.noafiliacion)), conDetalle));

router.get('/GmuestraTurnosFaltantesT', wrap(
  async (req, res) => res.json(await repo.turnosFaltantesPaciente(req.query.noafiliacion)), conDetalle));

router.get('/GturnosCreadosT', wrap(async (req, res) => {
  noCache(res);
  res.json(await service.turnosCreadosHoy());
}, conDetalle));

router.get('/GturnosT', wrap(async (req, res) => {
  const { numeroafiliacion, fecha, clinica, estado } = req.query;
  res.json(await repo.turnosTodos({ noAfiliacion: numeroafiliacion, fecha, clinica, estado }));
}, (err) => {
  console.error('Error al obtener turnos:', err);
  return [500, {
    error: 'Error al obtener turnos',
    detalle: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  }];
}));

// ---- Crear / editar / cancelar ----
router.post('/Gcrear-turnoT', wrap(async (req, res) => res.json(await service.crearTurno(req.body)), conDetalle));

router.put('/Gactualizar-turnoT/:turno_id', wrap(
  async (req, res) => res.json(await service.actualizarTurno(req.params.turno_id, req.body)),
  (err) => { console.error('Error al actualizar turno:', err); return conDetalle(err); }
));

router.put('/Gcancelar-turnoT/:idturno', wrap(
  async (req, res) => res.json(await service.cancelarTurno(req.params.idturno, userNameFromRequest(req))),
  (err) => { console.error('Error al cancelar turno:', err); return conReglasDeNegocio('Error al cancelar turno.')(err); }
));

// ---- Faltas ----
router.post('/Gregistrar-faltistaT', wrap(
  async (req, res) => res.json(await service.registrarFaltista(req.body)),
  (err) => { console.error('Error al registrar faltista:', err); return conMensaje('Error al registrar faltista.')(err); }
));

router.put('/Gfaltante-turnoT/:idturno', wrap(
  async (req, res) => res.json(await service.marcarFaltante(req.params.idturno)),
  (err) => { console.error('Error al marcar turno como faltante:', err); return conDetalle(err); }
));

// ---- Cola de llamado ----
router.put('/Gasignar-turnoT/:turno_id', wrap(
  async (req, res) => res.json(await service.asignarTurno(req.params.turno_id, userIdFromRequest(req))),
  (err) => { console.error('Error al asignar el turno:', err); return conReglasDeNegocio('Error al asignar el estado del turno')(err); }
));

router.get('/Gsiguiente-turnoT/:descripcionClinica', wrap(async (req, res) => {
  noCache(res);
  res.json(await service.siguienteTurno(req.params.descripcionClinica));
}, (err) => { console.error('Error al obtener el siguiente turno:', err); return conError('Error al obtener el siguiente turno')(err); }));

router.get('/Gsiguientes-turnosT/:clinica', wrap(async (req, res) => {
  noCache(res);
  res.json(await service.siguientesTurnos(req.params.clinica));
}, (err) => {
  console.error('Error al obtener los siguientes turnos:', err);
  return [500, { success: false, message: 'Error al obtener los siguientes turnos', error: err.message }];
}));

// Turno actual de una clínica (el último llamado); lo consume la pantalla TV
router.get('/Gturno-actual/:descripcionClinica', wrap(async (req, res) => {
  noCache(res);
  res.json(await service.turnoActualClinica(req.params.descripcionClinica));
}, (err) => { console.error('Error al obtener el turno actual:', err); return conError('Error al obtener el turno actual')(err); }));

// Turno que el usuario autenticado tiene en atención (un usuario solo puede tener uno)
router.get('/Gturno-actual-usuario', requireUser, wrap(async (req, res) => {
  noCache(res);
  res.json(await service.turnoActualUsuario(req.userId));
}, (err) => { console.error('Error al obtener el turno del usuario:', err); return conError('Error al obtener el turno del usuario')(err); }));

router.put('/Gactualizar-estado-llamadoT/:idTurno', requireUser, wrap(
  async (req, res) => res.json(await service.llamarTurno(req.params.idTurno, req.userId)),
  (err) => { console.error('Error al actualizar estado del turno:', err); return conReglasDeNegocio('Error al actualizar el estado del turno')(err); }
));

router.put('/Gabandonar-turnoT/:idTurno', requireUser, wrap(
  async (req, res) => res.json(await service.abandonarTurno(req.params.idTurno, req.userId)),
  (err) => { console.error('Error al abandonar el turno:', err); return conReglasDeNegocio('Error al actualizar el estado del turno')(err); }
));

router.put('/Gfinalizar-turnoT/:idTurno', requireUser, wrap(
  async (req, res) => res.json(await service.finalizarTurno(req.params.idTurno, req.userId)),
  (err) => { console.error('Error al finalizar el turno:', err); return conReglasDeNegocio('Error al actualizar el estado del turno')(err); }
));

module.exports = router;
