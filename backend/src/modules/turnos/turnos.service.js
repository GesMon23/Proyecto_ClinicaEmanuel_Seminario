// Casos de uso de turnos: validaciones de entrada y orquestación sobre el repositorio.
const repo = require('./turnos.repository');
const { HttpError } = require('../../shared/http');

async function pacienteDetalle(noAfiliacion) {
  const filas = await repo.pacienteDetalle(noAfiliacion);
  if (!filas.length) throw new HttpError(404, { error: 'Paciente no encontrado.' });
  return filas[0];
}

async function crearTurno({ noAfiliacion, clinica, fechaTurno }) {
  await repo.crearTurno({ noAfiliacion, clinica, fechaTurno });
  return { success: true, message: 'Turno creado exitosamente', turnoId: null };
}

async function actualizarTurno(idTurno, { fechaTurno, clinica }) {
  if (!fechaTurno || !clinica) {
    throw new HttpError(400, { success: false, message: 'Faltan datos requeridos.' });
  }
  await repo.actualizarTurno({ idTurno, fechaTurno, clinica });
  return { success: true, message: 'Turno actualizado exitosamente' };
}

async function registrarFaltista({ noafiliacion, fechaFalta, motivoFalta, nombreClinica }) {
  if (!noafiliacion || !fechaFalta || !motivoFalta || !nombreClinica) {
    throw new HttpError(400, { success: false, message: 'Faltan datos requeridos.' });
  }
  await repo.registrarFaltista({ noAfiliacion: noafiliacion, fechaFalta, motivoFalta, nombreClinica });
  return { success: true, message: 'Faltista registrado correctamente.' };
}

// La lista de la pestaña Asignación primero deja al día los turnos vencidos
async function turnosCreadosHoy() {
  await repo.marcarFaltantesAutomaticos().catch((err) => {
    console.error('[turnos] Error al marcar faltantes automáticos:', err.message);
  });
  return repo.turnosCreadosHoy();
}

async function siguienteTurno(clinica) {
  const filas = await repo.siguienteTurno(clinica);
  if (!filas.length) throw new HttpError(404, { message: 'No hay turnos pendientes para esta clínica' });
  return filas;
}

async function turnoActualClinica(clinica) {
  const filas = await repo.turnoActualClinica(clinica);
  if (!filas.length) throw new HttpError(404, { message: 'No hay turno actual en estado de llamado' });
  return filas[0];
}

async function turnoActualUsuario(idUsuario) {
  const filas = await repo.turnoActualUsuario(idUsuario);
  if (!filas.length) throw new HttpError(404, { message: 'El usuario no tiene un turno en atención' });
  return filas[0];
}

// Llamar/abandonar/finalizar devuelven la fila actualizada del turno
async function cambiarEstado(operacion, idTurno, idUsuario, mensajeExito) {
  const filas = await repo[operacion](idTurno, idUsuario);
  if (!filas.length) throw new HttpError(404, { success: false, message: 'Turno no encontrado' });
  return { success: true, message: mensajeExito, turno: filas[0] };
}

const llamarTurno = (idTurno, idUsuario) =>
  cambiarEstado('llamarTurno', idTurno, idUsuario, 'Turno actualizado a Llamado');
const abandonarTurno = (idTurno, idUsuario) =>
  cambiarEstado('abandonarTurno', idTurno, idUsuario,
    'El turno fue marcado como abandonado. El paciente no se presentó a su cita.');
const finalizarTurno = (idTurno, idUsuario) =>
  cambiarEstado('finalizarTurno', idTurno, idUsuario, 'Estado del turno actualizado a Finalizado');

async function siguientesTurnos(clinica) {
  return { success: true, turnos: await repo.siguientesTurnos(clinica) };
}

async function asignarTurno(idTurno, idUsuario) {
  await repo.asignarTurno(idTurno, idUsuario);
  return { success: true, message: 'Turno asignado exitosamente' };
}

async function cancelarTurno(idTurno, actor) {
  try {
    await repo.cancelarTurno(idTurno, actor);
  } catch (err) {
    if (String(err.message).startsWith('TURNO_NO_ENCONTRADO')) {
      throw new HttpError(404, { success: false, message: 'Turno no encontrado.' });
    }
    throw err;
  }
  return { success: true, message: 'Turno cancelado correctamente.' };
}

async function marcarFaltante(idTurno) {
  await repo.marcarFaltante(idTurno);
  return { success: true, message: 'Turno marcado como faltante' };
}

module.exports = {
  pacienteDetalle,
  crearTurno, actualizarTurno, registrarFaltista, cancelarTurno, marcarFaltante,
  turnosCreadosHoy, siguienteTurno, siguientesTurnos, turnoActualClinica, turnoActualUsuario,
  llamarTurno, abandonarTurno, finalizarTurno, asignarTurno,
};
