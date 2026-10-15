// Reglas y transformaciones de los turnos de un paciente (sin React).
import { formatearFecha } from '@/utils/fechas';

// Fechas 'YYYY-MM-DD' en hora local, sin pasar por UTC (evita el desfase de un día)
export function formatDateToYMDLocal(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseYMDToLocalDate(ymd) {
  if (!ymd) return null;
  const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function addDaysYMD(ymd, days) {
  const dt = parseYMDToLocalDate(ymd);
  if (!dt) return ymd;
  dt.setDate(dt.getDate() + days);
  return formatDateToYMDLocal(dt);
}

// Los domingos y los días anteriores a hoy no admiten turnos
export function esDiaSeleccionable(date, hoy = new Date()) {
  const inicio = new Date(hoy);
  inicio.setHours(0, 0, 0, 0);
  return date.getDay() !== 0 && date >= inicio;
}

// Motivo por el que no se pueden crear turnos a un paciente (o null si se puede)
export function motivoSinTurnos(paciente) {
  const idEstado = Number(paciente.id_estado ?? paciente.idestado ?? paciente.estado_id ?? 0);
  const idCausa = Number(paciente.id_causa ?? paciente.idcausa ?? 0);
  const estado = String(paciente.estado_descripcion ?? paciente.estado ?? '').toLowerCase();
  const causa = String(paciente.causaegreso_descripcion ?? paciente.causa_egreso_descripcion ?? paciente.descripcion ?? '').toLowerCase();
  const egresado = idEstado === 3 || estado.includes('egres');
  const fallecido = idEstado === 5 || idCausa === 1 || estado.includes('fallec') || causa.includes('fallec') || causa.includes('defunc');
  return egresado || fallecido ? 'No se pueden crear turnos para pacientes egresados o fallecidos.' : null;
}

export function nombreDePaciente(paciente) {
  return paciente.nombrepaciente
    || `${paciente.primer_nombre || ''} ${paciente.segundo_nombre || ''} ${paciente.primer_apellido || ''} ${paciente.segundo_apellido || ''}`.trim();
}

// Turnos -> eventos de FullCalendar (día completo; `end` es exclusivo)
export function turnosAEventos(turnos) {
  return turnos.map((turno) => ({
    title: `Clínica: ${turno.nombre_clinica}`,
    start: turno.fecha_turno,
    end: addDaysYMD(turno.fecha_turno, 1),
    allDay: true,
    extendedProps: {
      turnoId: turno.id_turno,
      noAfiliacion: turno.noafiliacion,
      paciente: turno.nombrepaciente,
      clinica: turno.nombre_clinica,
    },
  }));
}

// Texto sin tildes ni mayúsculas para buscar
export const normalizarBusqueda = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Texto de la ventana con el detalle de un turno del calendario
export function detalleDeEvento(evento) {
  const p = evento.extendedProps;
  const ymd = evento.startStr || formatDateToYMDLocal(evento.start);
  return `Información del Turno:\n`
    + `Turno: # ${p.turnoId || '—'}\n`
    + `Paciente: ${p.paciente || '—'}\n`
    + `No. Afiliación: ${p.noAfiliacion || '—'}\n`
    + `Clínica: ${p.clinica || '—'}\n`
    + `Fecha: ${formatearFecha(ymd) || ymd}`;
}
