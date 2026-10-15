// Estado del registro de resultados de laboratorio de un paciente.
import { useState } from 'react';
import {
  PARAMETROS_BASE, armarLaboratorio, buscarPaciente, cargarUltimosParametros, combinarUltimos, esParametroBase,
  guardarLaboratorio, parametrosAEnviar, problemaDelFormulario,
} from './parametros';

const OTRO = { valores: {}, bloqueados: {}, fechas: {}, originales: {} };

// mostrarAviso(tipo, titulo, mensaje)
export function useLaboratorio({ mostrarAviso, alGuardar }) {
  const [noAfiliacion, setNoAfiliacion] = useState('');
  const [paciente, setPaciente] = useState(null);
  const [error, setError] = useState('');
  const [valores, setValores] = useState(OTRO.valores);
  const [bloqueados, setBloqueados] = useState(OTRO.bloqueados);   // parámetros de solo lectura (vienen del historial)
  const [fechas, setFechas] = useState(OTRO.fechas);               // parámetro -> fecha del laboratorio de origen
  const [originales, setOriginales] = useState(OTRO.originales);   // valores del último laboratorio, para enviar solo lo que cambió
  const [parametros, setParametros] = useState(PARAMETROS_BASE);
  const [guardando, setGuardando] = useState(false);

  // Vuelve al estado inicial (los parámetros agregados a mano solo valen para el paciente actual)
  const reiniciar = () => {
    setNoAfiliacion('');
    setPaciente(null);
    setError('');
    setValores(OTRO.valores);
    setBloqueados(OTRO.bloqueados);
    setFechas(OTRO.fechas);
    setOriginales(OTRO.originales);
    setParametros(PARAMETROS_BASE);
  };

  // Rellena los parámetros con los del último laboratorio del paciente (bloqueados hasta "Actualizar")
  const cargarUltimos = async (afiliacion, actuales = parametros) => {
    if (!afiliacion) return;
    try {
      const ultimos = await cargarUltimosParametros(afiliacion);
      if (ultimos.length === 0) return;
      const r = combinarUltimos(actuales, ultimos);
      if (r.nuevos.length) setParametros([...actuales, ...r.nuevos]);
      setValores((v) => ({ ...v, ...r.valores }));
      setBloqueados((b) => ({ ...b, ...r.bloqueados }));
      setFechas((f) => ({ ...f, ...r.fechas }));
      setOriginales((o) => ({ ...o, ...r.originales }));
    } catch (e) {
      console.error('No se pudieron cargar los parámetros del último laboratorio:', e);
    }
  };

  const buscar = async () => {
    setError('');
    setPaciente(null);
    if (!noAfiliacion) return setError('Ingrese un número de afiliación.');
    const r = await buscarPaciente(noAfiliacion);
    if (r.mensaje) {
      if (r.modal) mostrarAviso('error', r.titulo, r.mensaje);
      else setError(r.mensaje);
      return;
    }
    setPaciente(r.nombre);
    setParametros(PARAMETROS_BASE);
    await cargarUltimos(noAfiliacion, PARAMETROS_BASE);
  };

  // Marcar "examen realizado: Sí" trae los últimos parámetros del paciente
  const cambiar = (campo, valor) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    if (campo === 'examen_realizado' && valor === 'Sí' && noAfiliacion) cargarUltimos(noAfiliacion);
  };

  const agregarParametro = (nombre) => {
    if (nombre.trim() === '') return false;
    setParametros((prev) => [...prev, { label: nombre, param: nombre }]);
    return true;
  };
  const eliminarParametro = (param) => setParametros((prev) => prev.filter((p) => p.param !== param));
  const bloquear = (param, valor) => setBloqueados((b) => ({ ...b, [param]: valor }));
  const restaurar = (param) => {
    setValores((v) => ({ ...v, [param]: (originales[param] ?? '').toString() }));
    bloquear(param, true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    const problema = problemaDelFormulario(valores, noAfiliacion);
    if (problema) return setError(problema);
    try {
      setGuardando(true);
      await guardarLaboratorio(armarLaboratorio(noAfiliacion, valores, parametrosAEnviar(parametros, valores, originales)));
      mostrarAviso('success', 'Éxito', 'Registro de laboratorio guardado correctamente.');
      alGuardar?.(noAfiliacion, valores);
      reiniciar();
    } catch (err) {
      const detalle = err?.response?.data?.error || err?.response?.data?.message || err?.message;
      console.error('Error guardando laboratorio:', err);
      setError(`No se pudo guardar el registro de laboratorio${detalle ? `: ${detalle}` : '.'}`);
    } finally {
      setGuardando(false);
    }
  };

  return {
    noAfiliacion, setNoAfiliacion, paciente, error, valores, bloqueados, fechas, parametros, guardando,
    buscar, limpiar: reiniciar, cambiar, guardar,
    agregarParametro, eliminarParametro, bloquear, restaurar,
    esExtra: (param) => !esParametroBase(param),
  };
}
