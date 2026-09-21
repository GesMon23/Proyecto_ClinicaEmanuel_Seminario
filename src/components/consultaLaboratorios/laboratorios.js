// Consulta de laboratorios (sin React).
import api from '@/config/api';

export async function cargarCatalogos() {
  try {
    const { data } = await api.get('/api/laboratorios/catalogos');
    return { periodicidades: data?.periodicidades || [], sexos: data?.sexos || [] };
  } catch {
    return { periodicidades: [], sexos: [] };
  }
}

// Historial de laboratorios con los filtros indicados; lanza Error con el mensaje para el usuario si falla
export async function consultarHistorial({ desde, hasta, noAfiliacion, idLaboratorio, sexo, periodicidad }) {
  const params = {};
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  if (noAfiliacion) params.noafiliacion = noAfiliacion;
  if (idLaboratorio) params.idlaboratorio = idLaboratorio;
  if (sexo) params.sexo = sexo;
  if (periodicidad) params.periodicidad = periodicidad;
  let data;
  try {
    ({ data } = await api.get('/api/laboratorios/historial', { params }));
  } catch {
    throw new Error('Error al consultar el historial.');
  }
  if (!data?.success) throw new Error(data?.message || 'No se pudo obtener el historial.');
  return data.data || [];
}

export const FILTROS_VACIOS = { desde: '', hasta: '', noAfiliacion: '', idLaboratorio: '', sexo: '', periodicidad: '' };
