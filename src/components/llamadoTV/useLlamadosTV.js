// Datos y anuncios de la pantalla de llamados (TV): turno en atención de cada clínica, actualizado por eventos
// (SSE del servidor, sondeo de eventos y eventos del navegador) y por una consulta periódica.
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/config/api';
import { CLINICAS_POR_DEFECTO } from './clinicas';
import { anunciarAudioHabilitado, anunciarTurno, precargarVoces } from './voz';

const CLAVE_AUDIO = 'tvAudioEnabled';
const INTERVALO_TURNOS_MS = 5000;
const INTERVALO_EVENTOS_MS = 2000;

// "llamar" y "re-llamar" se anuncian siempre; otras acciones solo si cambió el turno
export const accionFuerzaAnuncio = (accion) => accion === 're-llamar' || accion === 'llamar' || !accion;

// ¿Hay que decir el turno en voz alta? (hay turno y, o se fuerza, o es distinto del último anunciado)
export const debeAnunciar = (turno, ultimoId, forzar) => Boolean(turno?.id_turno_cod) && (forzar || turno.id_turno_cod !== ultimoId);

const turnoDeRespuesta = (data) => {
  const t = Array.isArray(data) ? data[0] : data;
  return t?.id_turno_cod ? t : null;
};

function leerAudioGuardado() {
  try { return localStorage.getItem(CLAVE_AUDIO) === '1'; } catch { return false; }
}

export function useLlamadosTV() {
  const [clinicas, setClinicas] = useState(CLINICAS_POR_DEFECTO);
  const [turnos, setTurnos] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [audioHabilitado, setAudioHabilitado] = useState(leerAudioGuardado);
  const [pendiente, setPendiente] = useState(null); // clínica con anuncio por hacer

  // Refs: los manejadores de eventos viven todo el ciclo del componente y necesitan valores actuales
  const clinicasRef = useRef(clinicas);
  const audioRef = useRef(audioHabilitado);
  const anunciados = useRef({});   // clínica -> id_turno_cod ya anunciado
  const forzar = useRef({});       // clínica -> anunciar aunque sea el mismo turno
  const ultimoTs = useRef(0);      // último evento procesado
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

  // Un evento { clinica, accion, ts, turno? }: se muestra y anuncia el turno; si el evento no lo trae se consulta el servidor
  useEffect(() => {
    const procesarEvento = async (clinica, accion, ts, turnoEvento = null) => {
      if (!clinica) return;
      const fuerza = accionFuerzaAnuncio(accion);
      if (ts && ts > ultimoTs.current) ultimoTs.current = ts;

      let turno = turnoEvento?.id_turno_cod ? turnoEvento : null;
      if (!turno) {
        try {
          const { data } = await api.get(`/Gturno-actual/${encodeURIComponent(clinica)}`);
          turno = turnoDeRespuesta(data);
        } catch { /* la consulta periódica lo corrige */ }
      }
      if (turno) setTurnos((prev) => ({ ...prev, [clinica]: turno }));

      if (turno && audioRef.current) {
        if (debeAnunciar(turno, anunciados.current[clinica], fuerza)) anunciar(turno, clinica);
      } else {
        // Sin audio (o sin turno todavía): queda pendiente hasta que se pueda anunciar
        setPendiente(clinica);
        if (fuerza) forzar.current[clinica] = true;
      }
      setTimeout(cargarTurnos, 250);
    };

    const alCambiarAlmacenamiento = (e) => {
      if (e.key !== 'turnoActualizado') return;
      try {
        const datos = JSON.parse(e.newValue || '{}');
        if (datos?.clinica) procesarEvento(datos.clinica, datos.accion, Date.now());
      } catch { /* evento mal formado */ }
    };
    const alEventoDelNavegador = (ev) => {
      const clinica = ev?.detail?.clinica;
      if (clinica) procesarEvento(clinica, ev.detail.accion, Date.now());
    };

    // Suscripción SSE: eventos de otros dispositivos
    let fuente;
    try {
      fuente = new EventSource('/api/turnos/llamado-sse');
      fuente.onerror = () => { try { fuente.close(); } catch { /* ya cerrada */ } };
      fuente.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data || '{}');
          if (d && d.clinica) procesarEvento(d.clinica, d.accion, Number(d.ts) || Date.now(), d.turno || null);
        } catch { /* evento mal formado */ }
      };
    } catch { /* sin SSE: queda el sondeo */ }

    // Sondeo de eventos (complementa al SSE; pide solo los posteriores al último procesado)
    const sondeo = setInterval(async () => {
      try {
        const { data } = await api.get('/turnos/llamado-events', { params: { since: ultimoTs.current || 0, max: 100 } });
        for (const e of Array.isArray(data?.events) ? data.events : []) {
          await procesarEvento(e.clinica, e.accion, Number(e.ts) || Date.now(), e.turno || null);
        }
        const ahora = Number(data?.now) || Date.now();
        if (ahora > ultimoTs.current) ultimoTs.current = ahora;
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
    // Quizá el servidor aún no refleja el turno: reintentar pronto
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

  // El navegador exige un clic antes de permitir audio
  const habilitarAudio = () => {
    anunciarAudioHabilitado();
    setAudioHabilitado(true);
    try { localStorage.setItem(CLAVE_AUDIO, '1'); } catch { /* sin almacenamiento */ }
    for (const [clinica, turno] of Object.entries(turnos)) {
      if (debeAnunciar(turno, anunciados.current[clinica], false)) anunciar(turno, clinica);
    }
  };

  return { clinicas, turnos, loading, error, audioHabilitado, habilitarAudio, recargar: cargarTurnos };
}
