import React, { useState } from "react";
import "./GestionReferenciasNavButtons.css";
import { Container, Card } from "react-bootstrap";
import RegistroReferencias from "@/components/RegistroReferencias";
import ConsultaReferencias from "@/components/ConsultaReferencias";

function GestionReferencias() {
  const [tab, setTab] = useState("registro");
  return (
    <div className="w-full px-4 py-8">
      <h2 className="mb-4 text-3xl font-bold text-green-700 dark:text-white">
        Gestión Referencias
      </h2>
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md">
        <div className="p-6">
          <div className="flex flex-wrap gap-4 justify-start mb-6">
            <button
              className={`font-semibold px-4 py-2 rounded transition-colors ${tab === 'registro'
                  ? 'bg-green-800 text-white'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
                }`}
              onClick={() => setTab('registro')}
              disabled={tab === 'registro'}
            >
              Registro de Referencias
            </button>

            <button
              className={`font-semibold px-4 py-2 rounded transition-colors ${tab === 'consulta'
                  ? 'bg-green-800 text-white'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
                }`}
              onClick={() => setTab('consulta')}
              disabled={tab === 'consulta'}
            >
              Consulta de Referencias
            </button>
          </div>

          <div>
            {tab === 'registro' && <RegistroReferencias />}
            {tab === 'consulta' && <ConsultaReferencias />}
          </div>
        </div>
      </div>
    </div>

  );
}

export default GestionReferencias;
