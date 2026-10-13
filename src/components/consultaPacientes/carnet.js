// Descarga del carné PDF del paciente (lo genera el backend en /carnet/forzar/:noafiliacion; exige sesión).
import { descargarArchivo } from '@/config/api';

// Lanza un Error si no se pudo descargar
export function descargarCarnet(noAfiliacion) {
  return descargarArchivo(`/carnet/forzar/${encodeURIComponent(noAfiliacion)}`, `carnet_${noAfiliacion}.pdf`);
}
