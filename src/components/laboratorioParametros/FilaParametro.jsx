import React from 'react';
import { CalendarDays } from 'lucide-react';
import { CAMPO, ETIQUETA } from '@/constants/formularios';
import { cn } from '@/utils/cn';
import { valorParametroValido } from './parametros';

const BOTON = 'rounded-md px-3 py-2 text-sm font-semibold text-white transition-colors';

// Un parámetro numérico del laboratorio. Los que vienen del historial están bloqueados hasta pulsar "Actualizar";
// los agregados a mano se pueden eliminar.   lab: el objeto de useLaboratorio
export default function FilaParametro({ parametro: { label, param }, lab }) {
  const bloqueado = Boolean(lab.bloqueados[param]);
  const extra = lab.esExtra(param);
  const id = `param-${param.normalize('NFD').replace(/[^A-Za-z0-9]+/g, '-')}`;

  const alEscribir = (e) => {
    const raw = (e.target.value ?? '').trim();
    if (raw === '') return lab.cambiar(param, '');
    if (!valorParametroValido(raw)) return undefined; // se ignoran los cambios inválidos
    const num = parseFloat(raw);
    return Number.isNaN(num) ? undefined : lab.cambiar(param, Math.max(0, num).toString());
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className={ETIQUETA}>{label}</label>
        {lab.fechas[param] && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300" title="Fecha del laboratorio de origen">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {lab.fechas[param]}
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap sm:flex-nowrap items-center gap-2">
        <input
          id={id}
          type="number" inputMode="decimal" step="0.01" min="0"
          value={lab.valores[param] || ''}
          onChange={alEscribir}
          onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
          onPaste={(e) => { if (/^[-+]/.test((e.clipboardData.getData('text') || '').trim())) e.preventDefault(); }}
          placeholder={`Ingrese ${label.toLowerCase()}`}
          className={cn(CAMPO, 'mt-0 flex-1 min-w-[140px]', bloqueado && 'bg-slate-100 dark:bg-slate-900 cursor-not-allowed')}
          readOnly={bloqueado}
        />
        {bloqueado ? (
          <button type="button" className={cn(BOTON, 'bg-blue-700 hover:bg-blue-800')} onClick={() => lab.bloquear(param, false)} title="Editar el valor del último laboratorio">
            Actualizar
          </button>
        ) : lab.fechas[param] !== undefined && (
          <>
            <button type="button" className={cn(BOTON, 'bg-emerald-700 hover:bg-emerald-800')} onClick={() => lab.bloquear(param, true)} title="Terminar la edición">
              Listo
            </button>
            <button type="button" className={cn(BOTON, 'bg-red-600 hover:bg-red-700')} onClick={() => lab.restaurar(param)} title="Restaurar el valor anterior">
              Cancelar
            </button>
          </>
        )}
        {extra && (
          <button type="button" className={cn(BOTON, 'bg-red-700 hover:bg-red-800')} onClick={() => lab.eliminarParametro(param)} title="Eliminar este parámetro">
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
