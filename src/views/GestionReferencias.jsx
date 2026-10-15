import React from "react";
import RegistroReferencias from "@/components/RegistroReferencias";
import ConsultaReferencias from "@/components/ConsultaReferencias";
import BarraPestanas from "@/components/BarraPestanas";
import { usePestanas } from "@/hooks/usePestanas";

const CONTENIDO = { registro: RegistroReferencias, consulta: ConsultaReferencias };

function GestionReferencias() {
  const { visibles, activa, setActiva } = usePestanas('referencias');
  const Contenido = CONTENIDO[activa];

  return (
    <div className="w-full px-4 py-6">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md">
        <div className="p-6">
          <BarraPestanas pestanas={visibles} activa={activa} onCambio={setActiva} />
          <div>{Contenido && <Contenido />}</div>
        </div>
      </div>
    </div>
  );
}

export default GestionReferencias;
