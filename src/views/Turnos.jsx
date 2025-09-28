import React, { useState } from 'react';
import './TurnosNavButtons.css';
import LlamadoTurnos from '@/components/LlamadoTurnos';
import AsignarTurno from '@/components/AsignarTurno';
import GestionTurno from '@/components/GestionTurno';
import ConsultaTurnos from '@/components/ConsultaTurnos';

function Turnos() {
    const [tab, setTab] = useState('llamado');

    return (
        <div className="w-full px-4 py-6">
            <h2 className="mb-4 text-3xl font-bold text-green-700 dark:text-white">
                Turnos
            </h2>
            <div className="pt-12 max-w-7xl mx-auto bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">

                <div className="flex flex-wrap gap-4 justify-center mb-6">
                    <button 
                        className={`font-bold px-4 py-2 rounded transition-colors ${
                            tab === 'llamado' 
                                ? 'bg-green-800 text-white' 
                                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
                        }`} 
                        onClick={() => setTab('llamado')}
                    >
                        Llamado
                    </button>

                    <button 
                        className={`font-bold px-4 py-2 rounded transition-colors ${
                            tab === 'asignar' 
                                ? 'bg-green-800 text-white' 
                                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
                        }`} 
                        onClick={() => setTab('asignar')}
                    >
                        Asignar
                    </button>

                    <button 
                        className={`font-bold px-4 py-2 rounded transition-colors ${
                            tab === 'crear' 
                                ? 'bg-green-800 text-white' 
                                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
                        }`} 
                        onClick={() => setTab('crear')}
                    >
                        Crear
                    </button>

                    <button 
                        className={`font-bold px-4 py-2 rounded transition-colors ${
                            tab === 'consulta' 
                                ? 'bg-green-800 text-white' 
                                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
                        }`} 
                        onClick={() => setTab('consulta')}
                    >
                        Consulta Turnos
                    </button>
                </div>

                <div>
                    {tab === 'llamado' && <LlamadoTurnos />}
                    {tab === 'asignar' && <AsignarTurno />}
                    {tab === 'crear' && <GestionTurno />}
                    {tab === 'consulta' && <ConsultaTurnos />}
                </div>
            </div>
        </div>
    );
}

export default Turnos;