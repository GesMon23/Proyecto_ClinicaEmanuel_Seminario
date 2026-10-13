import React, { useEffect, useState } from 'react';
import logoClinica from '@/assets/logoClinica2.png';
import api from '@/config/api';
import CustomModal from '@/components/CustomModal';
import Paginador from '@/components/Paginador';
import { BOTON_LIMPIAR, BOTON_PRINCIPAL } from '@/constants/botones';
import { useAviso } from '@/hooks/useAviso';
import { cn } from '@/utils/cn';
import '../NuevoIngresoReportes.css';
import { FILTROS } from './definiciones';
import { imprimirDetalle, imprimirListado } from './impresion';

const ENTRADA = 'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-600';
const TH = 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider';
const TD = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200';
const CATALOGOS_VACIOS = { estados: [], jornadas: [], accesos: [], departamentos: [], sexos: [] };

const vacios = (lista) => Object.fromEntries(lista.map((k) => [k, '']));

// Parámetros de consulta con los filtros que tienen valor
const aParametros = (nombres, valores) =>
  Object.fromEntries(nombres.filter((k) => valores[k]).map((k) => [FILTROS[k].param, valores[k]]));

function CampoFiltro({ nombre, def, etiquetaFecha, valores, catalogos, onCambio }) {
  const valor = valores[nombre];
  const id = `filtro-${nombre}`;
  let etiqueta = def.etiqueta;
  let control;
  if (def.tipo === 'fechaInicio' || def.tipo === 'fechaFin') {
    const fin = def.tipo === 'fechaFin';
    etiqueta = etiquetaFecha;
    control = (
      <input
        type="date" id={id} value={valor} onChange={(e) => onCambio(nombre, e.target.value)}
        min={fin ? valores.fechaInicio || undefined : undefined} disabled={fin && !valores.fechaInicio}
        className={`${ENTRADA} ${fin ? 'disabled:opacity-50' : ''}`}
      />
    );
  } else if (def.tipo === 'texto') {
    control = <input type="text" id={id} value={valor} onChange={(e) => onCambio(nombre, e.target.value)} placeholder={def.marcador} className={ENTRADA} />;
  } else {
    control = (
      <select id={id} value={valor} onChange={(e) => onCambio(nombre, e.target.value)} className={ENTRADA}>
        <option value="">{def.todos}</option>
        {(catalogos[def.catalogo] || []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <div className="col-span-1">
      <label htmlFor={id} className="block mb-1 font-medium text-gray-700 dark:text-white">{etiqueta}</label>
      {control}
    </div>
  );
}

const IconoExcel = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M4 3.5A1.5 1.5 0 0 1 5.5 2h8.879a1.5 1.5 0 0 1 1.06.44l3.121 3.121c.282.282.44.665.44 1.06V20.5A1.5 1.5 0 0 1 17.5 22h-12A1.5 1.5 0 0 1 4 20.5v-17Z" />
    <path d="M15 2.75V5a1 1 0 0 0 1 1h2.25" className="opacity-80" />
    <path d="M7.2 10h2l1.3 2.4L11.8 10h2l-2.2 4 2.2 4h-2l-1.3-2.4L9.2 18h-2l2.2-4-2.2-4Z" className="opacity-95" />
  </svg>
);
const IconoPdf = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M6 2h9.379a1.5 1.5 0 0 1 1.06.44L20 5v14a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z" />
    <path d="M7.5 10h2.25a2.25 2.25 0 1 1 0 4.5H7.5V10Zm1.5 1.5v1.5h.75a.75.75 0 0 0 0-1.5H9ZM12.75 10h2.25a.75.75 0 0 1 .75.75V15h-1.5v-1.125h-1.5V15h-1.5v-3.75a.75.75 0 0 1 .75-.75Zm1.5 1.5V12h-1.5v-.75h1.5Z" className="opacity-95" />
  </svg>
);

// Pantalla de un reporte de pacientes con filtros, tabla paginada, detalle, Excel y PDF. `reporte` viene de definiciones.js
export default function ReporteTabular({ reporte }) {
  const [valores, setValores] = useState(() => vacios(reporte.filtros));
  const [catalogos, setCatalogos] = useState(CATALOGOS_VACIOS);
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(10);
  const { modal, mostrar } = useAviso();
  const [etiquetaInicio, etiquetaFin] = reporte.etiquetasFecha || ['Fecha Inicio Periodo', 'Fecha Fin Periodo'];

  useEffect(() => {
    api.get(reporte.rutaCatalogos)
      .then(({ data }) => setCatalogos({ ...CATALOGOS_VACIOS, ...Object.fromEntries(Object.keys(CATALOGOS_VACIOS).map((k) => [k, data?.[k] || []])) }))
      .catch(() => setCatalogos(CATALOGOS_VACIOS));
  }, [reporte]);

  const cambiar = (nombre, valor) => setValores((v) => ({ ...v, [nombre]: valor }));

  const buscar = async (e) => {
    e.preventDefault();
    setCargando(true);
    setPagina(1);
    try {
      const { data } = await api.get(reporte.rutaDatos, { params: aParametros(reporte.filtros, valores) });
      const lista = Array.isArray(data) ? data : [];
      setPacientes(lista);
      if (lista.length === 0 && reporte.avisos?.sinResultados) mostrar('error', 'Error', reporte.avisos.sinResultados);
    } catch {
      setPacientes([]);
      if (reporte.avisos?.error) mostrar('error', 'Error', reporte.avisos.error);
    } finally {
      setCargando(false);
    }
  };

  const limpiar = () => {
    setValores(vacios(reporte.filtros));
    setPacientes([]);
    setPagina(1);
  };

  const exportarExcel = () => {
    const consulta = new URLSearchParams(aParametros(reporte.filtros, valores)).toString();
    const base = reporte.excelConBaseUrl ? (api?.defaults?.baseURL || '').replace(/\/$/, '') : '';
    window.open(`${base}${reporte.rutaExcel}?${consulta}`);
    if (reporte.avisos?.excel) mostrar('success', 'Éxito', reporte.avisos.excel);
  };

  const totalPaginas = Math.max(1, Math.ceil(pacientes.length / filasPorPagina));
  const inicio = (pagina - 1) * filasPorPagina;
  const visibles = pacientes.slice(inicio, inicio + filasPorPagina);
  const sinDatos = pacientes.length === 0;
  const columnasTotales = reporte.columnas.length + 2;

  return (
    <>
      <CustomModal {...modal} />
      <div className="w-full px-4 py-6">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md mb-6">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex flex-wrap justify-center items-center gap-6">
              <img src={logoClinica} alt="Logo Clínica" className="h-[120px] max-w-[200px] object-contain rounded-xl shadow-md p-2" />
              <span className={`text-2xl font-semibold tracking-wide ${reporte.colorTitulo || 'text-green-800'} dark:text-white`}>{reporte.titulo}</span>
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={buscar}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                {reporte.filtros.map((nombre) => (
                  <CampoFiltro
                    key={nombre} nombre={nombre} def={FILTROS[nombre]} valores={valores} catalogos={catalogos} onCambio={cambiar}
                    etiquetaFecha={nombre === 'fechaInicio' ? etiquetaInicio : etiquetaFin}
                  />
                ))}
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-center sm:justify-start">
                <button type="submit" className={cn(BOTON_PRINCIPAL, 'w-full sm:w-auto')}>Buscar</button>
                <button type="button" onClick={limpiar} className={cn(BOTON_LIMPIAR, 'w-full sm:w-auto')}>
                  Limpiar
                </button>
                <button
                  type="button" onClick={exportarExcel} disabled={sinDatos}
                  className={`px-4 py-2 font-medium rounded border flex items-center gap-2 w-full sm:w-auto ${sinDatos ? 'bg-gray-300 text-white cursor-not-allowed border-gray-400' : 'bg-[#107C41] hover:bg-[#0E6A39] text-white border-[#0E6A39]'}`}
                >
                  <IconoExcel /> Excel
                </button>
                <button
                  type="button" onClick={() => imprimirListado(reporte.listado, pacientes)} disabled={sinDatos}
                  className={`px-4 py-2 font-medium rounded border flex items-center gap-2 w-full sm:w-auto ${sinDatos ? 'bg-gray-300 text-white cursor-not-allowed border-gray-400' : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white border-[#991B1B]'}`}
                >
                  <IconoPdf /> PDF
                </button>
              </div>
            </form>
          </div>
        </div>

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
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th scope="col" className={`min-w-[60px] ${TH}`}>#</th>
                  {reporte.columnas.map((c) => <th key={c.titulo} scope="col" className={TH} style={{ minWidth: c.ancho }}>{c.titulo}</th>)}
                  <th scope="col" className={`min-w-[120px] ${TH}`}>Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                {cargando || sinDatos ? (
                  <tr>
                    <td colSpan={columnasTotales} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {cargando ? 'Cargando...' : reporte.vacio}
                    </td>
                  </tr>
                ) : (
                  visibles.map((p, i) => (
                    <tr key={`${p.noafiliacion}-${inicio + i}`} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{inicio + i + 1}</td>
                      {reporte.columnas.map((c) => <td key={c.titulo} className={TD}>{c.valor(p)}</td>)}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button type="button" onClick={() => setDetalle(p)} className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm">Ver detalle</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {detalle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">{reporte.detalle.titulo}</h3>
                  <button onClick={() => setDetalle(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reporte.detalle.campos.map((c) => (
                      <div key={c.etiqueta} className={c.completo ? 'md:col-span-2' : undefined}>
                        <span className="font-semibold">{c.etiqueta}:</span> {c.valor(detalle)}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button type="button" onClick={() => imprimirDetalle(reporte.detalle, detalle)} className="px-4 py-2 font-medium rounded bg-blue-600 hover:bg-blue-700 text-white">Descargar PDF</button>
                    <button type="button" onClick={() => setDetalle(null)} className="px-4 py-2 font-medium rounded bg-gray-200 hover:bg-gray-300 text-gray-800 border">Cerrar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <Paginador pagina={pagina} total={totalPaginas} onCambiar={setPagina} className="mt-6" />
      </div>
    </>
  );
}
