import React from "react";
import RegistroLaboratorios from "./RegistroLaboratorios.jsx";
import ConsultaLaboratorios from "../components/ConsultaLaboratorios.jsx";
import BarraPestanas from "@/components/BarraPestanas";
import { usePestanas } from "@/hooks/usePestanas";

const CONTENIDO = { registro: RegistroLaboratorios, consulta: ConsultaLaboratorios };

function GestionLaboratorios() {
  const { visibles, activa, setActiva } = usePestanas('laboratorios');
  const Contenido = CONTENIDO[activa];

  return (
    <div className="w-full px-4 py-6">
      <div className="pt-6 w-full bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
        <BarraPestanas pestanas={visibles} activa={activa} onCambio={setActiva} />
        <div>{Contenido && <Contenido />}</div>
      </div>
    </div>
  );
}

export default GestionLaboratorios;
