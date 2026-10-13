// Datos de un panel de Estadísticas: GET /api/estadisticas/panel/<nombre> con los filtros dados.
// Mientras recarga conserva los datos anteriores (la pantalla los atenúa) y descarta respuestas viejas.
import { useEffect, useState } from 'react';
import api from '@/config/api';

// Solo los filtros con valor; null = no consultar todavía (p. ej. período personalizado incompleto)
const aParametros = (filtros) => (filtros
  ? Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== null && v !== undefined && v !== ''))
  : null);

export function usePanel(nombre, filtros) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });
  const params = aParametros(filtros);
  const clave = params ? JSON.stringify(params) : null;

  useEffect(() => {
    if (clave === null) return undefined;
    const control = new AbortController();
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    api.get(`/api/estadisticas/panel/${nombre}`, { params: JSON.parse(clave), signal: control.signal })
      .then(({ data }) => setEstado({ datos: data, cargando: false, error: null }))
      .catch((err) => {
        if (control.signal.aborted) return;
        setEstado((e) => ({ ...e, cargando: false, error: err?.response?.data?.error || 'No se pudieron cargar los datos.' }));
      });
    return () => control.abort();
  }, [nombre, clave]);

  return estado;
}
