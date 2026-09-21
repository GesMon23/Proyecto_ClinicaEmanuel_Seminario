import React from 'react';

const INPUT = 'w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400';

// Clases completas (Tailwind no detecta nombres armados con variables)
const ANILLO = { green: 'focus:ring-green-600', red: 'focus:ring-red-600' };

// Campo grande de los formularios de gestión (Egreso, Reingreso, ...): etiqueta + input, select o textarea.
//   tipo: 'text' | 'date' | 'number' | 'select' | 'textarea'  ·  opciones: [{ value, label }] para select
//   acento: color del anillo de foco ('green' por omisión, 'red' en la sección de fallecimiento)
//   envoltura: clases extra del contenedor (p. ej. 'flex-1' dentro de una fila)
export default function CampoGestion({
  etiqueta, requerido, tipo = 'text', opciones, vacio, ayuda, contador, acento = 'green', className = '', envoltura = '', ...resto
}) {
  const clase = `${INPUT} ${ANILLO[acento]} ${className}`;
  return (
    <div className={`space-y-2 ${envoltura}`}>
      {(etiqueta || contador) && (
        <div className="flex items-end justify-between">
          <label className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            {etiqueta} {etiqueta && requerido && <span className="text-rose-500">*</span>}
          </label>
          {contador && <span className="text-xs text-slate-500 dark:text-slate-400">{contador}</span>}
        </div>
      )}
      {tipo === 'select' ? (
        <select required={requerido} className={clase} {...resto}>
          <option value="">{vacio}</option>
          {opciones.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : tipo === 'textarea' ? (
        <textarea required={requerido} className={`${clase} resize-none`} {...resto} />
      ) : (
        <input type={tipo} required={requerido} className={clase} {...resto} />
      )}
      {ayuda && <small className="block text-xs text-slate-500 dark:text-slate-400">{ayuda}</small>}
    </div>
  );
}
