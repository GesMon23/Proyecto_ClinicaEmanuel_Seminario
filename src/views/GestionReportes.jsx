import React from "react";
import PacientesReporte from "@/components/PacientesReporte";
import NuevoIngresoReportes from "@/components/NuevoIngresoReportes";
import EgresoReporte from "@/components/EgresoReporte";
import FallecidosReporte from "@/components/FallecidosReporte";
import BarraPestanas from "@/components/BarraPestanas";
import { usePestanas } from "@/hooks/usePestanas";

const CONTENIDO = {
  pacientesreporte: PacientesReporte,
  nuevoingreso: NuevoIngresoReportes,
  egresoreporte: EgresoReporte,
  fallecidosreporte: FallecidosReporte,
};

function GestionReportes() {
  const { visibles, activa, setActiva } = usePestanas('reportes');
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

export default GestionReportes;
