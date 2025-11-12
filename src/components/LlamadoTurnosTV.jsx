import React, { useState, useEffect, useRef } from 'react';

import api from '../config/api';
import logoClinica from "@/assets/logoClinica1Min.png";
import { 
  RefreshCw,
  HeartPulse,
  Brain,
  Apple,
  Clock as ClockIcon,
  AlertTriangle as ExclamationTriangleIcon,
  Hash,
  User,
  Calendar
} from "lucide-react";

// Mapeo de clínicas a iconos y colores
const clinicaConfig = {
  'Hemodialisis': {
    icon: HeartPulse,
    color: 'bg-green-50',
    borderColor: 'border-green-500',
    iconColor: 'text-green-600',
    textColor: 'text-green-900',
    badgeColor: 'bg-green-100 text-green-800'
  },
  'Nutrición': {
    icon: Apple,
    color: 'bg-green-50',
    borderColor: 'border-green-600',
    iconColor: 'text-green-700',
    textColor: 'text-green-900',
    badgeColor: 'bg-green-100 text-green-800'
  },
  'Psicología': {
    icon: Brain,
    color: 'bg-teal-50',
    borderColor: 'border-teal-600',
    iconColor: 'text-teal-700',
    textColor: 'text-teal-900',
    badgeColor: 'bg-teal-100 text-teal-800'
  }
};

