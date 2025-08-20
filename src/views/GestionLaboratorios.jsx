import React, { useState } from "react";
import "./GestionReferenciasNavButtons.css";
import { Container, Card } from "react-bootstrap";

import RegistroLaboratorios from "./RegistroLaboratorios.jsx";

function GestionLaboratorios() {
  const [tab, setTab] = useState("registro");
  return (
    <div className="w-full px-4 py-6">
  <h2 className="mb-4 text-3xl font-bold text-green-700 dark:text-white">
    Laboratorio
  </h2>

  <div className="pt-12 max-w-7xl mx-auto bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
    <div className="flex flex-wrap gap-4 justify-center mb-6">
      <button
        className={`font-bold px-4 py-2 rounded transition-colors ${
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
        className={`font-bold px-4 py-2 rounded transition-colors ${
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
      {tab === 'consulta' && (
        <div className="text-center text-gray-500 dark:text-gray-300 py-8 px-4">
          Aquí irá la consulta de laboratorios.
        </div>
      )}
    </div>
  </div>
</div>

  );
}

export default GestionLaboratorios;
