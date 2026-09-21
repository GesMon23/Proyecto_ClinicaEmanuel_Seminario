// Datos y filtros del panel "Psicología": las gráficas generales y los resultados KDQOL tienen filtros independientes.
import { useCallback, useEffect, useState } from 'react';
import api from '@/config/api';

const BASE = '/api/estadisticas';

// endpoint -> columna descriptiva de cada gráfica
const GENERALES = {
  tipo: ['psicologia-por-tipo', 'tipo'],
  atencion: ['psicologia-por-atencion', 'atencion'],
  pronostico: ['psicologia-por-pronostico', 'pronostico'],
  sexo: ['psicologia-por-sexo', 'sexo'],
  jornada: ['psicologia-por-jornada', 'jornada'],
};
const KDQOL = {
  jornada: ['psicologia-kdqol-por-jornada', 'jornada'],
  sexo: ['psicologia-kdqol-por-sexo', 'sexo'],
};

const SIN_PROMEDIOS = { fisico: null, mental: null, sintomas: null, carga: null, efectos: null, global: null };
const FILTROS_VACIOS = { desde: '', hasta: '', sexo: '' };

const numeroONulo = (v) => (v != null ? Number(v) : null);

async function cargarLista([ruta, campo], params) {
  try {
    const { data } = await api.get(`${BASE}/${ruta}`, { params });
    return (data?.items || []).map((i) => ({ name: i[campo], total: i.total }));
  } catch {
    return [];
  }
}

// El rango de fechas solo cuenta si están las dos
function aParametros({ desde, hasta, sexo }) {
  const params = {};
  if (desde && hasta) { params.desde = desde; params.hasta = hasta; }
  if (sexo) params.sexo = sexo;
  return params;
}

function useFiltros() {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const cambiar = useCallback((clave, valor) => setFiltros((f) => ({ ...f, [clave]: valor })), []);
  return [filtros, cambiar];
}

export function useDatosPsicologia() {
  const [generales, setGenerales] = useState({ tipo: [], atencion: [], pronostico: [], sexo: [], jornada: [] });
  const [kdqol, setKdqol] = useState({ total: 0, promedios: SIN_PROMEDIOS, jornada: [], sexo: [] });
  const [filtros, cambiarFiltro] = useFiltros();
  const [filtrosKdqol, cambiarFiltroKdqol] = useFiltros();

  const cargarGenerales = useCallback(async (params) => {
    const claves = Object.keys(GENERALES);
    const listas = await Promise.all(claves.map((k) => cargarLista(GENERALES[k], params)));
    setGenerales(Object.fromEntries(claves.map((k, i) => [k, listas[i]])));
  }, []);

  const cargarKdqol = useCallback(async (params) => {
    const [total, promedios, jornada, sexo] = await Promise.all([
      api.get(`${BASE}/psicologia-kdqol-total`, { params }).then(({ data }) => Number(data?.total || 0)).catch(() => 0),
      api.get(`${BASE}/psicologia-kdqol-promedios`, { params }).then(({ data }) => {
        const p = data?.promedios || {};
        return Object.fromEntries(Object.keys(SIN_PROMEDIOS).map((k) => [k, numeroONulo(p[k])]));
      }).catch(() => SIN_PROMEDIOS),
      cargarLista(KDQOL.jornada, params),
      cargarLista(KDQOL.sexo, params),
    ]);
    setKdqol({ total, promedios, jornada, sexo });
  }, []);

  useEffect(() => {
    cargarGenerales({});
    cargarKdqol({});
  }, [cargarGenerales, cargarKdqol]);

  return {
    generales, kdqol,
    filtros, cambiarFiltro, aplicarFiltros: () => cargarGenerales(aParametros(filtros)),
    filtrosKdqol, cambiarFiltroKdqol, aplicarFiltrosKdqol: () => cargarKdqol(aParametros(filtrosKdqol)),
  };
}
