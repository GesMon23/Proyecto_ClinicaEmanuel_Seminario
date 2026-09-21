// Datos y filtros del panel "Nutrición" del dashboard.
import { useCallback, useEffect, useState } from 'react';
import api from '@/config/api';
import { nombreSexo, promedioPonderado, rangoPorDefecto, sumar } from './calculos';

const BASE = '/api/estadisticas';

const pedir = (ruta, params) => api.get(`${BASE}/${ruta}`, { params }).then(({ data }) => data?.items || []).catch(() => []);

export function useDatosNutricion() {
  const [estados, setEstados] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [sexos, setSexos] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', sexo: '', motivo: '' });
  const [aplicados, setAplicados] = useState(filtros);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState(null);

  // Sin fechas se usa el rango por defecto (últimos 90 días)
  const cargar = useCallback(async (f) => {
    const params = { ...rangoPorDefecto() };
    if (f.desde) params.desde = f.desde;
    if (f.hasta) params.hasta = f.hasta;
    if (f.sexo) params.sexo = f.sexo;
    if (f.motivo) params.motivo = f.motivo;
    const [tipo, jornada, sexo, motivo] = await Promise.all([
      pedir('nutricion-por-tipo', params),
      pedir('nutricion-por-jornada', params),
      pedir('nutricion-por-sexo', params),
      pedir('nutricion-por-motivo', params),
    ]);
    setEstados(tipo.map((i) => ({
      name: i.estado, total: i.total, imc_promedio: i.imc_promedio, peso_promedio: i.peso_promedio, altura_promedio: i.altura_promedio,
    })));
    setJornadas(jornada.map((x) => ({ name: x.jornada, total: x.total })));
    setSexos(sexo.map((x) => ({ name: nombreSexo(x.sexo), total: x.total })));
    setMotivos(motivo.map((x) => ({ name: x.motivo, total: x.total })));
  }, []);

  // Carga inicial y recarga automática al cambiar sexo o motivo; las fechas esperan al botón "Aplicar"
  useEffect(() => { cargar(aplicados); }, [aplicados, cargar]);
  useEffect(() => {
    setAplicados((a) => (a.sexo === filtros.sexo && a.motivo === filtros.motivo ? a : { ...a, sexo: filtros.sexo, motivo: filtros.motivo }));
  }, [filtros.sexo, filtros.motivo]);

  const cambiarFiltro = useCallback((clave, valor) => setFiltros((f) => ({ ...f, [clave]: valor })), []);
  const aplicarFiltros = useCallback(() => setAplicados({ ...filtros }), [filtros]);
  const alternarEstado = useCallback((nombre) => setEstadoSeleccionado((actual) => (actual === nombre ? null : nombre)), []);

  const total = sumar(estados, 'total');
  return {
    estados, jornadas, sexos, motivos, filtros, cambiarFiltro, aplicarFiltros, estadoSeleccionado, alternarEstado,
    total,
    imcPromedio: promedioPonderado(estados, 'imc_promedio'),
    pesoPromedio: promedioPonderado(estados, 'peso_promedio'),
    alturaPromedio: promedioPonderado(estados, 'altura_promedio'),
  };
}
