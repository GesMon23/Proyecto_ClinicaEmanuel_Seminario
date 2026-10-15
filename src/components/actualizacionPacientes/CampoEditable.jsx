import React from 'react';

const BASE = 'w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent';
const LECTURA = 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400';
const EDICION = 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-white';
const BLOQUEADO = 'w-full px-4 py-3 border bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-500 rounded-lg shadow-sm cursor-not-allowed';

// Campo de la ficha del paciente: solo lectura hasta que se activa la edición.
//   opciones: [{ value, label }] para un select  ·  bloqueado: nunca editable (p. ej. No. de afiliación)
export default function CampoEditable({ etiqueta, name, tipo = 'text', editable, bloqueado, opciones, vacio = 'Seleccione', ...resto }) {
  const clase = bloqueado ? BLOQUEADO : `${BASE} ${editable ? EDICION : LECTURA}`;
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{etiqueta}</label>
      {opciones ? (
        <select name={name} disabled={!editable} className={clase} {...resto}>
          <option value="">{vacio}</option>
          {opciones.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={tipo} name={name} disabled={bloqueado || !editable} className={clase} {...resto} />
      )}
    </div>
  );
}
