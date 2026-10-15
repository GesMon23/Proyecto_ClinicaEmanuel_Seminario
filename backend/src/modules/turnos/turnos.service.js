// Casos de uso de turnos: validaciones de entrada y orquestación sobre el repositorio.
const repo = require('./turnos.repository');
const { HttpError, parseBusinessError } = require('../../shared/http');

async function pacienteDetalle(noAfiliacion) {
  const filas = await repo.pacienteDetalle(noAfiliacion);
  if (!filas.length) throw new HttpError(404, { error: 'Paciente no encontrado.' });
  return filas[0];
}

// ---- Clínicas por usuario ----
// funcion: 'llamado' (pestaña Llamado) o 'crear' (pestaña Crear: crear, editar y cancelar)
const QUE_HACE = { llamado: 'llamar turnos', crear: 'crear o modificar turnos' };

function sinClinica(funcion, clinica) {
  const mensaje = clinica
    ? `No tienes asignada la clínica ${clinica} para ${QUE_HACE[funcion]}. Pídelo a un administrador.`
    : `No tienes asignada la clínica de este turno para ${QUE_HACE[funcion]}.`;
  return new HttpError(403, { success: false, code: 'CLINICA_NO_ASIGNADA', message: mensaje, error: mensaje });
}

async function exigirClinica(idUsuario, funcion, clinica) {
  if (!(await repo.puedeClinica(idUsuario, funcion, clinica))) throw sinClinica(funcion, clinica);
}

async function exigirTurno(idUsuario, funcion, idTurno) {
  if (!(await repo.puedeTurno(idUsuario, funcion, idTurno))) throw sinClinica(funcion, await repo.clinicaDeTurno(idTurno));
}

const FUNCIONES = ['llamado', 'crear'];

function clinicasDeUsuario(idUsuario, funcion) {
  if (!FUNCIONES.includes(funcion)) throw new HttpError(404, { error: 'Función desconocida' });
  return repo.clinicasDeUsuario(idUsuario, funcion);
}

// Normaliza la elección de una función: null = todas las clínicas; si no, una lista de ids
function eleccionDeClinicas(valor, funcion) {
  if (valor === null) return null;
  if (!Array.isArray(valor) || !valor.every((v) => Number.isInteger(Number(v)) && Number(v) > 0)) {
    throw new HttpError(400, { error: `${funcion}: debe ser null (todas las clínicas) o una lista de ids de clínica` });
  }
  if (valor.length === 0) throw new HttpError(400, { error: 'Marca al menos una clínica o elige "Todas las clínicas"' });
  return [...new Set(valor.map(Number))];
}

const ERRORES_CLINICAS = { FUNCION_INVALIDA: 400, SIN_CLINICAS: 400, CLINICA_INVALIDA: 400, USUARIO_NO_ENCONTRADO: 404 };

async function guardarClinicasUsuario(idParam, body, actor) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, { error: 'id inválido' });
  const llamado = eleccionDeClinicas(body?.llamado, 'llamado');
  const crear = eleccionDeClinicas(body?.crear, 'crear');
  try {
    await repo.guardarClinicasUsuario(id, { llamado, crear }, actor || 'sistema');
  } catch (err) {
    const negocio = parseBusinessError(err, Object.keys(ERRORES_CLINICAS));
    if (negocio) throw new HttpError(ERRORES_CLINICAS[negocio.codigo], { error: negocio.mensaje });
    throw err;
  }
  return { ok: true };
}

// ---- Crear / editar / cancelar ----

async function crearTurno({ noAfiliacion, clinica, fechaTurno }, idUsuario) {
  await exigirClinica(idUsuario, 'crear', clinica);
  await repo.crearTurno({ noAfiliacion, clinica, fechaTurno });
  return { success: true, message: 'Turno creado exitosamente', turnoId: null };
}

async function actualizarTurno(idTurno, { fechaTurno, clinica }, idUsuario) {
  if (!fechaTurno || !clinica) {
    throw new HttpError(400, { success: false, message: 'Faltan datos requeridos.' });
  }
  // La clínica actual del turno y la nueva deben estar asignadas
  await exigirTurno(idUsuario, 'crear', idTurno);
  await exigirClinica(idUsuario, 'crear', clinica);
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

async function siguienteTurno(clinica, idUsuario) {
  await exigirClinica(idUsuario, 'llamado', clinica);
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

async function llamarTurno(idTurno, idUsuario) {
  await exigirTurno(idUsuario, 'llamado', idTurno);
  return cambiarEstado('llamarTurno', idTurno, idUsuario, 'Turno actualizado a Llamado');
}
// Abandonar y finalizar no revisan la clínica: el turno ya está en atención del propio usuario (si le quitan
// la clínica a mitad de la atención, igual debe poder cerrarlo)
const abandonarTurno = (idTurno, idUsuario) =>
  cambiarEstado('abandonarTurno', idTurno, idUsuario,
    'El turno fue marcado como abandonado. El paciente no se presentó a su cita.');
const finalizarTurno = (idTurno, idUsuario) =>
  cambiarEstado('finalizarTurno', idTurno, idUsuario, 'Estado del turno actualizado a Finalizado');

async function siguientesTurnos(clinica, idUsuario) {
  await exigirClinica(idUsuario, 'llamado', clinica);
  return { success: true, turnos: await repo.siguientesTurnos(clinica) };
}

async function asignarTurno(idTurno, idUsuario) {
  await repo.asignarTurno(idTurno, idUsuario);
  return { success: true, message: 'Turno asignado exitosamente' };
}

async function cancelarTurno(idTurno, actor, idUsuario) {
  await exigirTurno(idUsuario, 'crear', idTurno);
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
  pacienteDetalle, clinicasDeUsuario, eleccionDeClinicas, guardarClinicasUsuario, usuariosClinicas: repo.usuariosClinicas,
  crearTurno, actualizarTurno, registrarFaltista, cancelarTurno, marcarFaltante,
  turnosCreadosHoy, siguienteTurno, siguientesTurnos, turnoActualClinica, turnoActualUsuario,
  llamarTurno, abandonarTurno, finalizarTurno, asignarTurno,
};
