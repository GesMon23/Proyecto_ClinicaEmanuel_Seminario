import React, { useState } from "react";
import './GestionReportesNavButtons.css';
import PacientesReporte from "@/components/PacientesReporte";
import NuevoIngresoReportes from "@/components/NuevoIngresoReportes";
import EgresoReporte from "@/components/EgresoReporte";
import FallecidosReporte from "@/components/FallecidosReporte";

function GestionReportes() {
  const [tab, setTab] = useState('pacientesreporte');
  return (
    <div className="w-full px-4 py-6">

      <div className="pt-6 max-w-7xl mx-auto bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          <button
            className={`w-full font-bold px-4 py-2 rounded transition-colors ${tab === 'pacientesreporte'
                ? 'bg-green-800 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
              }`}
            onClick={() => setTab('pacientesreporte')}
          >
            Reporte de Pacientes
          </button>

          <button
            className={`w-full font-bold px-4 py-2 rounded transition-colors ${tab === 'nuevoingreso'
                ? 'bg-green-800 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
              }`}
            onClick={() => setTab('nuevoingreso')}
          >
            Nuevo Ingreso Reportes
          </button>

          <button
            className={`w-full font-bold px-4 py-2 rounded transition-colors ${tab === 'egresoreporte'
                ? 'bg-green-800 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
              }`}
            onClick={() => setTab('egresoreporte')}
          >
            Egreso Reporte
          </button>

          <button
            className={`w-full font-bold px-4 py-2 rounded transition-colors ${tab === 'fallecidosreporte'
                ? 'bg-green-800 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
              }`}
            onClick={() => setTab('fallecidosreporte')}
          >
            Fallecidos Reporte
          </button>
        </div>

        <div>
          {tab === 'nuevoingreso' && <NuevoIngresoReportes />}
          {tab === 'pacientesreporte' && <PacientesReporte />}
          {tab === 'egresoreporte' && <EgresoReporte />}
          {tab === 'fallecidosreporte' && <FallecidosReporte />}
        </div>
      </div>
    </div>


  );
}

export default GestionReportes;
