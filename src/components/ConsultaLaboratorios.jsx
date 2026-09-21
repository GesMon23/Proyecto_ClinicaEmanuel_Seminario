import React, { useEffect, useState } from 'react';
import logoClinica from '@/assets/logoClinica2.png';
import { formatearFecha } from '@/utils/fechas';
import Paginador from './Paginador';
import { nombreCompleto } from './consultaPacientes/calculos';
import { DetalleLaboratorio } from './consultaPacientes/detalles';
import { imprimirListadoLaboratorios } from './consultaPacientes/documentos';
import { useDetalleLaboratorio } from './consultaPacientes/useDetalleLaboratorio';
import { FILTROS_VACIOS, cargarCatalogos, consultarHistorial } from './consultaLaboratorios/laboratorios';

const ENTRADA = 'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 dark:bg-slate-800 dark:text-white dark:border-slate-600';
const TH = 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider';
const TD = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200';
const COLUMNAS = ['#', 'No. Afiliación', 'Paciente', 'Sexo', 'ID Laboratorio', 'Fecha', 'Periodicidad', 'Examen', 'Virología', 'HIV', 'Usuario', 'Acciones'];

const Campo = ({ etiqueta, ancho = 'lg:col-span-2', children }) => (
  <div className={`col-span-1 ${ancho}`}>
    <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">{etiqueta}</label>
    {children}
  </div>
);

const ConsultaLaboratorios = () => {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [catalogos, setCatalogos] = useState({ periodicidades: [], sexos: [] });
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(10);
  const { detalle, ultimos, abrir, cerrar } = useDetalleLaboratorio();

  useEffect(() => { cargarCatalogos().then(setCatalogos); }, []);

  const campo = (name) => ({ value: filtros[name], onChange: (e) => setFiltros((f) => ({ ...f, [name]: e.target.value })) });

  const buscar = async () => {
    setError('');
    setHistorial([]);
    setLoading(true);
    setPagina(1);
    try {
      setHistorial(await consultarHistorial(filtros));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const limpiar = () => {
    setFiltros(FILTROS_VACIOS);
    setHistorial([]);
    setError('');
    setPagina(1);
  };

  const totalPaginas = Math.max(1, Math.ceil(historial.length / filasPorPagina));
  const inicio = (pagina - 1) * filasPorPagina;
  const visibles = historial.slice(inicio, inicio + filasPorPagina);

  return (
    <div className="mt-2">
      <div className="flex flex-wrap justify-center items-center gap-6 mb-4">
        <img src={logoClinica} alt="Logo Clínica" className="h-[120px] max-w-[220px] object-contain rounded-xl shadow-md p-2" />
        <span className="text-2xl sm:text-3xl font-semibold tracking-wide text-green-800 dark:text-white">Consulta de Laboratorios</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        <Campo etiqueta="Desde" ancho="lg:col-span-1">
          <input type="date" {...campo('desde')} max={filtros.hasta || undefined} className={`${ENTRADA} shadow-sm`} />
        </Campo>
        <Campo etiqueta="Hasta" ancho="lg:col-span-1">
          <input
            type="date" {...campo('hasta')} min={filtros.desde || undefined} disabled={!filtros.desde}
            className={`${ENTRADA} shadow-sm disabled:opacity-60 disabled:cursor-not-allowed`}
          />
        </Campo>
        <Campo etiqueta="No. Afiliación">
          <input type="text" {...campo('noAfiliacion')} placeholder="Ingrese número de afiliación" className={ENTRADA} />
        </Campo>
        <Campo etiqueta="Periodicidad">
          <select {...campo('periodicidad')} className={ENTRADA}>
            <option value="">Todas</option>
            {catalogos.periodicidades.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="No. Laboratorio">
          <input type="text" {...campo('idLaboratorio')} placeholder="Ingrese el ID de laboratorio" className={ENTRADA} />
        </Campo>
        <Campo etiqueta="Sexo">
          <select {...campo('sexo')} className={ENTRADA}>
            <option value="">Todos</option>
            {catalogos.sexos.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Campo>

        <div className="flex items-end gap-3 col-span-1 lg:col-span-2">
          <button
            type="button" onClick={buscar} disabled={loading}
            className={`px-6 py-2 font-semibold rounded-md transition-colors text-white ${loading ? 'bg-green-700 cursor-not-allowed' : 'bg-green-800 hover:bg-green-900 border border-green-900'}`}
          >
            Buscar
          </button>
          <button type="button" onClick={limpiar} disabled={loading} className="px-6 py-2 font-semibold rounded-md bg-red-700 hover:bg-red-800 text-white border border-red-800">
            Limpiar
          </button>
          <button
            type="button" onClick={() => imprimirListadoLaboratorios(historial)} disabled={loading || historial.length === 0}
            className={`px-6 py-2 font-semibold rounded-md text-white ${historial.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800'}`}
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
                  <tr>{COLUMNAS.map((c) => <th key={c} scope="col" className={TH}>{c}</th>)}</tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {historial.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMNAS.length} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No hay registros para mostrar.</td>
                    </tr>
                  ) : (
                    visibles.map((it, idx) => (
                      <tr key={it.id_laboratorio || idx} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{inicio + idx + 1}</td>
                        <td className={TD}>{it.no_afiliacion}</td>
                        <td className={TD}>{nombreCompleto(it)}</td>
                        <td className={TD}>{it.sexo ?? ''}</td>
                        <td className={TD}>{it.id_laboratorio}</td>
                        <td className={TD}>{formatearFecha(it.fecha_laboratorio)}</td>
                        <td className={TD}>{it.periodicidad}</td>
                        <td className={TD}>{it.examen_realizado ? 'Sí' : 'No'}</td>
                        <td className={TD}>{it.virologia}</td>
                        <td className={TD}>{it.hiv}</td>
                        <td className={TD}>{it.usuario_creacion}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button type="button" onClick={() => abrir(it)} className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm">
                            Ver detalle
                          </button>
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

      {detalle && <DetalleLaboratorio item={detalle} ultimos={ultimos} onClose={cerrar} />}
    </div>
  );
};

export default ConsultaLaboratorios;
