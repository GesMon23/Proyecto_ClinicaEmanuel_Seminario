import React from 'react';
import logoClinica from '@/assets/logoClinica2.png';
import { BOTON_LIMPIAR, BOTON_PRINCIPAL } from '@/constants/botones';
import { cn } from '@/utils/cn';

const CLASE_INPUT = 'w-full text-lg px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:bg-slate-800 dark:text-white disabled:opacity-60';

// Encabezado con logo y título + búsqueda por No. de afiliación o DPI (uno u otro).
//   busqueda: { noafiliacion, dpi }  ·  onCambiar(nuevaBusqueda)  ·  children: contenido extra dentro del formulario
export default function BuscadorPacientes({ titulo, busqueda, onCambiar, onBuscar, onLimpiar, loading, children }) {
  return (
    <div className="w-full px-4 md:px-8 py-6">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md">
        <div className="p-6">
          <form onSubmit={onBuscar} className="mb-6">
            {children}
            <div className="w-full text-center mb-6">
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <img
                  src={logoClinica}
                  alt="Logo Clínica"
                  className="h-[180px] max-w-[320px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                />
                <span className="text-3xl font-bold text-green-800 dark:text-white mb-4">{titulo}</span>
              </div>
              <hr className="border-t border-slate-500 dark:border-white my-4" />
            </div>

            <div className="flex justify-center">
              <div className="w-full max-w-md mb-4">
                <input
                  placeholder="Número de Afiliación"
                  type="text"
                  name="noafiliacion"
                  value={busqueda.noafiliacion}
                  onChange={(e) => onCambiar({ ...busqueda, noafiliacion: e.target.value })}
                  disabled={Boolean(busqueda.dpi)}
                  className={`${CLASE_INPUT} mb-3`}
                />
                <input
                  placeholder="DPI"
                  type="text"
                  name="dpi"
                  value={busqueda.dpi}
                  onChange={(e) => onCambiar({ ...busqueda, dpi: (e.target.value || '').replace(/\D+/g, '').slice(0, 13) })}
                  disabled={Boolean(busqueda.noafiliacion)}
                  className={CLASE_INPUT}
                  inputMode="numeric"
                  maxLength={13}
                  pattern="\d{13}"
                  onKeyDown={(e) => { if (['e', 'E', '+', '-', '.', ',', ' '].includes(e.key)) e.preventDefault(); }}
                  onPaste={(e) => { if (/[^0-9]/.test((e.clipboardData.getData('text') || '').trim())) e.preventDefault(); }}
                />
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                type="submit"
                disabled={loading}
                className={cn(BOTON_PRINCIPAL, 'w-36')}
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
              <button
                type="button"
                onClick={onLimpiar}
                className={cn(BOTON_LIMPIAR, 'w-36')}
                aria-label="Limpiar búsqueda y resultados"
              >
                Limpiar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
