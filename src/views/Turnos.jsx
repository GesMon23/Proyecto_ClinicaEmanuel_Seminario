import React, { useState } from 'react';
import './TurnosNavButtons.css';
import LlamadoTurnos from '@/components/LlamadoTurnos';
import AsignarTurno from '@/components/AsignarTurno';
import GestionTurno from '@/components/GestionTurno';
import ConsultaTurnos from '@/components/ConsultaTurnos';
import LlamadoTurnosTV from '@/components/LlamadoTurnosTV';

function Turnos() {
    const [tab, setTab] = useState('llamado');

    return (
        <div className="w-full px-4 py-6">
            <div className="pt-6 max-w-7xl mx-auto bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">

                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                    <button 
                        className={`w-full font-bold px-4 py-2 rounded transition-colors ${
                            tab === 'llamado' 
                                ? 'bg-green-800 text-white' 
                                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
                        }`} 
                        onClick={() => setTab('llamado')}
                    >
                        Llamado
                    </button>

                    <button 
                        className={`w-full font-bold px-4 py-2 rounded transition-colors ${
                            tab === 'asignar' 
                                ? 'bg-green-800 text-white' 
                                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
                        }`} 
                        onClick={() => setTab('asignar')}
                    >
                        Faltas
                    </button>

                    <button 
                        className={`w-full font-bold px-4 py-2 rounded transition-colors ${
                            tab === 'crear' 
                                ? 'bg-green-800 text-white' 
                                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
                        }`} 
                        onClick={() => setTab('crear')}
                    >
                        Crear
                    </button>

                    <button 
                        className={`w-full font-bold px-4 py-2 rounded transition-colors ${
                            tab === 'consulta' 
                                ? 'bg-green-800 text-white' 
                                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
                        }`} 
                        onClick={() => setTab('consulta')}
                    >
                        Consulta Turnos
                    </button>

                    <button 
                        className={`w-full font-bold px-4 py-2 rounded transition-colors ${
                            tab === 'turnosTV' 
                                ? 'bg-green-800 text-white' 
                                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
                        }`} 
                        onClick={() => window.open('/turnos-tv', '_blank')}
                    >
                        Turnos TV
                    </button>
                    
                </div>

                <div>
                    {tab === 'llamado' && <LlamadoTurnos />}
                    {tab === 'asignar' && <AsignarTurno />}
                    {tab === 'crear' && <GestionTurno />}
                    {tab === 'consulta' && <ConsultaTurnos />}
                    {tab === 'turnosTV' && <LlamadoTurnosTV />}
                </div>
            </div>
        </div>
    );
}

export default Turnos;