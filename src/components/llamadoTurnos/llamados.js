// Comunicación del llamado de turnos con la pantalla de la TV y el servidor.
import api from '@/config/api';

const nuevoIdLlamado = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Publica el evento para la TV por dos vías: el navegador (TV en la misma máquina: localStorage y evento) y el
// servidor (TV en otros equipos: SSE y sondeo). Ambas llevan el mismo idLlamado para que la TV lo anuncie una vez.
// La hora la pone el servidor.
export async function notificarTV(clinica, accion, turno = null) {
  const idLlamado = nuevoIdLlamado();
  const detalle = { clinica, accion, idLlamado, timestamp: Date.now() };
  try { localStorage.setItem('turnoActualizado', JSON.stringify(detalle)); } catch { /* sin almacenamiento */ }
  try { window.dispatchEvent(new CustomEvent('turnoActualizado', { detail: detalle })); } catch { /* sin eventos */ }
  try {
    await api.post('/turnos/llamado', { clinica, accion, idLlamado, turnoId: turno?.id_turno_cod || null });
  } catch { /* la TV también se entera por la consulta periódica del turno actual */ }
}

// Vuelve a anunciar el turno actual en las TV (también en las de otros equipos)
export const volverALlamar = (clinica, turno = null) => notificarTV(clinica, 're-llamar', turno);

export const mensajeDeError = (error, porDefecto) =>
  error.response?.data?.message || error.response?.data?.error || porDefecto;

// Rutas de la API para la foto del paciente de un turno: la que resuelve el backend por afiliación o, si no,
// el archivo guardado (las fotos solo se sirven desde la API, con sesión)
export function rutasFotoDeTurno(turno) {
  const noAfiliacion = turno?.no_afiliacion || turno?.noafiliacion || '';
  if (noAfiliacion) return [`/foto/${encodeURIComponent(noAfiliacion)}?v=${encodeURIComponent(turno?.id_turno_cod || '1')}`];
  const guardada = String(turno?.url_foto || '');
  if (!guardada || /^https?:/.test(guardada)) return [];
  return [guardada.startsWith('/') ? guardada : `/fotos/${encodeURIComponent(guardada)}`];
}

// Los dos modos de cerrar el turno en atención
export const CIERRE_ABANDONAR = {
  endpoint: '/Gabandonar-turnoT', accion: 'abandonar', exito: 'Turno marcado como abandonado', falla: 'Error al marcar el turno como abandonado',
};
export const CIERRE_FINALIZAR = {
  endpoint: '/Gfinalizar-turnoT', accion: 'finalizar', exito: 'Turno finalizado exitosamente', falla: 'Error al finalizar el turno',
};
