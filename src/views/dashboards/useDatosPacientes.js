// Datos y filtros del panel "Pacientes" del dashboard.
import { useCallback, useEffect, useState } from 'react';
import api from '@/config/api';
import { aNombreTotal } from './calculos';

const BASE = '/api/estadisticas';

// dimensión -> endpoint, columna descriptiva y parámetro de filtro
const DIMENSIONES = {
  estado: { ruta: 'pacientes-por-estado', campo: 'estado' },
  acceso: { ruta: 'pacientes-por-acceso', campo: 'acceso' },
  sexo: { ruta: 'pacientes-por-sexo', campo: 'sexo' },
  jornada: { ruta: 'pacientes-por-jornada', campo: 'jornada' },
};

const pedirItems = (ruta, params) =>
  api.get(`${BASE}/${ruta}`, { params }).then(({ data }) => data?.items || []).catch(() => []);

export function useDatosPacientes() {
  const [total, setTotal] = useState(0);
  const [cargandoTotal, setCargandoTotal] = useState(true);
  const [programa, setPrograma] = useState({ dentro: 0, fuera: 0 });
  const [cargandoPrograma, setCargandoPrograma] = useState(true);
  const [datos, setDatos] = useState({ estado: [], acceso: [], sexo: [], jornada: [], departamento: [] });
  // Copia sin filtrar: sirve de respaldo cuando el backend no devuelve filas al filtrar
  const [originales, setOriginales] = useState({ estado: [], acceso: [], sexo: [], jornada: [] });
  const [filtros, setFiltros] = useState({ acceso: '', estado: '', jornada: '', sexo: '' });

  useEffect(() => {
    let vivo = true;
    const cargarDimension = async ([clave, { ruta, campo }]) => {
      try {
        const { data } = await api.get(`${BASE}/${ruta}`);
        return [clave, aNombreTotal(data?.items, campo)];
      } catch (e) {
        console.error(`[${ruta}] error:`, e);
        return [clave, []];
      }
    };

    (async () => {
      const [dimensiones, depto, prog, tot] = await Promise.all([
        Promise.all(Object.entries(DIMENSIONES).map(cargarDimension)),
        api.get(`${BASE}/pacientes-por-departamento`).then(({ data }) => aNombreTotal(data?.items, 'departamento', 'size')).catch(() => []),
        api.get(`${BASE}/pacientes-programa-resumen`).then(({ data }) => ({ dentro: Number(data?.dentro || 0), fuera: Number(data?.fuera || 0) })).catch(() => ({ dentro: 0, fuera: 0 })),
        api.get(`${BASE}/pacientes-total`).then(({ data }) => Number(data?.total || 0)).catch(() => 0),
      ]);
      if (!vivo) return;
      const porDimension = Object.fromEntries(dimensiones);
      setDatos({ ...porDimension, departamento: depto });
      setOriginales(porDimension);
      setPrograma(prog);
      setTotal(tot);
      setCargandoPrograma(false);
      setCargandoTotal(false);
    })();
    return () => { vivo = false; };
  }, []);

  const cambiarFiltro = useCallback((clave, valor) => setFiltros((f) => ({ ...f, [clave]: valor })), []);

  const aplicarFiltros = useCallback(async () => {
    const params = {};
    for (const [k, v] of Object.entries(filtros)) if (v) params[k] = v;
    const filtra = (clave) => (filtros[clave]
      ? originales[clave].filter((d) => String(d.name) === String(filtros[clave]))
      : originales[clave]);

    const [resultados, depto] = await Promise.all([
      Promise.all(Object.values(DIMENSIONES).map(({ ruta }) => pedirItems(ruta, params))),
      pedirItems('pacientes-por-departamento', params),
    ]);
    const siguiente = { ...datos };
    Object.keys(DIMENSIONES).forEach((clave, i) => {
      const filas = aNombreTotal(resultados[i], DIMENSIONES[clave].campo);
      // Si la API no devolvió datos, se filtra en el cliente
      siguiente[clave] = filas.length ? filas : filtra(clave);
    });
    if (depto.length) siguiente.departamento = aNombreTotal(depto, 'departamento', 'size');
    setDatos(siguiente);
  }, [filtros, originales, datos]);

  return { total, cargandoTotal, programa, cargandoPrograma, datos, filtros, cambiarFiltro, aplicarFiltros };
}
