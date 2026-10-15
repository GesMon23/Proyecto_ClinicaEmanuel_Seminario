import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, VolumeX } from 'lucide-react';
import logoClinica from "@/assets/logoClinica1Min.png";
import TarjetaClinicaTV from './llamadoTV/TarjetaClinicaTV';
import { useLlamadosTV } from './llamadoTV/useLlamadosTV';

// Fecha y hora en vivo (cada segundo)
function useReloj() {
    const [ahora, setAhora] = useState(new Date());
    useEffect(() => {
        const intervalo = setInterval(() => setAhora(new Date()), 1000);
        return () => clearInterval(intervalo);
    }, []);
    return ahora;
}

// Pantalla de la sala de espera: turno en atención de cada clínica, con anuncio por voz
const LlamadoTurnosTV = () => {
    const { clinicas, turnos, loading, error, audioHabilitado, habilitarAudio, enVivo, recargar } = useLlamadosTV();
    const ahora = useReloj();

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
                    <AlertTriangle className="h-16 w-16 mx-auto text-red-600 mb-4" />
                    <div className="text-2xl font-semibold text-red-700">{error}</div>
                    <button onClick={recargar} className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors">
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-white">
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
                        <div
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${enVivo ? 'text-green-700' : 'text-amber-600'}`}
                            title={enVivo ? 'Recibiendo los llamados al instante' : 'Sin conexión en tiempo real: los llamados llegan cada pocos segundos'}
                        >
                            <span className={`h-2 w-2 rounded-full ${enVivo ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                            {enVivo ? 'En vivo' : 'Reconectando…'}
                        </div>
                        <div className="text-gray-700 text-xs font-medium">
                            {ahora.toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <div className="text-green-600 text-base font-bold">
                            {ahora.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Una tarjeta por clínica, cada una con la misma altura */}
            <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
                {/* El navegador no permite la voz hasta que alguien toca la pantalla o presiona una tecla (en cada carga) */}
                {!audioHabilitado && (
                    <button
                        type="button"
                        onClick={habilitarAudio}
                        className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-3 bg-amber-500 px-6 py-4 text-xl font-bold text-white shadow-2xl hover:bg-amber-600"
                    >
                        <VolumeX className="h-7 w-7" aria-hidden="true" />
                        Toque la pantalla o presione cualquier tecla para activar la voz de los llamados
                    </button>
                )}
                {clinicas.map((clinica) => <TarjetaClinicaTV key={clinica} clinica={clinica} turno={turnos[clinica]} />)}
            </div>
        </div>
    );
};

export default LlamadoTurnosTV;
