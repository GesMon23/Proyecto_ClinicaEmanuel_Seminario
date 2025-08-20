import React, { useState } from "react";
import './GestionReportesNavButtons.css';
import PacientesReporte from "@/components/PacientesReporte";
import NuevoIngresoReportes from "@/components/NuevoIngresoReportes";
import EgresoReporte from "@/components/EgresoReporte";
import FallecidosReporte from "@/components/FallecidosReporte";
import ReporteFaltistas from "./ReporteFaltistas";

function GestionReportes() {
  const [tab, setTab] = useState('inicio');
  return (
    <div className="w-full px-4 py-6">
      <h2 className="mb-4 text-3xl font-bold text-green-700 dark:text-white">
        Gestión Reportes
      </h2>

      <div className="pt-12 max-w-7xl mx-auto bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
        <div className="flex flex-wrap gap-4 justify-center mb-6">
          <button
            className={`font-bold px-4 py-2 rounded transition-colors ${tab === 'pacientesreporte'
                ? 'bg-green-800 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
              }`}
            onClick={() => setTab('pacientesreporte')}
          >
            Reporte de Pacientes
          </button>

          <button
            className={`font-bold px-4 py-2 rounded transition-colors ${tab === 'nuevoingreso'
                ? 'bg-green-800 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
              }`}
            onClick={() => setTab('nuevoingreso')}
          >
            Nuevo Ingreso Reportes
          </button>

          <button
            className={`font-bold px-4 py-2 rounded transition-colors ${tab === 'egresoreporte'
                ? 'bg-green-800 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
              }`}
            onClick={() => setTab('egresoreporte')}
          >
            Egreso Reporte
          </button>

          <button
            className={`font-bold px-4 py-2 rounded transition-colors ${tab === 'fallecidosreporte'
                ? 'bg-green-800 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
              }`}
            onClick={() => setTab('fallecidosreporte')}
          >
            Fallecidos Reporte
          </button>

          <button
            className={`font-bold px-4 py-2 rounded transition-colors ${tab === 'faltistasreporte'
                ? 'bg-green-800 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
              }`}
            onClick={() => setTab('faltistasreporte')}
          >
            Reporte de Faltistas
          </button>
        </div>

        <div>
          {tab === 'nuevoingreso' && <NuevoIngresoReportes />}
          {tab === 'pacientesreporte' && <PacientesReporte />}
          {tab === 'egresoreporte' && <EgresoReporte />}
          {tab === 'fallecidosreporte' && <FallecidosReporte />}
          {tab === 'faltistasreporte' && <ReporteFaltistas />}
        </div>
      </div>
    </div>


  );
}

export default GestionReportes;
