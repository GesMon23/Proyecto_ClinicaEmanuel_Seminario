// Resultado del IMC con la escala de la OMS: valor, categoría y las 6 franjas con la del paciente resaltada.
import React from 'react';
import { CATEGORIAS_IMC, categoriaIMC } from '@/utils/imc';

const formatear = (imc) => Number(imc).toFixed(1);

// Etiqueta compacta para tablas: "22.9 · Saludable" con el color de la categoría
export function EtiquetaIMC({ imc, estado }) {
  const categoria = categoriaIMC(imc);
  if (!categoria) return estado || '';
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: categoria.color, color: categoria.texto }}
    >
      {formatear(imc)} · {estado || categoria.nombre}
    </span>
  );
}

// Indicador completo; sin IMC muestra la escala apagada y `vacio`
export default function IndicadorIMC({ imc, vacio = 'Ingrese altura y peso para calcular el IMC' }) {
  const categoria = categoriaIMC(imc);
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
      <div className="flex flex-wrap items-center gap-3 mb-4" aria-live="polite">
        {categoria ? (
          <>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">IMC</span>
            <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">{formatear(imc)}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">kg/m²</span>
            <span
              className="rounded-md px-3 py-1 text-sm font-bold uppercase tracking-wide"
              style={{ backgroundColor: categoria.color, color: categoria.texto }}
            >
              {categoria.nombre}
            </span>
          </>
        ) : (
          <span className="text-sm text-slate-500 dark:text-slate-400">{vacio}</span>
        )}
      </div>

      <div className="grid grid-cols-6 gap-1" role="list" aria-label="Clasificación del IMC (OMS)">
        {CATEGORIAS_IMC.map((c) => {
          const activa = c === categoria;
          return (
            <div key={c.nombre} role="listitem" aria-current={activa || undefined} className="flex flex-col items-center text-center">
              <div
                className={`w-full rounded transition-all ${activa ? 'h-4 ring-2 ring-offset-2 ring-slate-700 dark:ring-slate-200 dark:ring-offset-slate-800' : 'h-2.5'}`}
                style={{ backgroundColor: c.color, opacity: categoria && !activa ? 0.35 : 1 }}
              />
              <span className={`mt-2 text-[10px] sm:text-xs leading-tight ${activa ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {c.nombre}
              </span>
              <span className={`text-[10px] sm:text-xs ${activa ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                {c.rango}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