const LlamadoTurnosTV = () => {
    const [turnosActuales, setTurnosActuales] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [horaActual, setHoraActual] = useState(new Date());
    const [pendienteAnunciarClinica, setPendienteAnunciarClinica] = useState(null);
    const [audioHabilitado, setAudioHabilitado] = useState(() => {
        try { return localStorage.getItem('tvAudioEnabled') === '1'; } catch { return false; }
    });
    const [vocesCargadas, setVocesCargadas] = useState(false);
    const ultimosAnunciadosRef = useRef({}); // { [clinica]: id_turno_cod }
    const audioHabilitadoRef = useRef(audioHabilitado);
    const forzarClinicaRef = useRef({}); // { [clinica]: true }
    const [sseConectado, setSseConectado] = useState(false);
    const sseConectadoRef = useRef(false);
    const ultimoEventoTsRef = useRef(0);

    // Lista de clínicas a mostrar (se intentará cargar del backend)
    const [clinicas, setClinicas] = useState(['Hemodialisis', 'Nutrición', 'Psicología']);

    const cargarTurnos = async () => {
        try {
            if (!clinicas || clinicas.length === 0) return;
            const resultados = await Promise.all(
                clinicas.map(async (clinica) => {
                    try {
                        const response = await api.get(`/Gturno-actual/${encodeURIComponent(clinica)}`);
                        if (response && response.data) {
                            const data = Array.isArray(response.data) ? response.data[0] : response.data;
                            return { clinica, turno: data?.id_turno_cod ? data : null };
                        }
                        return { clinica, turno: null };
                    } catch (error) {
                        return { clinica, turno: null };
                    }
                })
            );

            const nuevosTurnos = {};
            // Intentar usar API; si no hay, usar localStorage como respaldo
            let savedLS = null;
            try {
                const saved = localStorage.getItem('clinicasData');
                savedLS = saved ? JSON.parse(saved) : null;
            } catch {}
            resultados.forEach(({ clinica, turno }) => {
                if (turno && turno.id_turno_cod) {
                    nuevosTurnos[clinica] = turno;
                } else {
                    const turnoLS = savedLS?.[clinica]?.turnoLlamado;
                    nuevosTurnos[clinica] = turnoLS?.id_turno_cod ? turnoLS : null;
                }
            });

            setTurnosActuales(nuevosTurnos);
            setError(null);
        } catch (err) {
            setError('Error al cargar los turnos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const cargarClinicas = async () => {
            try {
                const res = await api.get('/GclinicasT');
                const lista = Array.isArray(res.data) ? res.data.map(c => c.descripcion).filter(Boolean) : [];
                if (lista.length > 0) setClinicas(lista);
            } catch (_) {
                // mantener lista por defecto
            }
        };
        cargarClinicas();
    }, []);

    // Mantener ref sincronizada con el estado de audio
    useEffect(() => {
        audioHabilitadoRef.current = audioHabilitado;
    }, [audioHabilitado]);

    useEffect(() => {
        cargarTurnos();
        const intervalo = setInterval(cargarTurnos, 5000);
        return () => clearInterval(intervalo);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clinicas]);

    useEffect(() => {
        const intervalo = setInterval(() => setHoraActual(new Date()), 1000);
        return () => clearInterval(intervalo);
    }, []);

    // Hablar utilitario
    const hablarTurno = (turno, clinica) => {
        if (!turno) return;
        const mensajeVoz = `Paciente ${turno.nombrepaciente || ''} con el número de afiliación ${turno.no_afiliacion || ''} presentarse en recepción para la clínica ${clinica}.`;
        if ('speechSynthesis' in window) {
            try {
                // Intentar reanudar por si el motor quedó en pausa
                try { window.speechSynthesis.resume(); } catch (_) {}
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(mensajeVoz);
                utter.rate = 0.8;
                utter.pitch = 1;
                const voces = window.speechSynthesis.getVoices();
                const vozEs = voces.find(v => v.lang?.startsWith('es') || v.name?.toLowerCase().includes('spanish'));
                if (vozEs) utter.voice = vozEs;
                window.speechSynthesis.speak(utter);
            } catch (_) {}
        }
    };

    // Inicializar voces
    useEffect(() => {
        if (!('speechSynthesis' in window)) return;
        const handleVoices = () => setVocesCargadas(true);
        window.speechSynthesis.onvoiceschanged = handleVoices;
        // Forzar carga de voces
        const _ = window.speechSynthesis.getVoices();
        setTimeout(() => setVocesCargadas(true), 500);
        return () => { try { window.speechSynthesis.onvoiceschanged = null; } catch {} };
    }, []);

    const habilitarAudio = () => {
        try {
            // Reproducir un aviso corto para registrar la interacción
            if ('speechSynthesis' in window) {
                try { window.speechSynthesis.resume(); } catch (_) {}
                const utter = new SpeechSynthesisUtterance('Audio habilitado');
                utter.rate = 1; utter.pitch = 1;
                const voces = window.speechSynthesis.getVoices();
                const vozEs = voces.find(v => v.lang?.startsWith('es') || v.name?.toLowerCase().includes('spanish'));
                if (vozEs) utter.voice = vozEs;
                window.speechSynthesis.speak(utter);
            }
            setAudioHabilitado(true);
            localStorage.setItem('tvAudioEnabled', '1');
            // Anunciar inmediatamente cualquier turno actual visible
            try {
                Object.entries(turnosActuales || {}).forEach(([clinica, turno]) => {
                    const ultimo = ultimosAnunciadosRef.current[clinica];
                    if (turno?.id_turno_cod && turno.id_turno_cod !== ultimo) {
                        hablarTurno(turno, clinica);
                        ultimosAnunciadosRef.current[clinica] = turno.id_turno_cod;
                    }
                });
            } catch {}
        } catch {}
    };

    // Sincronización por eventos para anunciar nuevo turno
    useEffect(() => {
        // Helper común para procesar un evento { clinica, accion }
        const procesarEvento = (clinica, accion, ts) => {
            if (!clinica) return;
            const force = accion === 're-llamar' || accion === 'llamar' || !accion;
            try {
                const saved = localStorage.getItem('clinicasData');
                const parsed = saved ? JSON.parse(saved) : {};
                const turnoLS = parsed?.[clinica]?.turnoLlamado;
                // Actualizar visual inmediatamente con lo que haya en localStorage
                if (turnoLS?.id_turno_cod) {
                    setTurnosActuales(prev => ({ ...prev, [clinica]: turnoLS }));
                }
                if (turnoLS?.id_turno_cod && audioHabilitadoRef.current) {
                    const ultimo = ultimosAnunciadosRef.current[clinica];
                    if (force || turnoLS.id_turno_cod !== ultimo) {
                        hablarTurno(turnoLS, clinica);
                        ultimosAnunciadosRef.current[clinica] = turnoLS.id_turno_cod;
                    }
                } else {
                    setPendienteAnunciarClinica(clinica);
                    if (force) {
                        forzarClinicaRef.current[clinica] = true;
                    }
                    // Consulta inmediata al backend para esa clínica para obtener datos frescos
                    (async () => {
                        try {
                            const resp = await api.get(`/Gturno-actual/${encodeURIComponent(clinica)}`);
                            const data = Array.isArray(resp.data) ? resp.data[0] : resp.data;
                            const turno = data?.id_turno_cod ? data : null;
                            if (turno) {
                                setTurnosActuales(prev => ({ ...prev, [clinica]: turno }));
                                if (audioHabilitadoRef.current) {
                                    const ultimo = ultimosAnunciadosRef.current[clinica];
                                    if (force || turno.id_turno_cod !== ultimo) {
                                        hablarTurno(turno, clinica);
                                        ultimosAnunciadosRef.current[clinica] = turno.id_turno_cod;
                                        forzarClinicaRef.current[clinica] = false;
                                        setPendienteAnunciarClinica(null);
                                    }
                                }
                            }
                        } catch (_) { /* noop */ }
                    })();
                }
            } catch (_) {
                setPendienteAnunciarClinica(clinica);
                if (force) {
                    forzarClinicaRef.current[clinica] = true;
                }
            }
            if (ts && ts > (ultimoEventoTsRef.current || 0)) {
                ultimoEventoTsRef.current = ts;
            }
            setTimeout(cargarTurnos, 250);
        };

        const handleStorageChange = (e) => {
            if (e.key === 'turnoActualizado') {
                try {
                    const data = JSON.parse(e.newValue || '{}');
                    if (data?.clinica) {
                        const clinica = data.clinica;
                        const accion = data?.accion;
                        procesarEvento(clinica, accion, Date.now());
                    }
                } catch (_) {}
                // Pequeño retraso para dar tiempo a que el backend refleje el cambio
                setTimeout(cargarTurnos, 250);
            }
        };
        const handleCustomEvent = (ev) => {
            const c = ev?.detail?.clinica;
            if (c) {
                const accion = ev?.detail?.accion;
                procesarEvento(c, accion, Date.now());
            }
            setTimeout(cargarTurnos, 250);
        };
        // Suscripción SSE multi-dispositivo
        let es;
        try {
            es = new EventSource('/api/turnos/llamado-sse');
            es.onopen = () => { setSseConectado(true); sseConectadoRef.current = true; };
            es.onerror = () => { setSseConectado(false); sseConectadoRef.current = false; try { es.close(); } catch {} };
            es.onmessage = (ev) => {
                try {
                    const data = JSON.parse(ev.data || '{}');
                    if (data && data.clinica) {
                        procesarEvento(data.clinica, data.accion, Number(data.ts) || Date.now());
                    }
                } catch (_) {}
            };
        } catch (_) { setSseConectado(false); sseConectadoRef.current = false; }

        // Polling periódico (si hay SSE también, no afecta)
        const poll = setInterval(async () => {
            try {
                const since = ultimoEventoTsRef.current || 0;
                const res = await api.get('/turnos/llamado-events', { params: { since, max: 100 } });
                const events = res?.data?.events || [];
                if (Array.isArray(events) && events.length > 0) {
                    for (const e of events) {
                        procesarEvento(e.clinica, e.accion, Number(e.ts) || Date.now());
                    }
                }
                const now = Number(res?.data?.now) || Date.now();
                if (now > (ultimoEventoTsRef.current || 0)) {
                    ultimoEventoTsRef.current = now;
                }
            } catch (_) { /* noop */ }
        }, 2000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') cargarTurnos();
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('turnoActualizado', handleCustomEvent);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('turnoActualizado', handleCustomEvent);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            try { if (es) es.close(); } catch {}
            clearInterval(poll);
        };
    }, []);

    // Anunciar cuando haya clínica pendiente y turno cambió
    useEffect(() => {
        if (!pendienteAnunciarClinica) return;
        if (!audioHabilitado) return; // esperar a que el usuario habilite audio
        const clinica = pendienteAnunciarClinica;
        const turno = turnosActuales[clinica];
        const ultimo = ultimosAnunciadosRef.current[clinica];
        const force = !!forzarClinicaRef.current[clinica];
        let didSpeak = false;
        if (turno?.id_turno_cod && (force || turno.id_turno_cod !== ultimo)) {
            hablarTurno(turno, clinica);
            ultimosAnunciadosRef.current[clinica] = turno.id_turno_cod;
            didSpeak = true;
        }
        if (didSpeak) {
            // limpiar flags solo si se anunció
            forzarClinicaRef.current[clinica] = false;
            setPendienteAnunciarClinica(null);
        } else {
            // Reintentar pronto: quizá backend/localStorage aún no está listo
            setTimeout(() => {
                cargarTurnos();
                // mantener pendiente y forzar si estaba activo
            }, 300);
        }
    }, [pendienteAnunciarClinica, turnosActuales, audioHabilitado]);

    // Inicializar mapa de últimos anunciados en primer render de datos
    useEffect(() => {
        // evitar anunciar en la primera carga
        Object.entries(turnosActuales || {}).forEach(([clinica, turno]) => {
            if (turno?.id_turno_cod) {
                if (!ultimosAnunciadosRef.current[clinica]) {
                    ultimosAnunciadosRef.current[clinica] = turno.id_turno_cod;
                }
            }
        });
    }, [loading]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="text-center">
                    <RefreshCw className="animate-spin h-16 w-16 mx-auto text-green-600 mb-4" />
                    <div className="text-3xl font-bold text-green-800">Cargando turnos...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-orange-50">
                <div className="text-center">
                    <ExclamationTriangleIcon className="h-16 w-16 mx-auto text-red-600 mb-4" />
                    <div className="text-2xl font-semibold text-red-700">{error}</div>
                    <button 
                        onClick={cargarTurnos}
                        className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-white">
            {/* Header */}
            <div className="bg-white border-b-2 border-gray-200 px-4 py-2">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src={logoClinica} alt="Logo" className="h-10 w-auto" />
                        <div>
                            <h1 className="text-lg font-bold text-gray-800">Sistema de Turnos</h1>
                            <p className="text-xs text-gray-500">Llamados en Tiempo Real</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-gray-700 text-xs font-medium">
                            {horaActual.toLocaleDateString('es-GT', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            })}
                        </div>
                        <div className="text-green-600 text-base font-bold">
                            {horaActual.toLocaleTimeString('es-GT', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido - 3 tarjetas que ocupan exactamente 1/3 cada una */}
            <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
                {!audioHabilitado && (
                    <div className="fixed bottom-4 right-4 z-50">
                        <button
                            onClick={habilitarAudio}
                            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-lg"
                        >
                            Habilitar sonido
                        </button>
                    </div>
                )}
                {clinicas.map((clinica) => {
                    const turno = turnosActuales[clinica];
                    const config = clinicaConfig[clinica] || {};
                    const IconComponent = config.icon;

                    return (
                        <div 
                            key={clinica} 
                            className={`flex-1 ${config.color} rounded-xl border-2 ${config.borderColor} p-3 flex flex-col overflow-hidden`}
                        >
                            {/* Header clínica */}
                            <div className="flex items-center justify-between mb-2 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <IconComponent className={`w-7 h-7 ${config.iconColor}`} />
                                    <h2 className={`text-lg font-bold ${config.textColor}`}>{clinica}</h2>
                                </div>
                                <div className={`${config.badgeColor} px-3 py-1 rounded-full`}>
                                    <span className="text-xs font-bold uppercase">
                                        {turno ? 'EN ATENCIÓN' : 'SIN TURNO'}
                                    </span>
                                </div>
                            </div>

                            {/* Contenido - se ajusta al espacio disponible */}
                            <div className="flex-1 min-h-0 flex items-center py-1">
                                {turno ? (
                                    <div className="w-full">
                                        {/* Código de turno grande */}
                                        <div className="bg-white/90 rounded-lg p-2 shadow-sm mb-1.5">
                                            <p className={`text-3xl font-bold ${config.textColor} font-mono text-center leading-tight`}>
                                                {turno.id_turno_cod}
                                            </p>
                                        </div>

                                        {/* Todo en una línea horizontal */}
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {/* Paciente */}
                                            <div className="bg-white/90 rounded-lg p-1.5 shadow-sm">
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    <User className={`w-2.5 h-2.5 ${config.iconColor}`} />
                                                    <span className="text-xs font-bold text-gray-600 uppercase leading-none">Paciente</span>
                                                </div>
                                                <p className={`text-xs font-bold ${config.textColor} leading-tight`}>
                                                    {turno.nombrepaciente || 'Sin nombre'}
                                                </p>
                                            </div>

                                            {/* Afiliación */}
                                            <div className="bg-white/90 rounded-lg p-1.5 shadow-sm">
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    <Hash className={`w-2.5 h-2.5 ${config.iconColor}`} />
                                                    <span className="text-xs font-bold text-gray-600 uppercase leading-none">Afiliación</span>
                                                </div>
                                                <p className={`text-sm font-bold ${config.textColor} font-mono leading-tight`}>
                                                    {turno.no_afiliacion || 'N/A'}
                                                </p>
                                            </div>

                                            {/* Fecha */}
                                            <div className="bg-white/90 rounded-lg p-1.5 shadow-sm">
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    <Calendar className={`w-2.5 h-2.5 ${config.iconColor}`} />
                                                    <span className="text-xs font-bold text-gray-600 uppercase leading-none">Fecha</span>
                                                </div>
                                                <p className={`text-xs font-bold ${config.textColor} leading-tight`}>
                                                    {turno.fecha_turno ? new Date(turno.fecha_turno).toLocaleDateString('es-GT', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    }) : 'Sin fecha'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full flex flex-col items-center justify-center">
                                        <ClockIcon className="w-10 h-10 text-gray-300 mb-1.5" />
                                        <p className="text-sm font-semibold text-gray-500">No hay turnos activos</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LlamadoTurnosTV;