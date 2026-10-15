// Estado y acciones del llamado de turnos de un usuario: clínicas, próximos turnos, turno en atención,
// llamar / abandonar / finalizar. El estado vive en el servidor; se refresca cada 5 segundos.
import { useCallback, useEffect, useState } from 'react';
import api from '@/config/api';
import { CIERRE_ABANDONAR, CIERRE_FINALIZAR, mensajeDeError, notificarTV } from './llamados';

const REFRESCO_MS = 5000;

// avisar(tipo, mensaje): tipo 'success' | 'error'
export function useLlamadoTurnos({ avisar }) {
  const [clinicas, setClinicas] = useState([]);
  const [selectedClinica, setSelectedClinica] = useState(null);
  const [siguientes, setSiguientes] = useState([]);
  const [turnoActivo, setTurnoActivo] = useState(null); // el usuario solo puede tener uno en atención
  const [loading, setLoading] = useState(true);
  const [llamando, setLlamando] = useState(false);

  // Turno en atención del usuario; si el servidor no devuelve ninguno se limpia (evita mostrar turnos que ya no existen)
  const cargarTurnoActual = useCallback(async () => {
    try {
      const { data } = await api.get('/Gturno-actual-usuario', { silenciosa: true });
      setTurnoActivo(data || null);
    } catch (error) {
      if (error.response?.status === 404) setTurnoActivo(null);
      else console.error('Error al cargar el turno actual:', error);
    }
  }, []);

  // Próximos turnos: Asignada y aún sin llamar (uno llamado por otro usuario deja de aparecer)
  const cargarSiguientes = useCallback(async (clinica) => {
    if (!clinica) return;
    try {
      const { data } = await api.get(`/Gsiguientes-turnosT/${encodeURIComponent(clinica)}`, { silenciosa: true });
      setSiguientes(Array.isArray(data?.turnos) ? data.turnos : []);
    } catch (error) {
      console.error('Error al cargar los siguientes turnos:', error);
      setSiguientes([]);
    }
  }, []);

  const refrescar = useCallback((clinica) => Promise.all([cargarTurnoActual(), cargarSiguientes(clinica)]), [cargarTurnoActual, cargarSiguientes]);

  // Carga inicial: el estado de los turnos vive en el servidor, se descarta cualquier copia vieja del navegador
  useEffect(() => {
    try { localStorage.removeItem('clinicasData'); localStorage.removeItem('turnoLlamado'); } catch { /* sin almacenamiento */ }
    // Solo las clínicas asignadas al usuario para el llamado (todas si nadie lo restringió)
    api.get('/turnos/clinicas/llamado')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setClinicas(data);
          setSelectedClinica(data[0].descripcion);
        }
      })
      .catch((error) => {
        console.error('Error al cargar las clínicas:', error);
        avisar('error', 'Error al cargar las clínicas');
      })
      .finally(() => setLoading(false));
  }, [avisar]);

  useEffect(() => {
    if (!selectedClinica) return undefined;
    refrescar(selectedClinica);
    const id = setInterval(() => refrescar(selectedClinica), REFRESCO_MS);
    return () => clearInterval(id);
  }, [selectedClinica, refrescar]);

  const llamar = async (clinica = selectedClinica) => {
    if (!clinica) return avisar('error', 'No se ha seleccionado una clínica');
    if (turnoActivo) return avisar('error', 'Ya tienes un paciente en atención. Finalízalo o márcalo como abandonado antes de llamar a otro.');
    try {
      setLlamando(true);
      // Siguiente turno Asignada de la clínica que nadie ha llamado todavía
      const { data } = await api.get(`/Gsiguiente-turnoT/${clinica}`);
      const turno = (Array.isArray(data) ? data : [data])[0];
      if (!turno) {
        setSiguientes([]);
        return avisar('error', 'No hay turnos pendientes para esta clínica');
      }
      // El servidor registra al usuario que llama y rechaza el llamado si otro usuario se adelantó
      const llamado = await api.put(`/Gactualizar-estado-llamadoT/${turno.id_turno_cod}`);
      await notificarTV(clinica, 'llamar', llamado.data?.turno || turno);
      await refrescar(clinica);
      avisar('success', 'Turno llamado exitosamente');
    } catch (error) {
      avisar('error', error.response?.status === 404
        ? 'No hay turnos pendientes para esta clínica'
        : mensajeDeError(error, `No se pudo llamar un turno de la clínica ${clinica}`));
      await refrescar(clinica);
    } finally {
      setLlamando(false);
    }
  };

  // Cierra el turno que el usuario tiene en atención (finalizar o abandonar)
  const cerrar = async (clinica, { endpoint, accion, exito, falla }) => {
    const turno = turnoActivo;
    if (!clinica || !turno || turno.nombre_clinica !== clinica) return avisar('error', 'No hay un turno en atención para esta clínica');
    try {
      const { data } = await api.put(`${endpoint}/${turno.id_turno_cod}`);
      if (!(data && data.success)) throw new Error(data?.message || 'Error al actualizar el estado del turno');
      await notificarTV(clinica, accion);
      await refrescar(clinica);
      avisar('success', data.message || exito);
    } catch (error) {
      console.error(falla, error);
      avisar('error', `${falla}: ${mensajeDeError(error, error.message)}`);
      await cargarTurnoActual();
    }
  };

  return {
    clinicas, selectedClinica, seleccionar: setSelectedClinica, siguientes, turnoActivo, loading, llamando,
    llamar,
    abandonar: (clinica = selectedClinica) => cerrar(clinica, CIERRE_ABANDONAR),
    finalizar: (clinica = selectedClinica) => cerrar(clinica, CIERRE_FINALIZAR),
  };
}
