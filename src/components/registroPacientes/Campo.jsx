import React from 'react';

const BASE = 'w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white';
const SELECT = 'w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white';
const DESHABILITADO = 'w-full rounded-md border px-4 py-2 shadow-sm focus:outline-none focus:ring-2 cursor-not-allowed bg-gray-200 text-gray-500';

export const Etiqueta = ({ htmlFor, requerido, children }) => (
  <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
    {children} {requerido && <span className="text-red-600" aria-hidden="true">*</span>}
  </label>
);

// Campo de formulario: input (`tipo` = text, date, number...) o select (`opciones` = [{ value, label }])
export default function Campo({ id, etiqueta, requerido, tipo = 'text', opciones, vacio, ancho, deshabilitado, ...resto }) {
  const clase = deshabilitado ? DESHABILITADO : opciones ? SELECT : BASE;
  return (
    <div className={ancho ? 'md:col-span-2' : undefined}>
      <Etiqueta htmlFor={id} requerido={requerido}>{etiqueta}</Etiqueta>
      {opciones ? (
        <select id={id} name={id} required={requerido} disabled={deshabilitado} className={clase} {...resto}>
          <option value="">{vacio}</option>
          {opciones.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={tipo} id={id} name={id} required={requerido} disabled={deshabilitado} className={clase} {...resto} />
      )}
    </div>
  );
}
