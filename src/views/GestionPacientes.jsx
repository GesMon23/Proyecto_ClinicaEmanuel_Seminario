import React from 'react';
import RegistroPacientes from '@/components/RegistroPacientes.jsx';
import ReingresoPacientes from '@/components/ReingresoPacientes.jsx';
import EgresoPacientes from '@/components/EgresoPacientes.jsx';
import RegistroFormularios from '@/components/RegistroFormularios.jsx';
import ActualizacionPacientes from '@/components/ActualizacionPacientes.jsx';
import BarraPestanas from '@/components/BarraPestanas';
import { usePestanas } from '@/hooks/usePestanas';

const CONTENIDO = {
    registro: RegistroPacientes,
    reingreso: ReingresoPacientes,
    egreso: EgresoPacientes,
    registroformularios: RegistroFormularios,
    actualizacion: ActualizacionPacientes,
};

const GestionPacientes = () => {
    const { visibles, activa, setActiva } = usePestanas('gestionPacientes');
    const Contenido = CONTENIDO[activa];

    return (
        <div className="w-full px-4 py-6">
            <div className="pt-6 w-full bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
                <BarraPestanas pestanas={visibles} activa={activa} onCambio={setActiva} />
                <div>{Contenido && <Contenido />}</div>
            </div>
        </div>
    );
};

export default GestionPacientes;
