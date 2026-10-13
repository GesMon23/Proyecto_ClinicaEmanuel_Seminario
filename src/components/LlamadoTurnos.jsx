import React, { useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import logoClinica from "@/assets/logoClinica2.png";
import CustomModal from '@/components/CustomModal';
import Toast from '@/components/Toast';
import { useAviso } from '@/hooks/useAviso';
import { useToast } from '@/hooks/useToast';
import IconoClinica from './llamadoTurnos/IconoClinica';
import ProximosTurnos from './llamadoTurnos/ProximosTurnos';
import TurnoActual from './llamadoTurnos/TurnoActual';
import { useLlamadoTurnos } from './llamadoTurnos/useLlamadoTurnos';

const BOTON = 'px-5 py-2 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

// Llamado de turnos del usuario: elige clínica, llama al siguiente paciente y cierra su atención.
const LlamadoTurnos = () => {
    const { modal, mostrar } = useAviso();
    const { toast, avisar: avisarToast } = useToast();
    const avisar = useCallback((tipo, mensaje) => mostrar(tipo, tipo === 'success' ? 'Éxito' : 'Error', mensaje), [mostrar]);
    const t = useLlamadoTurnos({ avisar });

    if (t.loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <RefreshCw className="animate-spin h-12 w-12 mx-auto text-blue-600" />
                    <p className="mt-4 text-lg dark:text-white">Cargando datos...</p>
                </div>
            </div>
        );
    }

    const clinica = t.selectedClinica;
    // Solo se muestra el turno en atención si es de la clínica seleccionada
    const turnoAqui = t.turnoActivo && t.turnoActivo.nombre_clinica === clinica ? t.turnoActivo : null;

    const seleccionar = (nombre) => {
        t.seleccionar(nombre);
        avisarToast(`Clínica seleccionada: ${nombre}`, 'success');
    };

    return (
        <div className="w-full">
            <Toast {...toast} />
            <CustomModal {...modal} />

            <div className="w-full text-center mb-6">
                <div className="flex items-center justify-center gap-6 flex-wrap">
                    <img
                        src={logoClinica}
                        alt="Logo Clínica"
                        className="h-[140px] sm:h-[160px] lg:h-[180px] max-w-[280px] sm:max-w-[320px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                    />
                    <h1 className="text-2xl sm:text-3xl font-bold text-green-800 dark:text-white">Llamado de Turnos</h1>
                </div>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-slate-600 to-transparent mt-4" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
                {t.clinicas.length === 0 && (
                    <p role="status" className="text-center text-slate-600 dark:text-slate-300 py-6">
                        No tienes clínicas asignadas para el llamado de turnos. Pide a un administrador que te asigne alguna.
                    </p>
                )}
                <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                    <ul className="flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500 dark:text-gray-400">
                        {t.clinicas.map((c) => (
                            <li key={c.idsala} className="me-2">
                                <button
                                    onClick={() => seleccionar(c.descripcion)}
                                    className={`inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg group ${clinica === c.descripcion
                                        ? 'text-green-600 border-green-600 dark:text-green-500 dark:border-green-500'
                                        : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'}`}
                                >
                                    <IconoClinica nombre={c.descripcion} />
                                    {c.descripcion}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {clinica && <TurnoActual clinica={clinica} turno={turnoAqui} />}
                {clinica && <ProximosTurnos clinica={clinica} turnos={t.siguientes} />}

                {clinica && t.turnoActivo && t.turnoActivo.nombre_clinica !== clinica && (
                    <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">
                        Tienes un paciente en atención en {t.turnoActivo.nombre_clinica}. Debes finalizarlo o marcarlo como abandonado antes de llamar a otro.
                    </p>
                )}
                {clinica && (
                    <div className="flex flex-wrap gap-3 justify-between">
                        <button
                            className={`${BOTON} bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700`}
                            onClick={() => t.llamar(clinica)}
                            disabled={!!t.turnoActivo || t.siguientes.length === 0 || t.llamando}
                        >
                            Llamar
                        </button>
                        <button
                            className={`${BOTON} bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600`}
                            onClick={() => t.abandonar(clinica)}
                            disabled={!turnoAqui}
                        >
                            Abandonado
                        </button>
                        <button
                            className={`${BOTON} bg-red-600 hover:bg-red-700`}
                            onClick={() => t.finalizar(clinica)}
                            disabled={!turnoAqui}
                        >
                            Finalizar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LlamadoTurnos;
