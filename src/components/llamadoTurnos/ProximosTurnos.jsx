import React from 'react';
import { formatearFecha } from '@/utils/fechas';

const TH = 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider';
const TD = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400';

export default function ProximosTurnos({ clinica, turnos }) {
  return (
    <div className="mb-6">
      <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Próximos Turnos - {clinica}</h4>
      <div className="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                {['Código', 'Paciente', 'No. Afiliación', 'Fecha'].map((t) => <th key={t} scope="col" className={TH}>{t}</th>)}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
              {turnos.length > 0 ? (
                turnos.map((turno, index) => (
                  <tr key={turno.id_turno_cod || index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">{turno.id_turno_cod}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{turno.nombrepaciente}</td>
                    <td className={TD}>{turno.no_afiliacion}</td>
                    <td className={TD}>{formatearFecha(turno.fecha_turno)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No hay turnos programados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
