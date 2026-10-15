// Datos y anuncios de la pantalla de llamados (TV): turno en atención de cada clínica, actualizado por eventos
// (SSE del servidor, sondeo de eventos y eventos del navegador) y por una consulta periódica.
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/config/api';
import { CLINICAS_POR_DEFECTO } from './clinicas';
import { anunciarAudioHabilitado, anunciarTurno, precargarVoces } from './voz';

const INTERVALO_TURNOS_MS = 5000;
const INTERVALO_EVENTOS_MS = 2000;
const MAX_LLAMADOS_RECORDADOS = 300;
const MAX_REINTENTOS_PENDIENTE = 20; // ~6 s esperando que el servidor refleje el turno llamado

// "llamar" y "re-llamar" se anuncian siempre; otras acciones solo si cambió el turno
export const accionFuerzaAnuncio = (accion) => accion === 're-llamar' || accion === 'llamar' || !accion;

// ¿Hay que decir el turno en voz alta? (hay turno y, o se fuerza, o es distinto del último anunciado)
export const debeAnunciar = (turno, ultimoId, forzar) => Boolean(turno?.id_turno_cod) && (forzar || turno.id_turno_cod !== ultimoId);

const turnoDeRespuesta = (data) => {
  const t = Array.isArray(data) ? data[0] : data;
  return t?.id_turno_cod ? t : null;
};

// ¿Ya se procesó este llamado? Llega por varias vías (navegador, SSE y sondeo) con el mismo idLlamado.
// Recuerda los últimos MAX_LLAMADOS_RECORDADOS.
export function crearRegistroLlamados(maximo = MAX_LLAMADOS_RECORDADOS) {
  const vistos = new Set();
  return (idLlamado) => {
    if (!idLlamado) return false;
    if (vistos.has(idLlamado)) return true;
    vistos.add(idLlamado);
    if (vistos.size > maximo) vistos.delete(vistos.values().next().value);
    return false;
  };
}

