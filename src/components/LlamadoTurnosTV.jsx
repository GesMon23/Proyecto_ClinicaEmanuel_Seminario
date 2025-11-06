import React, { useState, useEffect } from 'react';
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

    // Lista de clínicas a mostrar
    const clinicas = ['Hemodialisis', 'Nutrición', 'Psicología'];

    const cargarTurnos = async () => {
        try {
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
            resultados.forEach(({ clinica, turno }) => {
                nuevosTurnos[clinica] = turno;
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
        cargarTurnos();
        const intervalo = setInterval(cargarTurnos, 30000);
        return () => clearInterval(intervalo);
    }, []);

    useEffect(() => {
        const intervalo = setInterval(() => setHoraActual(new Date()), 1000);
        return () => clearInterval(intervalo);
    }, []);

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'turnoActualizado') cargarTurnos();
        };
        const handleCustomEvent = () => cargarTurnos();
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
        };
    }, []);

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