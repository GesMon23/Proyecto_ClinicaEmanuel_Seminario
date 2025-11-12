import React, { useState } from "react";
import "./GestionReferenciasNavButtons.css";
import { Container, Card } from "react-bootstrap";

import RegistroLaboratorios from "./RegistroLaboratorios.jsx";
import ConsultaLaboratorios from "../components/ConsultaLaboratorios.jsx";

function GestionLaboratorios() {
  const [tab, setTab] = useState("registro");
  return (
    <div className="w-full px-4 py-6">
  <div className="pt-6 max-w-7xl mx-auto bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <button
        className={`w-full font-bold px-4 py-2 rounded transition-colors ${
          tab === 'registro'
            ? 'bg-green-800 text-white'
            : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
        }`}
        onClick={() => setTab('registro')}
        disabled={tab === 'registro'}
      >
        Registro de Laboratorio
      </button>

      <button
        className={`w-full font-bold px-4 py-2 rounded transition-colors ${
          tab === 'consulta'
            ? 'bg-green-800 text-white'
            : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600'
        }`}
        onClick={() => setTab('consulta')}
        disabled={tab === 'consulta'}
      >
        Consulta de Laboratorio
      </button>
    </div>

    {/* Contenido dinámico */}
    <div>
      {tab === 'registro' && <RegistroLaboratorios />}
      {tab === 'consulta' && <ConsultaLaboratorios />}
    </div>
  </div>
</div>

  );
}

export default GestionLaboratorios;
