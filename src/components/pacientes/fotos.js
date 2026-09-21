// Foto de un paciente en las pantallas de gestión (Egreso, Reingreso, ...).
import api from '@/config/api';

export const baseURL = () => (api?.defaults?.baseURL || '').replace(/\/$/, '');

// Nombre real del archivo de foto: primero lo que confirma el backend (/check-photo) y, si no,
// el nombre guardado en la base de datos. null si no hay foto.
export async function resolverArchivoFoto(noAfiliacion, guardada) {
  if (noAfiliacion) {
    try {
      const { data } = await api.get(`/check-photo/${encodeURIComponent(noAfiliacion)}`);
      if (data?.exists && data?.filename) return data.filename;
    } catch { /* se prueba con el nombre guardado */ }
  }
  if (guardada) return String(guardada).replace(/^.*[\\/]/, '');
  return null;
}
