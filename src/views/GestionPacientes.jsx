import React, { useState } from 'react';
import './GestionPacientesNavButtons.css';
import { Container, Row, Col, Card } from 'react-bootstrap';
import ConsultaPacientes from '@/components/ConsultaPacientes.jsx';
import RegistroPacientes from '@/components/RegistroPacientes.jsx';
import ReingresoPacientes from '@/components/ReingresoPacientes.jsx';
import EgresoPacientes from '@/components/EgresoPacientes.jsx';
import RegistroFormularios from '@/components/RegistroFormularios.jsx';
import ActualizacionPacientes from '@/components/ActualizacionPacientes.jsx';

const GestionPacientes = () => {
    const [tab, setTab] = useState('consulta');

    return (
        <div className="w-full px-4 py-6">
            <h2 className="mb-4 text-3xl font-bold text-green-700 dark:text-white">
                Gestión Pacientes
            </h2>
            <div className="pt-12 max-w-7xl mx-auto bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">

                <div className="flex flex-wrap gap-4 justify-center mb-6">
                    <button className={`font-bold px-4 py-2 rounded transition-colors ${tab === 'registro' ? 'bg-green-800 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600' }`} onClick={() => setTab('registro')}>
                        Registro
                    </button>

                    <button className={`font-bold px-4 py-2 rounded transition-colors ${tab === 'reingreso' ? 'bg-green-800 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'}`} onClick={() => setTab('reingreso')}>
                        Reingreso
                    </button>

                    <button className={`font-bold px-4 py-2 rounded transition-colors ${tab === 'egreso' ? 'bg-green-800 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'}`} onClick={() => setTab('egreso')}>
                        Egreso
                    </button>

                    <button className={`font-bold px-4 py-2 rounded transition-colors ${tab === 'registroformularios' ? 'bg-green-800 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'}`} onClick={() => setTab('registroformularios')}>
                        Registro de Formularios
                    </button>

                    <button className={`font-bold px-4 py-2 rounded transition-colors ${tab === 'actualizacion' ? 'bg-green-800 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'}`} onClick={() => setTab('actualizacion')}>
                        Actualizar Paciente
                    </button>
                </div>

                <div>
                    {tab === 'registro' && <RegistroPacientes />}
                    {tab === 'reingreso' && <ReingresoPacientes />}
                    {tab === 'registroformularios' && <RegistroFormularios />}
                    {tab === 'egreso' && <EgresoPacientes />}
                    {tab === 'actualizacion' && <ActualizacionPacientes />}
                </div>
            </div>
        </div>

    );
};

export default GestionPacientes;
