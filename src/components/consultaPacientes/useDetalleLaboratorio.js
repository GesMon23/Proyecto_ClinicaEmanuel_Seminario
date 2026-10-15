import { useCallback, useState } from 'react';
import api from '@/config/api';

const SIN_ULTIMOS = { loading: false, error: '', data: [] };

// Detalle de un laboratorio: al abrirlo se cargan los últimos parámetros previos del paciente
export function useDetalleLaboratorio() {
  const [detalle, setDetalle] = useState(null);
  const [ultimos, setUltimos] = useState(SIN_ULTIMOS);

  const abrir = useCallback((item) => {
    setDetalle(item);
    const afiliacion = item?.no_afiliacion || item?.noafiliacion || '';
    if (!afiliacion) return setUltimos(SIN_ULTIMOS);
    setUltimos({ loading: true, error: '', data: [] });
    return api.get(`/laboratorios/${afiliacion}/parametros/ultimo`)
      .then(({ data }) => setUltimos({ loading: false, error: '', data: Array.isArray(data?.data) ? data.data : [] }))
      .catch(() => setUltimos({ loading: false, error: 'No se pudieron cargar los últimos parámetros.', data: [] }));
  }, []);

  const cerrar = useCallback(() => { setDetalle(null); setUltimos(SIN_ULTIMOS); }, []);

  return { detalle, ultimos, abrir, cerrar };
}
