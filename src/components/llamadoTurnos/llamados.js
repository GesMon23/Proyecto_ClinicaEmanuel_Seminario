// Comunicación del llamado de turnos con la pantalla de la TV y el servidor.
import api from '@/config/api';

// Publica el evento para la TV: localStorage y evento del navegador (misma máquina) y el servidor (SSE, otros dispositivos)
export async function notificarTV(clinica, accion, turno = null) {
  const detalle = { clinica, timestamp: Date.now(), accion };
  try { localStorage.setItem('turnoActualizado', JSON.stringify(detalle)); } catch { /* sin almacenamiento */ }
  try { window.dispatchEvent(new CustomEvent('turnoActualizado', { detail: detalle })); } catch { /* sin eventos */ }
  try {
    await api.post('/turnos/llamado', { clinica, accion, turnoId: turno?.id_turno_cod || null, turno: turno || null, ts: Date.now() });
  } catch { /* la TV también se entera por el sondeo */ }
}

// Vuelve a anunciar el turno actual en la TV (solo la misma máquina, sin pasar por el servidor)
export function volverALlamar(clinica) {
  const detalle = { clinica, timestamp: Date.now(), accion: 're-llamar' };
  try { localStorage.setItem('turnoActualizado', JSON.stringify(detalle)); } catch { /* sin almacenamiento */ }
  try { window.dispatchEvent(new CustomEvent('turnoActualizado', { detail: detalle })); } catch { /* sin eventos */ }
}

export const mensajeDeError = (error, porDefecto) =>
  error.response?.data?.message || error.response?.data?.error || porDefecto;

// Foto del paciente de un turno: la ruta que resuelve el backend por afiliación o, si no, el archivo guardado
export function urlFotoDeTurno(turno) {
  const noAfiliacion = turno?.no_afiliacion || turno?.noafiliacion || '';
  if (noAfiliacion) return `/api/foto/${encodeURIComponent(noAfiliacion)}?v=${encodeURIComponent(turno?.id_turno_cod || '1')}`;
  const guardada = turno?.url_foto;
  if (!guardada) return null;
  const s = String(guardada);
  if (s.startsWith('http') || s.startsWith('/api/foto')) return s;
  if (s.startsWith('/fotos/')) return `/api${s}`;
  return `/api/fotos/${encodeURIComponent(s)}`;
}

// Los dos modos de cerrar el turno en atención
export const CIERRE_ABANDONAR = {
  endpoint: '/Gabandonar-turnoT', accion: 'abandonar', exito: 'Turno marcado como abandonado', falla: 'Error al marcar el turno como abandonado',
};
export const CIERRE_FINALIZAR = {
  endpoint: '/Gfinalizar-turnoT', accion: 'finalizar', exito: 'Turno finalizado exitosamente', falla: 'Error al finalizar el turno',
};
