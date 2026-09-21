import React from 'react';
import defaultAvatar from '@/assets/img/default-avatar.png';
import { baseURL } from './fotos';

const BADGE = 'bg-green-50 dark:bg-slate-800 rounded-lg p-4 sm:p-6 border-l-4 border-green-600 min-w-0 flex flex-col justify-center';
const ETIQUETA_BADGE = 'text-xs sm:text-sm font-medium text-green-800 dark:text-green-400 mb-2';
const VALOR_BADGE = 'text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white break-all';

// Tarjeta con la ficha resumida del paciente encontrado.
//   paciente: { nombre, noAfiliacion, dpi, sexo, archivoFoto, versionFoto, detalles: [{ label, value }], observaciones }
export default function TarjetaPaciente({ paciente: p }) {
  const base = baseURL();
  const foto = p.archivoFoto ? `${base}/fotos/${p.archivoFoto}?v=${p.versionFoto || ''}` : defaultAvatar;

  // Si la foto no carga: primero la ruta que resuelve por número de afiliación y, si tampoco, el avatar
  const alFallarFoto = (e) => {
    if (!e.currentTarget.getAttribute('data-tried') && p.noAfiliacion) {
      e.currentTarget.setAttribute('data-tried', '1');
      e.currentTarget.src = `${base}/foto/${encodeURIComponent(p.noAfiliacion)}`;
      return;
    }
    e.currentTarget.onerror = null;
    e.currentTarget.src = defaultAvatar;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden mb-6 transition-all duration-200 hover:shadow-xl">
      <div className="flex flex-col lg:flex-row gap-6 p-6">
        <div className="flex-shrink-0 mx-auto lg:mx-0">
          <div className="w-48 h-48 lg:w-56 lg:h-56 rounded-xl overflow-hidden border-4 border-green-700 dark:border-green-600 shadow-lg bg-gray-100 dark:bg-slate-800">
            <img alt="Foto del paciente" src={foto} className="w-full h-full object-cover" onError={alFallarFoto} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-center lg:text-left mb-6">
            <h2 className="text-2xl lg:text-3xl font-bold text-green-700 dark:text-white uppercase tracking-wide break-words leading-tight">
              {p.nombre || '—'}
            </h2>
            <div className="w-24 h-1 bg-green-600 dark:bg-white mx-auto lg:mx-0 mt-2 rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 px-2 sm:px-0">
            <div className={`${BADGE} min-h-[155px]`}>
              <div className={ETIQUETA_BADGE}>No. Afiliación</div>
              <div className={VALOR_BADGE}>{p.noAfiliacion || '—'}</div>
            </div>
            <div className={`${BADGE} min-h-[155px]`}>
              <div className={ETIQUETA_BADGE}>DPI</div>
              <div className={VALOR_BADGE}>{p.dpi || '—'}</div>
            </div>
            <div className={`${BADGE} min-h-[100px] sm:col-span-2 xl:col-span-1`}>
              <div className={ETIQUETA_BADGE}>Sexo</div>
              <div className={VALOR_BADGE}>{p.sexo || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-slate-700" />

      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <div className="w-2 h-2 bg-green-600 rounded-full mr-2" />
          Información Detallada
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {p.detalles.map((d) => (
            <div key={d.label} className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{d.label}</div>
              <div className="text-base text-gray-900 dark:text-white font-medium break-words">{d.value || '—'}</div>
            </div>
          ))}
        </div>

        {p.observaciones && (
          <div className="mt-6 bg-yellow-50 dark:bg-slate-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs text-yellow-900">!</span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-1">Observaciones</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 break-words">{p.observaciones}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
