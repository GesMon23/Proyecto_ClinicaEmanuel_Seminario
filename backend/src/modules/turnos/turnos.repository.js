// Acceso a datos de turnos: cada función es una transacción que llama a un procedimiento almacenado.
// Las reglas de negocio viven en PostgreSQL (BD/esquema_reconstruido.sql); aquí no hay lógica.
const { withTransaction, callProcedure, fetchCursor } = require('../../shared/database');

const estados = () => withTransaction((c) => fetchCursor(c, 'sp_mostrar_estados_turno', [], 'cur1'));
const jornadas = () => withTransaction((c) => fetchCursor(c, 'sp_mostrar_jornadas_turnos', [], 'cur_jornadas'));
const clinicas = () => withTransaction((c) => fetchCursor(c, 'sp_mostrar_clinicas', [], 'cur_clinicas'));
const pacienteDetalle = (noAfiliacion) =>
  withTransaction((c) => fetchCursor(c, 'sp_mostrar_paciente_detalle', [noAfiliacion], 'cur_paciente'));

// Listados
const turnosPendientesPaciente = (noAfiliacion) =>
  withTransaction((c) => fetchCursor(c, 'sp_mostrar_turnos_t', [noAfiliacion]));
const turnosFaltantesPaciente = (noAfiliacion) =>
  withTransaction((c) => fetchCursor(c, 'sp_mostrar_turnos_faltantes_t', [noAfiliacion]));
const turnosCreadosHoy = () => withTransaction((c) => fetchCursor(c, 'sp_mostrar_turnos_creados_hoy'));
const turnosTodos = ({ noAfiliacion, fecha, clinica, estado }) =>
  withTransaction((c) => fetchCursor(c, 'sp_mostrar_turnos_todos', [noAfiliacion || null, fecha || null, clinica || null, estado || null]));

// Cola de llamado
const siguienteTurno = (clinica) => withTransaction((c) => fetchCursor(c, 'sp_siguiente_turno', [clinica]));
const siguientesTurnos = (clinica) => withTransaction((c) => fetchCursor(c, 'sp_siguientes_turnos', [clinica]));
const turnoActualClinica = (clinica) => withTransaction((c) => fetchCursor(c, 'sp_turno_actual', [clinica]));
const turnoActualUsuario = (idUsuario) => withTransaction((c) => fetchCursor(c, 'sp_turno_actual_usuario', [idUsuario]));

// Cambios de estado
const crearTurno = ({ noAfiliacion, clinica, fechaTurno }) =>
  withTransaction((c) => callProcedure(c, 'sp_crear_turno_t', [noAfiliacion, clinica, fechaTurno, null]));
const actualizarTurno = ({ idTurno, fechaTurno, clinica }) =>
  withTransaction((c) => callProcedure(c, 'sp_actualizar_turno_simple', [idTurno, fechaTurno, clinica]));
const cancelarTurno = (idTurno, actor) =>
  withTransaction((c) => callProcedure(c, 'sp_cancelar_turno', [idTurno, actor]));
const marcarFaltante = (idTurno) => withTransaction((c) => callProcedure(c, 'sp_marcar_turno_faltante', [idTurno]));
const registrarFaltista = ({ noAfiliacion, fechaFalta, motivoFalta, nombreClinica }) =>
  withTransaction((c) => callProcedure(c, 'sp_registrar_faltista_t', [noAfiliacion, fechaFalta, motivoFalta, nombreClinica]));
const asignarTurno = (idTurno, idUsuario) =>
  withTransaction((c) => callProcedure(c, 'sp_asignar_turno', [idTurno, idUsuario]));
const llamarTurno = (idTurno, idUsuario) =>
  withTransaction((c) => fetchCursor(c, 'sp_actualizar_estado_llamado', [idTurno, idUsuario]));
const abandonarTurno = (idTurno, idUsuario) =>
  withTransaction((c) => fetchCursor(c, 'sp_abandonar_turno', [idTurno, idUsuario]));
const finalizarTurno = (idTurno, idUsuario) =>
  withTransaction((c) => fetchCursor(c, 'sp_finalizar_turno', [idTurno, idUsuario]));

// Turnos Creada de días anteriores pasan a Faltante (motivo automático); devuelve cuántos cambió
async function marcarFaltantesAutomaticos() {
  return withTransaction(async (c) => {
    const r = await c.query('CALL sp_marcar_faltantes_automaticos(0)');
    return Number(r.rows?.[0]?.p_total || 0);
  });
}

module.exports = {
  estados, jornadas, clinicas, pacienteDetalle,
  turnosPendientesPaciente, turnosFaltantesPaciente, turnosCreadosHoy, turnosTodos,
  siguienteTurno, siguientesTurnos, turnoActualClinica, turnoActualUsuario,
  crearTurno, actualizarTurno, cancelarTurno, marcarFaltante, registrarFaltista,
  asignarTurno, llamarTurno, abandonarTurno, finalizarTurno,
  marcarFaltantesAutomaticos,
};
