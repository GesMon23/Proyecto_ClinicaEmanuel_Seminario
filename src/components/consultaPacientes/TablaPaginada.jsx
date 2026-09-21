import React from 'react';
import { usePaginacion } from './usePaginacion';

const TH = 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider';
const TD = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200';

// Tabla con buscador, filas por página y paginación (el patrón de todas las pestañas de la ficha).
//   columnas: [{ titulo, celda: (fila, indiceGlobal) => nodo }]  · claves: campos donde busca el filtro
export default function TablaPaginada({
  id, marcador, items, claves, columnas, filaKey,
  tamanos = [5, 10, 20, 50], altoMax, vacio = 'Sin registros por el momento',
}) {
  const p = usePaginacion(items, claves);
  const desplazamiento = (p.pagina - 1) * p.tamano;

  return (
    <div id={`panel-${id}`} role="tabpanel" className="w-full mb-8">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-3">
        <input
          className="border border-gray-300 rounded px-3 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
          placeholder={marcador}
          value={p.busqueda}
          onChange={(e) => p.setBusqueda(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <span className="text-sm dark:text-gray-300">Filas por página:</span>
          <select
            className="border border-gray-300 rounded px-2 py-1 text-sm dark:bg-slate-900 dark:text-gray-200"
            value={p.tamano}
            onChange={(e) => p.setTamano(parseInt(e.target.value) || 10)}
          >
            {tamanos.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <div
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-sm overflow-x-auto md:overflow-hidden"
        style={altoMax ? { maxHeight: altoMax, overflowY: 'auto' } : undefined}
      >
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-slate-700" style={altoMax ? { position: 'sticky', top: 0, zIndex: 1 } : undefined}>
            <tr>
              {columnas.map((c) => <th key={c.titulo} scope="col" className={TH}>{c.titulo}</th>)}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
            {p.visibles.length > 0 ? (
              p.visibles.map((fila, i) => (
                <tr key={filaKey ? filaKey(fila, i) : i} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                  {columnas.map((c) => (
                    <td key={c.titulo} className={TD}>{c.celda(fila, desplazamiento + i)}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnas.length} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">{vacio}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-sm dark:text-gray-300">Página {p.pagina} de {p.totalPaginas}</span>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => p.setPagina(Math.max(1, p.pagina - 1))} disabled={p.pagina <= 1}>Anterior</button>
          <button className="px-3 py-1 rounded border text-sm disabled:opacity-50" onClick={() => p.setPagina(Math.min(p.totalPaginas, p.pagina + 1))} disabled={p.pagina >= p.totalPaginas}>Siguiente</button>
        </div>
      </div>
    </div>
  );
}

export const BotonDetalle = ({ onClick }) => (
  <button type="button" className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white" onClick={onClick}>Ver detalle</button>
);
