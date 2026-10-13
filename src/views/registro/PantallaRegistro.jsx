import React from 'react';
import logoClinica from '@/assets/logoClinica2.png';
import { usePestanas } from '@/hooks/usePestanas';

const TAB = 'px-4 py-2 rounded-md font-semibold border transition-colors';
const ACTIVA = 'bg-green-800 text-white border-green-900';
const INACTIVA = 'bg-white dark:bg-slate-800 text-green-800 dark:text-white border-green-800 hover:bg-green-50 dark:hover:bg-slate-700';

// Marco de las pantallas de registro clínico (Nutrición, Psicología): encabezado, pestañas Registro / Consulta
// (solo las que permite el usuario). modulo: 'nutricion' | 'psicologia' (ver constants/permisos.js)
export default function PantallaRegistro({ modulo, titulo, registro, consulta }) {
  const { visibles, activa, setActiva } = usePestanas(modulo);
  const contenido = { registro, consulta };
  return (
    <div className="w-full px-4 md:px-8 py-6">
      <div className="w-full mb-10">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden w-full mt-4">
          <div className="p-6 min-w-[280px]">
            <div className="w-full text-center mb-6">
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <img
                  src={logoClinica}
                  alt="Logo Clínica"
                  className="h-[160px] max-w-[260px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                />
                <span className="text-3xl font-bold text-green-800 dark:text-white mb-4">{titulo}</span>
              </div>
              <hr className="mt-4 border-gray-300 dark:border-gray-600" />
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              {visibles.map((p) => (
                <button
                  key={p.clave}
                  type="button"
                  aria-pressed={activa === p.clave}
                  onClick={() => setActiva(p.clave)}
                  className={`${TAB} ${activa === p.clave ? ACTIVA : INACTIVA}`}
                >
                  {p.etiqueta}
                </button>
              ))}
            </div>

            {contenido[activa] ?? null}
          </div>
        </div>
      </div>
    </div>
  );
}
