import React from "react";
import { Card } from "react-bootstrap";
import LaboratorioParametros from "../components/LaboratorioParametros";
import logoClinica from "@/assets/logoClinica2.png"

function RegistroLaboratorios() {
  const handleSubmit = (noafiliacion, valores) => {
    // Aquí puedes hacer la petición al backend para guardar los resultados
    console.log("Guardar laboratorio para afiliación:", noafiliacion, valores);
  };
  return (
    <div className="w-full px-4 md:px-8">
      <div className="w-full">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md mt-8 w-full">

          <div className="p-6 min-w-[280px]">
            {/* Encabezado */}
            <div className="w-full text-center mb-6">
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <img
                  src={logoClinica}
                  alt="Logo Clínica"
                  className="h-[160px] max-w-[260px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                />
                <span className="text-3xl font-bold text-green-800 dark:text-white mb-4">
                  Registro de Laboratorio
                </span>
              </div>
              <hr className="mt-4 border-gray-300 dark:border-gray-600" />
            </div>

            {/* Contenido dinámico (formulario de parámetros) */}
            <div className="w-full">
              <LaboratorioParametros onSubmit={handleSubmit} />
            </div>
          </div>
        </div>
      </div>
    </div>


  );
}

export default RegistroLaboratorios;