export function useLlamadosTV() {
  const [clinicas, setClinicas] = useState(CLINICAS_POR_DEFECTO);
  const [turnos, setTurnos] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // El navegador solo permite la voz tras una interacción en CADA carga de la página: no se recuerda entre
  // recargas (antes se guardaba y, al recargar, el botón desaparecía pero la voz quedaba bloqueada)
  const [audioHabilitado, setAudioHabilitado] = useState(false);
  const [enVivo, setEnVivo] = useState(false); // conexión en tiempo real con el servidor
  const [pendiente, setPendiente] = useState(null); // clínica con anuncio por hacer

  // Refs: los manejadores de eventos viven todo el ciclo del componente y necesitan valores actuales
  const clinicasRef = useRef(clinicas);
  const audioRef = useRef(audioHabilitado);
  const anunciados = useRef({});   // clínica -> id_turno_cod ya anunciado
  const forzar = useRef({});       // clínica -> anunciar aunque sea el mismo turno
  const ultimoTs = useRef(0);      // hora del SERVIDOR del último evento recibido del servidor
  const yaProcesado = useRef(crearRegistroLlamados());
  const intentosPendiente = useRef(0);
  useEffect(() => { clinicasRef.current = clinicas; }, [clinicas]);
  useEffect(() => { audioRef.current = audioHabilitado; }, [audioHabilitado]);

  const cargarTurnos = useCallback(async () => {
    const lista = clinicasRef.current;
    if (!lista || lista.length === 0) return;
    try {
      const resultados = await Promise.all(lista.map(async (clinica) => {
        try {
          const { data } = await api.get(`/Gturno-actual/${encodeURIComponent(clinica)}`);
          return [clinica, turnoDeRespuesta(data)];
        } catch {
          return [clinica, null];
        }
      }));
      setTurnos(Object.fromEntries(resultados));
      setError(null);
    } catch {
      setError('Error al cargar los turnos');
    } finally {
      setLoading(false);
    }
  }, []);

  const anunciar = useCallback((turno, clinica) => {
    anunciarTurno(turno, clinica);
    anunciados.current[clinica] = turno.id_turno_cod;
    forzar.current[clinica] = false;
  }, []);

  // Clínicas: las del backend, o las de siempre si no responde
  useEffect(() => {
    api.get('/GclinicasT')
      .then(({ data }) => {
        const lista = Array.isArray(data) ? data.map((c) => c.descripcion).filter(Boolean) : [];
        if (lista.length > 0) setClinicas(lista);
      })
      .catch(() => { /* se queda la lista por defecto */ });
    return precargarVoces(() => {});
  }, []);

  useEffect(() => {
    cargarTurnos();
    const intervalo = setInterval(cargarTurnos, INTERVALO_TURNOS_MS);
    return () => clearInterval(intervalo);
  }, [clinicas, cargarTurnos]);

  // Un evento { clinica, accion, idLlamado }: se consulta el turno en atención de la clínica, se muestra y se anuncia.
  // tsServidor: solo para los eventos que vienen del servidor (la hora del navegador no sirve para el sondeo).
  useEffect(() => {
    const procesarEvento = async ({ clinica, accion, idLlamado }, tsServidor = null) => {
      if (!clinica) return;
      if (tsServidor && tsServidor > ultimoTs.current) ultimoTs.current = tsServidor;
      if (yaProcesado.current(idLlamado)) return;
      const fuerza = accionFuerzaAnuncio(accion);

      let turno = null;
      try {
        const { data } = await api.get(`/Gturno-actual/${encodeURIComponent(clinica)}`);
        turno = turnoDeRespuesta(data);
      } catch { /* la consulta periódica lo corrige */ }
      if (turno) setTurnos((prev) => ({ ...prev, [clinica]: turno }));

      if (turno && audioRef.current) {
        if (debeAnunciar(turno, anunciados.current[clinica], fuerza)) anunciar(turno, clinica);
      } else if (fuerza) {
        // Un llamado sin audio (o cuyo turno el servidor aún no refleja): queda pendiente hasta poder anunciarlo.
        // Finalizar/abandonar no dejan nada pendiente (antes se reintentaba cada 300 ms sin fin)
        intentosPendiente.current = 0;
        setPendiente(clinica);
        forzar.current[clinica] = true;
      }
      setTimeout(cargarTurnos, 250);
    };

    // Misma máquina: localStorage (otras pestañas) y evento del navegador (misma pestaña)
    const alCambiarAlmacenamiento = (e) => {
      if (e.key !== 'turnoActualizado') return;
      try {
        const datos = JSON.parse(e.newValue || '{}');
        if (datos?.clinica) procesarEvento(datos);
      } catch { /* evento mal formado */ }
    };
    const alEventoDelNavegador = (ev) => { if (ev?.detail?.clinica) procesarEvento(ev.detail); };

    // Otros equipos: SSE. Si la conexión se corta, el navegador se reconecta solo y el servidor reenvía lo perdido
    // (antes se cerraba al primer error y la TV quedaba dependiendo solo del sondeo)
    let fuente;
    try {
      fuente = new EventSource('/api/turnos/llamado-sse');
      fuente.onopen = () => setEnVivo(true);
      fuente.onerror = () => setEnVivo(false);
      fuente.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data || '{}');
          if (d && d.clinica) procesarEvento(d, Number(d.ts) || null);
        } catch { /* evento mal formado */ }
      };
    } catch { /* sin SSE: queda el sondeo */ }

    // Sondeo de eventos (respaldo del SSE): pide los posteriores al último, con el reloj del servidor
    const sondeo = setInterval(async () => {
      try {
        const desde = ultimoTs.current;
        const { data } = await api.get('/turnos/llamado-events', { params: { since: desde || 0, max: 100 } });
        // La primera vez solo toma la hora del servidor (los llamados anteriores ya están en pantalla)
        if (desde) {
          for (const e of Array.isArray(data?.events) ? data.events : []) await procesarEvento(e, Number(e.ts) || null);
        }
        const ahora = Number(data?.now);
        if (ahora && ahora > ultimoTs.current) ultimoTs.current = ahora;
      } catch { /* se reintenta en el siguiente ciclo */ }
    }, INTERVALO_EVENTOS_MS);

    const alVolverVisible = () => { if (document.visibilityState === 'visible') cargarTurnos(); };
    window.addEventListener('storage', alCambiarAlmacenamiento);
    window.addEventListener('turnoActualizado', alEventoDelNavegador);
    document.addEventListener('visibilitychange', alVolverVisible);
    return () => {
      window.removeEventListener('storage', alCambiarAlmacenamiento);
      window.removeEventListener('turnoActualizado', alEventoDelNavegador);
      document.removeEventListener('visibilitychange', alVolverVisible);
      try { if (fuente) fuente.close(); } catch { /* ya cerrada */ }
      clearInterval(sondeo);
    };
  }, [anunciar, cargarTurnos]);

  // Anuncios pendientes: se hacen cuando hay audio y el turno de la clínica ya llegó
  useEffect(() => {
    if (!pendiente || !audioHabilitado) return undefined;
    const turno = turnos[pendiente];
    if (debeAnunciar(turno, anunciados.current[pendiente], Boolean(forzar.current[pendiente]))) {
      anunciar(turno, pendiente);
      setPendiente(null);
      return undefined;
    }
    // Quizá el servidor aún no refleja el turno: reintentar pronto, unas cuantas veces
    if (intentosPendiente.current >= MAX_REINTENTOS_PENDIENTE) {
      setPendiente(null);
      return undefined;
    }
    intentosPendiente.current += 1;
    const t = setTimeout(cargarTurnos, 300);
    return () => clearTimeout(t);
  }, [pendiente, turnos, audioHabilitado, anunciar, cargarTurnos]);

  // La primera carga no se anuncia: solo se toma nota de lo que ya está en pantalla
  useEffect(() => {
    if (loading) return;
    for (const [clinica, turno] of Object.entries(turnos)) {
      if (turno?.id_turno_cod && !anunciados.current[clinica]) anunciados.current[clinica] = turno.id_turno_cod;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // El navegador exige una interacción antes de permitir la voz: el primer toque, clic o tecla (control remoto)
  // en cualquier parte de la pantalla la habilita
  const turnosRef = useRef(turnos);
  useEffect(() => { turnosRef.current = turnos; }, [turnos]);
  const habilitarAudio = useCallback(() => {
    if (audioRef.current) return;
    audioRef.current = true;
    anunciarAudioHabilitado();
    setAudioHabilitado(true);
    for (const [clinica, turno] of Object.entries(turnosRef.current)) {
      if (debeAnunciar(turno, anunciados.current[clinica], false)) anunciar(turno, clinica);
    }
  }, [anunciar]);

  useEffect(() => {
    if (audioHabilitado) return undefined;
    const eventosUsuario = ['pointerdown', 'keydown', 'touchstart'];
    eventosUsuario.forEach((t) => window.addEventListener(t, habilitarAudio, { once: true }));
    return () => eventosUsuario.forEach((t) => window.removeEventListener(t, habilitarAudio));
  }, [audioHabilitado, habilitarAudio]);

  return { clinicas, turnos, loading, error, audioHabilitado, habilitarAudio, enVivo, recargar: cargarTurnos };
}
