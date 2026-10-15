import React from 'react';

const BOTON = 'px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 transition-colors';

// Paginación numerada: Anterior, 1..N y Siguiente. `pagina` empieza en 1.
export default function Paginador({ pagina, total, onCambiar, className = 'mt-4' }) {
  if (total <= 1) return null;
  return (
    <div className={`flex flex-wrap justify-center items-center gap-2 ${className}`}>
      <button className={BOTON} disabled={pagina === 1} onClick={() => onCambiar(pagina - 1)}>Anterior</button>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          className={`px-3 py-2 rounded-lg transition-colors ${pagina === i + 1
            ? 'bg-green-600 text-white'
            : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'}`}
          onClick={() => onCambiar(i + 1)}
        >
          {i + 1}
        </button>
      ))}
      <button className={BOTON} disabled={pagina === total} onClick={() => onCambiar(pagina + 1)}>Siguiente</button>
    </div>
  );
}
