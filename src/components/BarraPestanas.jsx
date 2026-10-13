import React from 'react';

// Clases completas (no armadas) para que Tailwind las incluya; el índice es el número de botones
const COLUMNAS_SM = ['', '', 'sm:grid-cols-2', 'sm:grid-cols-2', 'sm:grid-cols-2', 'sm:grid-cols-2'];
const COLUMNAS_LG = ['', 'lg:grid-cols-1', 'lg:grid-cols-2', 'lg:grid-cols-3', 'lg:grid-cols-4', 'lg:grid-cols-5'];

const BOTON = 'w-full font-bold px-4 py-2 rounded transition-colors';
const ACTIVA = 'bg-green-800 text-white';
const INACTIVA = 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-slate-600';

// Botones de las pestañas de un módulo (solo las que el usuario puede ver, ver usePestanas).
//   acciones: botones extra que no son pestañas, p. ej. abrir la pantalla de TV: [{ clave, etiqueta, alHacerClic }]
export default function BarraPestanas({ pestanas, activa, onCambio, acciones = [] }) {
  const total = Math.min(pestanas.length + acciones.length, 5);
  return (
    <div className={`w-full grid grid-cols-1 ${COLUMNAS_SM[total]} ${COLUMNAS_LG[total]} gap-4 mb-6`}>
      {pestanas.map((p) => (
        <button
          key={p.clave}
          type="button"
          aria-pressed={activa === p.clave}
          className={`${BOTON} ${activa === p.clave ? ACTIVA : INACTIVA}`}
          onClick={() => onCambio(p.clave)}
        >
          {p.etiqueta}
        </button>
      ))}
      {acciones.map((a) => (
        <button key={a.clave} type="button" className={`${BOTON} ${INACTIVA}`} onClick={a.alHacerClic}>
          {a.etiqueta}
        </button>
      ))}
    </div>
  );
}
