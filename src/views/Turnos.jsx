import React from 'react';
import LlamadoTurnos from '@/components/LlamadoTurnos';
import AsignarTurno from '@/components/AsignarTurno';
import GestionTurno from '@/components/GestionTurno';
import ConsultaTurnos from '@/components/ConsultaTurnos';
import ClinicasUsuarios from '@/components/ClinicasUsuarios';
import BarraPestanas from '@/components/BarraPestanas';
import { usePestanas } from '@/hooks/usePestanas';

const CONTENIDO = {
    llamado: LlamadoTurnos,
    asignar: AsignarTurno,
    crear: GestionTurno,
    consulta: ConsultaTurnos,
    clinicas: ClinicasUsuarios,
};

// La pantalla de la TV es pública: el botón está para cualquiera que entre a Turnos
const ABRIR_TV = { clave: 'turnosTV', etiqueta: 'Turnos TV', alHacerClic: () => window.open('/turnos-tv', '_blank') };

function Turnos() {
    const { visibles, activa, setActiva } = usePestanas('turnos');
    const Contenido = CONTENIDO[activa];

    return (
        <div className="w-full px-4 py-6">
            <div className="pt-6 w-full bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
                <BarraPestanas pestanas={visibles} activa={activa} onCambio={setActiva} acciones={[ABRIR_TV]} />
                <div>{Contenido && <Contenido />}</div>
            </div>
        </div>
    );
}

export default Turnos;
