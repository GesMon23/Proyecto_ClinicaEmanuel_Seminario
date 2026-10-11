import React, { useCallback, useEffect, useState } from 'react';
import logoClinica from '@/assets/logoClinica2.png';
import api from '@/config/api';
import Paginador from '@/components/Paginador';
import { imprimirListado } from '../reportes/impresion';

const ENTRADA = 'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 dark:bg-slate-800 dark:text-white dark:border-slate-600';
const TH = 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider';
const TD = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200';

const vacios = (filtros) => Object.fromEntries(filtros.map((f) => [f.nombre, '']));

function Filtro({ def, valores, catalogos, onCambio }) {
  const valor = valores[def.nombre];
  const cambiar = (e) => onCambio(def.nombre, e.target.value);
  let control;
  if (def.tipo === 'desde') control = <input type="date" value={valor} onChange={cambiar} max={valores.hasta || undefined} className={`${ENTRADA} shadow-sm`} />;
  else if (def.tipo === 'hasta') {
    control = <input type="date" value={valor} onChange={cambiar} min={valores.desde || undefined} disabled={!valores.desde} className={`${ENTRADA} shadow-sm disabled:opacity-60 disabled:cursor-not-allowed`} />;
  } else if (def.tipo === 'texto') control = <input type="text" value={valor} onChange={cambiar} placeholder={def.marcador} className={ENTRADA} />;
  else {
    const opciones = def.opciones || (catalogos[def.catalogo] || []).map((o) => (Array.isArray(o) ? o : [o, o]));
    control = (
      <select value={valor} onChange={cambiar} className={ENTRADA}>
        <option value="">{def.todos}</option>
        {opciones.map(([v, texto]) => <option key={v} value={v}>{texto}</option>)}
      </select>
    );
  }
  return (
    <div className={`col-span-1 ${def.ancho || 'lg:col-span-2'}`}>
      <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">{def.etiqueta}</label>
      {control}
    </div>
  );
}

// Pantalla de consulta de un historial: filtros, tabla paginada, detalle y PDF. `consulta` viene de definiciones.js
export default function ConsultaHistorial({ consulta }) {
  const [valores, setValores] = useState(() => vacios(consulta.filtros));
  const [catalogos, setCatalogos] = useState({});
  const [registros, setRegistros] = useState([]);
  const [rapida, setRapida] = useState('');
  const [loading, setLoading] = useState(Boolean(consulta.cargaInicial));
  const [error, setError] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(10);

  const consultar = useCallback(async (filtros) => {
    setError('');
    setRegistros([]);
    setLoading(true);
    setPagina(1);
    try {
      const params = Object.fromEntries(consulta.filtros.filter((f) => filtros[f.nombre]).map((f) => [f.param, filtros[f.nombre]]));
      const { data } = await api.get(consulta.rutaDatos, { params });
      if (consulta.formato === 'lista') {
        setRegistros(Array.isArray(data) ? data : []);
      } else if (data?.success) {
        setRegistros(data.data || []);
      } else {
        setError(data?.message || 'No se pudo obtener el historial.');
      }
    } catch {
      if (consulta.formato !== 'lista') setError('Error al consultar el historial.');
    } finally {
      setLoading(false);
    }
  }, [consulta]);

  useEffect(() => {
    if (consulta.catalogos) consulta.catalogos().then(setCatalogos);
    if (consulta.cargaInicial) consultar(vacios(consulta.filtros));
  }, [consulta, consultar]);

  const limpiar = () => {
    setValores(vacios(consulta.filtros));
    setRapida('');
    setRegistros([]);
    setError('');
    setPagina(1);
  };

  const visiblesTodos = consulta.busquedaRapida && rapida
    ? registros.filter((r) => consulta.busquedaRapida.valor(r).some((v) => String(v ?? '').toLowerCase().includes(rapida.toLowerCase())))
    : registros;
  const totalPaginas = Math.max(1, Math.ceil(visiblesTodos.length / filasPorPagina));
  const inicio = (pagina - 1) * filasPorPagina;
  const visibles = visiblesTodos.slice(inicio, inicio + filasPorPagina);
  const sinDatos = visiblesTodos.length === 0;
  const Detalle = consulta.Detalle;

  return (
    <div className="mt-2">
      <div className="flex flex-wrap justify-center items-center gap-6 mb-4">
        <img src={logoClinica} alt="Logo Clínica" className="h-[120px] max-w-[220px] object-contain rounded-xl shadow-md p-2" />
        <span className="text-2xl sm:text-3xl font-semibold tracking-wide text-green-800 dark:text-white">{consulta.titulo}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        {consulta.filtros.map((def) => (
          <Filtro key={def.nombre} def={def} valores={valores} catalogos={catalogos} onCambio={(n, v) => setValores((x) => ({ ...x, [n]: v }))} />
        ))}
        {consulta.busquedaRapida && (
          <div className="col-span-1 lg:col-span-2">
            <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">{consulta.busquedaRapida.etiqueta}</label>
            <input type="text" value={rapida} onChange={(e) => { setRapida(e.target.value); setPagina(1); }} placeholder={consulta.busquedaRapida.marcador} className={ENTRADA} />
          </div>
        )}

        <div className="flex items-end gap-3 col-span-1 lg:col-span-2">
          <button
            type="button" onClick={() => consultar(valores)} disabled={loading}
            className={`px-6 py-2 font-semibold rounded-md transition-colors text-white ${loading ? 'bg-green-700 cursor-not-allowed' : 'bg-green-800 hover:bg-green-900 border border-green-900'}`}
          >
            Buscar
          </button>
          <button type="button" onClick={limpiar} disabled={loading} className="px-6 py-2 font-semibold rounded-md bg-red-700 hover:bg-red-800 text-white border border-red-800">
            Limpiar
          </button>
          <button
            type="button" onClick={() => imprimirListado({ ...consulta.listado, columnas: consulta.columnas }, visiblesTodos)} disabled={loading || sinDatos}
            className={`px-6 py-2 font-semibold rounded-md text-white ${sinDatos ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800'}`}
          >
            Descargar PDF
          </button>
        </div>
      </div>

      {error && <div className="mt-4 text-red-700 bg-red-100 border border-red-400 px-4 py-2 rounded text-lg">{error}</div>}

      <div className="mt-6">
        <div className="flex items-center justify-end gap-2 mb-3">
          <label className="text-sm text-gray-700 dark:text-gray-300">Filas por página:</label>
          <select
            value={filasPorPagina}
            onChange={(e) => { setFilasPorPagina(parseInt(e.target.value, 10) || 10); setPagina(1); }}
            className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-white"
          >
            {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center my-5"><span className="text-green-700">Cargando...</span></div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th scope="col" className={TH}>#</th>
                    {consulta.columnas.map((c) => <th key={c.titulo} scope="col" className={TH}>{c.titulo}</th>)}
                    <th scope="col" className={TH}>Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {sinDatos ? (
                    <tr>
                      <td colSpan={consulta.columnas.length + 2} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">{consulta.vacio}</td>
                    </tr>
                  ) : (
                    visibles.map((r, i) => (
                      <tr key={consulta.clave(r, inicio + i)} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{inicio + i + 1}</td>
                        {consulta.columnas.map((c) => <td key={c.titulo} className={TD}>{(c.celda || c.valor)(r)}</td>)}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button type="button" onClick={() => setDetalle(r)} className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm">Ver detalle</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <Paginador pagina={pagina} total={totalPaginas} onCambiar={setPagina} className="mt-6" />
      </div>

      {detalle && <Detalle item={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}
