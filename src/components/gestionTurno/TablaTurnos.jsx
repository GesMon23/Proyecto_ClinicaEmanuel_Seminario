import React, { useState } from 'react';
import { PencilLine, Trash } from 'lucide-react';
import { formatearFecha } from '@/utils/fechas';
import { normalizarBusqueda } from './turnos';

const TH = 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider';
const BOTON_PAGINA = 'px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 transition-colors';

// Turnos del paciente con buscador (ID, clínica y fecha), filas por página y paginación numerada
export default function TablaTurnos({ turnos, onEditar, onCancelar }) {
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [filas, setFilas] = useState(5);

  const q = normalizarBusqueda(busqueda).trim();
  const filtrados = q
    ? turnos.filter((t) => normalizarBusqueda(
      [t.id_turno_cod || t.id_turno, t.nombre_clinica, formatearFecha(t.fecha_turno), String(t.fecha_turno || '').slice(0, 10)].join(' ')
    ).includes(q))
    : turnos;
  const totalPaginas = Math.ceil(filtrados.length / filas);
  // Si se cancela el último turno de la última página, se retrocede
  const actual = Math.min(pagina, Math.max(1, totalPaginas));
  const visibles = filtrados.slice((actual - 1) * filas, actual * filas);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between mb-2 gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
          placeholder="Buscar en la tabla..."
          className="w-full sm:w-72 px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-md dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-700 dark:text-gray-300">Filas por página:</label>
          <select
            value={filas}
            onChange={(e) => { setFilas(parseInt(e.target.value, 10)); setPagina(1); }}
            className="px-2 py-1 border border-gray-300 dark:border-slate-700 rounded-md dark:bg-slate-800 dark:text-white"
          >
            {[3, 5, 10, 15].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                {['ID Turno', 'Clínica', 'Fecha', 'Acciones'].map((t) => <th key={t} scope="col" className={TH}>{t}</th>)}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filtrados.length > 0 ? (
                visibles.map((turno) => (
                  <tr key={turno.id_turno} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">{turno.id_turno_cod}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{turno.nombre_clinica}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatearFecha(turno.fecha_turno)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          title="Editar"
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/30 transition-colors"
                          onClick={() => onEditar(turno.id_turno)}
                        >
                          <PencilLine />
                        </button>
                        <button
                          title="Cancelar turno"
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30 transition-colors"
                          onClick={() => onCancelar(turno.id_turno)}
                        >
                          <Trash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    {turnos.length === 0 ? 'No hay turnos registrados para este paciente' : 'No se encontraron turnos con esa búsqueda'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPaginas > 1 && (
        <div className="flex flex-wrap justify-center items-center gap-2 mt-4">
          <button className={BOTON_PAGINA} disabled={actual === 1} onClick={() => setPagina(actual - 1)}>Anterior</button>
          {Array.from({ length: totalPaginas }, (_, i) => (
            <button
              key={i}
              className={`px-3 py-2 rounded-lg transition-colors ${actual === i + 1
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'}`}
              onClick={() => setPagina(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button className={BOTON_PAGINA} disabled={actual === totalPaginas} onClick={() => setPagina(actual + 1)}>Siguiente</button>
        </div>
      )}
    </>
  );
}
