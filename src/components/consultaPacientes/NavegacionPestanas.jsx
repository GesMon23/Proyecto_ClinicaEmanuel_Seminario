import React from 'react';

const PESTANAS = ['Datos Personales', 'Historial', 'Referencias', 'Nutrición', 'Psicologia', 'Formularios', 'Turnos', 'Faltistas', 'Laboratorios'];

// Trazos SVG (viewBox 24x24) de cada pestaña
const ICONOS = {
  'Datos Personales': ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', { c: [12, 7, 4] }],
  Historial: ['M3 12a9 9 0 1 0 9-9', 'M3 3v6h6', 'M12 7v5l3 3'],
  Referencias: ['M10 13a5 5 0 0 0 7.07 0l3.54-3.54a5 5 0 0 0-7.07-7.07L11 4', 'M14 11a5 5 0 0 0-7.07 0L3.39 14.54a5 5 0 0 0 7.07 7.07L13 20'],
  Nutrición: ['M12 2v20', 'M7 7h10', 'M5 12h14', 'M7 17h10'],
  Psicologia: ['M20 12a8 8 0 1 0-15.5 2H3v4h4v-2h3a8 8 0 0 0 10-4z'],
  Formularios: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
  Turnos: [{ c: [12, 12, 10] }, 'M12 6v6l4 2'],
  Faltistas: ['M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', { c: [9, 7, 4] }, 'M22 11h-6'],
  Laboratorios: ['M6 2v6l-3 7a4 4 0 0 0 4 5h10a4 4 0 0 0 4-5l-3-7V2', 'M6 6h12'],
};

function Icono({ pestana, activa }) {
  const cls = `h-5 w-5 ${activa ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`;
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(ICONOS[pestana] || []).map((t, i) => (typeof t === 'string'
        ? <path key={i} d={t} />
        : <circle key={i} cx={t.c[0]} cy={t.c[1]} r={t.c[2]} />))}
    </svg>
  );
}

export default function NavegacionPestanas({ activa, onCambiar }) {
  return (
    <nav className="w-full mb-4" role="tablist" aria-label="Secciones de paciente">
      <div className="w-full bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-x-auto px-2">
        <div className="flex items-center justify-center gap-0 flex-wrap">
          {PESTANAS.map((tab, idx) => {
            const seleccionada = activa === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={seleccionada}
                aria-controls={`panel-${tab.replace(/\s+/g, '-')}`}
                onClick={() => onCambiar(tab)}
                className={`${seleccionada
                  ? 'text-green-700 dark:text-green-400 border-b-2 border-green-600 bg-green-50/40 dark:bg-slate-700/40'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border-b-2 border-transparent'} px-5 py-3 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer ${idx === 0 ? 'rounded-l-xl' : ''} ${idx === PESTANAS.length - 1 ? 'rounded-r-xl' : ''}`}
              >
                <span className="inline-flex items-center gap-2">
                  <span>{tab}</span>
                  <Icono pestana={tab} activa={seleccionada} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
