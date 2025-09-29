import React, { useState, useEffect } from "react";
import { Card, Form, Row, Col, Button, Table } from "react-bootstrap";
import logoClinica from '@/assets/logoClinica2.png';
import '../components/NuevoIngresoReportes.css';

const ReporteFaltistas = () => {
  // Filtros y datos mock
  const [filtros, setFiltros] = useState({ fechaInicio: '', fechaFin: '', sexo: '', clinica: '', jornada: '', accesovascular: '', departamento: '', noafiliacion: '' });
  const [faltistas, setFaltistas] = useState([]);
  const [todosFaltistas, setTodosFaltistas] = useState([]);
  const [buscado, setBuscado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const filasPorPagina = 10;
  const totalPaginas = Math.ceil(faltistas.length / filasPorPagina);
  const faltistasPaginados = faltistas.slice((paginaActual - 1) * filasPorPagina, paginaActual * filasPorPagina);
  const [catalogos, setCatalogos] = useState({ clinicas: [], jornadas: [], accesos: [], departamentos: [] });
  const [detalle, setDetalle] = useState({ isOpen: false, item: null });
  const abrirDetalle = (item) => setDetalle({ isOpen: true, item });
  const cerrarDetalle = () => setDetalle({ isOpen: false, item: null });

  const handleChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  const handleBuscar = async (e) => {
    e.preventDefault();
    setLoading(true);
    setBuscado(true);
    try {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechainicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechafin', filtros.fechaFin);
      if (filtros.sexo) params.append('sexo', filtros.sexo);
      if (filtros.jornada) params.append('jornada', filtros.jornada);
      if (filtros.accesovascular) params.append('accesovascular', filtros.accesovascular);
      if (filtros.departamento) params.append('departamento', filtros.departamento);
      if (filtros.clinica) params.append('clinica', filtros.clinica);
      if (filtros.noafiliacion) params.append('noafiliacion', filtros.noafiliacion);
      const res = await fetch(`http://localhost:3001/api/faltistas?${params.toString()}`);
      const data = await res.json();
      setTodosFaltistas(data);
      setFaltistas(Array.isArray(data) ? data : []);
      setPaginaActual(1);
    } catch {
      setTodosFaltistas([]);
      setFaltistas([]);
    }
    setLoading(false);
  };



  const handleLimpiar = () => {
    setFiltros({ fechaInicio: '', fechaFin: '', sexo: '', clinica: '', jornada: '', accesovascular: '', departamento: '', noafiliacion: '' });
    setFaltistas([]);
    setTodosFaltistas([]);
    setPaginaActual(1);
    setBuscado(false);
  };

  const handlePaginaChange = (nuevaPagina) => {
    setPaginaActual(nuevaPagina);
  };

  // Cargar catálogos
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/faltistas/catalogos');
        const data = await res.json();
        setCatalogos({
          clinicas: Array.isArray(data?.clinicas) ? data.clinicas : [],
          jornadas: Array.isArray(data?.jornadas) ? data.jornadas : [],
          accesos: Array.isArray(data?.accesos) ? data.accesos : [],
          departamentos: Array.isArray(data?.departamentos) ? data.departamentos : [],
        });
      } catch {
        setCatalogos({ clinicas: [], jornadas: [], accesos: [], departamentos: [] });
      }
    };
    cargarCatalogos();
  }, []);

  return (
    <div className="w-full px-4 py-6">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md mb-6">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex flex-wrap justify-center items-center gap-6">
            <img
              src={logoClinica}
              alt="Logo Clínica"
              className="h-[120px] max-w-[200px] object-contain rounded-xl shadow-md p-2"

            />
            <span className="text-2xl font-semibold text-green-800 tracking-wide dark:text-white">Reporte de Faltistas</span>
          </div>
        </div>
        <div className="p-6">
          <form onSubmit={handleBuscar}>
            <div className="flex flex-wrap gap-6 mb-6">
              <div className="w-full md:w-1/4">
                <label htmlFor="fechaInicio" className="block mb-1 font-medium text-gray-700 dark:text-white">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  id="fechaInicio"
                  name="fechaInicio"
                  value={filtros.fechaInicio}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="w-full md:w-1/4">
                <label htmlFor="fechaFin" className="block mb-1 font-medium text-gray-700 dark:text-white">
                  Fecha Fin Periodo
                </label>
                <input
                  type="date"
                  id="fechaFin"
                  name="fechaFin"
                  value={filtros.fechaFin}
                  min={filtros.fechaInicio || undefined}
                  onChange={handleChange}
                  disabled={!filtros.fechaInicio}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white disabled:opacity-50"
                />
              </div>
              {/* Sexo */}
              <div className="w-full md:w-1/4">
                <label className="block mb-1 font-medium text-gray-700 dark:text-white">Sexo</label>
                <select
                  name="sexo"
                  value={filtros.sexo}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Todos</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
              {/* Jornada */}
              <div className="w-full md:w-1/4">
                <label className="block mb-1 font-medium text-gray-700 dark:text-white">Jornada</label>
                <select
                  name="jornada"
                  value={filtros.jornada}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Todas</option>
                  {catalogos.jornadas.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
              {/* Clínica (catálogo) */}
              <div className="w-full md:w-1/4">
                <label className="block mb-1 font-medium text-gray-700 dark:text-white">Clínica</label>
                <select
                  name="clinica"
                  value={filtros.clinica}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Todas</option>
                  {catalogos.clinicas.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {/* No. Afiliación */}
              <div className="w-full md:w-1/4">
                <label className="block mb-1 font-medium text-gray-700 dark:text-white">No. Afiliación</label>
                <input
                  type="text"
                  name="noafiliacion"
                  value={filtros.noafiliacion}
                  onChange={handleChange}
                  placeholder="Ingrese no. afiliación"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                />
              </div>
              {/* Acceso Vascular */}
              <div className="w-full md:w-1/4">
                <label className="block mb-1 font-medium text-gray-700 dark:text-white">Acceso Vascular</label>
                <select
                  name="accesovascular"
                  value={filtros.accesovascular}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Todos</option>
                  {catalogos.accesos.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              {/* Departamento */}
              <div className="w-full md:w-1/4">
                <label className="block mb-1 font-medium text-gray-700 dark:text-white">Departamento</label>
                <select
                  name="departamento"
                  value={filtros.departamento}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Todos</option>
                  {catalogos.departamentos.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              
              <div className="w-full md:w-1/3 flex flex-wrap items-end gap-2">
                <Button type="submit" className="bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded w-full sm:w-[6rem]">Buscar</Button>
                <Button type="button" className="font-medium px-4 py-2 rounded border text-white bg-[#B91C1C] hover:bg-[#991B1B] border-[#991B1B] w-full sm:w-[6rem]" onClick={handleLimpiar}>Limpiar</Button>
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (filtros.fechaInicio) params.append('fechainicio', filtros.fechaInicio);
                    if (filtros.fechaFin) params.append('fechafin', filtros.fechaFin);
                    if (filtros.sexo) params.append('sexo', filtros.sexo);
                    if (filtros.jornada) params.append('jornada', filtros.jornada);
                    if (filtros.accesovascular) params.append('accesovascular', filtros.accesovascular);
                    if (filtros.departamento) params.append('departamento', filtros.departamento);
                    if (filtros.clinica) params.append('clinica', filtros.clinica);
                    if (filtros.noafiliacion) params.append('noafiliacion', filtros.noafiliacion);
                    window.open(`http://localhost:3001/api/faltistas/excel?${params.toString()}`);
                  }}
                  disabled={faltistas.length===0}
                  className={`px-4 py-2 font-medium rounded border flex items-center gap-2 ${faltistas.length===0?'bg-gray-300 text-white cursor-not-allowed border-gray-400':'bg-[#107C41] hover:bg-[#0E6A39] text-white border-[#0E6A39]'}`}
                >
                  {/* icon excel */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M4 3.5A1.5 1.5 0 0 1 5.5 2h8.879a1.5 1.5 0 0 1 1.06.44l3.121 3.121c.282.282.44.665.44 1.06V20.5A1.5 1.5 0 0 1 17.5 22h-12A1.5 1.5 0 0 1 4 20.5v-17Z"/><path d="M15 2.75V5a1 1 0 0 0 1 1h2.25" className="opacity-80"/><path d="M7.2 10h2l1.3 2.4L11.8 10h2l-2.2 4 2.2 4h-2l-1.3-2.4L9.2 18h-2l2.2-4-2.2-4Z" className="opacity-95"/></svg>
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const rows = faltistas || [];
                    const fechaGen = new Date().toLocaleString();
                    const htmlRows = rows.map((f, idx) => `
                      <tr>
                        <td>${idx+1}</td>
                        <td>${f.noafiliacion||''}</td>
                        <td>${(f.nombres||'')+' '+(f.apellidos||'')}</td>
                        <td>${f.sexo||''}</td>
                        <td>${f.jornada||''}</td>
                        <td>${f.accesovascular||''}</td>
                        <td>${f.departamento||''}</td>
                        <td>${f.clinica||''}</td>
                        <td>${f.fechafalta||''}</td>
                      </tr>`).join('');
                    const html = `
                      <html><head><meta charset="utf-8" /><title>Listado Faltistas</title>
                      <style>body{font-family:Arial,sans-serif;color:#0f172a;padding:28px}h1{color:#166534;font-size:22px;margin-bottom:6px;text-align:center}.meta{color:#475569;font-size:12px;margin-bottom:12px;text-align:center}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}th{background:#f1f5f9}.logo{display:block;margin:0 auto 10px auto;height:96px}@page{size:A4 landscape;margin:14mm}</style></head>
                      <body>
                        <img src="${logoClinica}" class="logo" />
                        <h1>Listado de Faltistas</h1>
                        <div class="meta">Generado: ${fechaGen} — Registros: ${rows.length}</div>
                        <table><thead><tr>
                          <th>#</th>
                          <th>No. Afiliación</th>
                          <th>Nombre</th>
                          <th>Sexo</th>
                          <th>Jornada</th>
                          <th>Acceso</th>
                          <th>Departamento</th>
                          <th>Clínica</th>
                          <th>Fecha Falta</th>
                        </tr></thead><tbody>${htmlRows}</tbody></table>
                      </body></html>`;
                    const w = window.open('', '_blank'); if(!w) return; w.document.open(); w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>w.print(),300);
                  }}
                  disabled={faltistas.length===0}
                  className={`px-4 py-2 font-medium rounded border flex items-center gap-2 ${faltistas.length===0?'bg-gray-300 text-white cursor-not-allowed border-gray-400':'bg-[#DC2626] hover:bg-[#B91C1C] text-white border-[#991B1B]'}`}
                >
                  {/* icon pdf */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 2h9.379a1.5 1.5 0 0 1 1.06.44L20 5v14a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z"/><path d="M7.5 10h2.25a2.25 2.25 0 1 1 0 4.5H7.5V10Zm1.5 1.5v1.5h.75a.75.75 0 0 0 0-1.5H9ZM12.75 10h2.25a.75.75 0 0 1 .75.75V15h-1.5v-1.125h-1.5V15h-1.5v-3.75a.75.75 0 0 1 .75-.75Zm1.5 1.5V12h-1.5v-.75h1.5Z" className="opacity-95"/></svg>
                  PDF
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table striped bordered hover className="min-w-full divide-y divide-gray-300 dark:divide-slate-700 text-sm text-left text-gray-800 dark:text-gray-100">
          <thead className="bg-gray-100 dark:bg-slate-800 text-xs uppercase font-semibold text-gray-700 dark:text-gray-200">
            <tr>
              <th className="min-w-[60px] px-4 py-2">#</th>
              <th className="min-w-[140px] px-4 py-2">No. Afiliación</th>
              <th className="min-w-[220px] px-4 py-2">Nombres y Apellidos</th>
              <th className="min-w-[80px] px-4 py-2">Sexo</th>
              <th className="min-w-[140px] px-4 py-2">Jornada</th>
              <th className="min-w-[160px] px-4 py-2">Acceso Vascular</th>
              <th className="min-w-[160px] px-4 py-2">Departamento</th>
              <th className="min-w-[180px] px-4 py-2">Clínica</th>
              <th className="min-w-[140px] px-4 py-2">Fecha de Falta</th>
              <th className="min-w-[120px] px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" className="text-center px-4 py-4">Cargando...</td></tr>
            ) : !buscado ? (
              <tr><td colSpan="10" className="text-center px-4 py-4">Realice una búsqueda para ver resultados</td></tr>
            ) : faltistasPaginados.length === 0 ? (
              <tr><td colSpan="10" className="text-center px-4 py-4">No se encontraron faltistas</td></tr>
            ) : (
              faltistasPaginados.map((f, idx) => (
                <tr key={f.noafiliacion + f.fechafalta}>
                  <td className="px-4 py-2">{(paginaActual - 1) * filasPorPagina + idx + 1}</td>
                  <td className="px-4 py-2">{f.noafiliacion}</td>
                  <td className="px-4 py-2">{f.nombres} {f.apellidos}</td>
                  <td className="px-4 py-2">{f.sexo || ''}</td>
                  <td className="px-4 py-2">{f.jornada || ''}</td>
                  <td className="px-4 py-2">{f.accesovascular || ''}</td>
                  <td className="px-4 py-2">{f.departamento || ''}</td>
                  <td className="px-4 py-2">{f.clinica}</td>
                  <td className="px-4 py-2">{f.fechafalta}</td>
                  <td className="px-4 py-2">
                    <button type="button" onClick={() => abrirDetalle(f)} className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm">Ver detalle</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
      {/* Paginación */}
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }} className="mt-2">
          <Button
            size="sm"
            className="btn-buscar"
            disabled={paginaActual === 1}
            onClick={() => handlePaginaChange(paginaActual - 1)}
          >
            Anterior
          </Button>
          {[...Array(totalPaginas)].map((_, i) => (
            <Button
              key={i}
              size="sm"
              variant={paginaActual === i + 1 ? 'success' : 'outline-success'}
              onClick={() => handlePaginaChange(i + 1)}
            >
              {i + 1}
            </Button>
          ))}
          <Button
            size="sm"
            className="btn-buscar"
            disabled={paginaActual === totalPaginas}
            onClick={() => handlePaginaChange(paginaActual + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Modal Detalle (patrón ConsultaPsicologia) */}
      {detalle.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Detalle de Faltista</h3>
                <button onClick={cerrarDetalle} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
              </div>
              {(() => {
                const it = detalle.item || {};
                const nombre = [(it.nombres||''), (it.apellidos||'')].filter(Boolean).join(' ');
                return (
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><span className="font-semibold">No. Afiliación:</span> {it.noafiliacion || ''}</div>
                      <div><span className="font-semibold">Sexo:</span> {it.sexo || ''}</div>
                      <div className="md:col-span-2"><span className="font-semibold">Nombre Completo:</span> {nombre || ''}</div>
                      <div><span className="font-semibold">Jornada:</span> {it.jornada || ''}</div>
                      <div><span className="font-semibold">Acceso Vascular:</span> {it.accesovascular || ''}</div>
                      <div><span className="font-semibold">Departamento:</span> {it.departamento || ''}</div>
                      <div><span className="font-semibold">Clínica:</span> {it.clinica || ''}</div>
                      <div><span className="font-semibold">Fecha Falta:</span> {it.fechafalta || ''}</div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          const it = detalle.item || {};
                          const nombre = [(it.nombres||''), (it.apellidos||'')].filter(Boolean).join(' ');
                          const html = `
                            <html><head><meta charset='utf-8'/><title>Detalle Faltista ${it.noafiliacion||''}</title>
                            <style>body{font-family:Arial,sans-serif;color:#0f172a;padding:28px}h1{color:#166534;font-size:22px;margin:4px 0 12px;text-align:center}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px}.row{margin:6px 0}.label{font-weight:700;color:#0f172a}.logo{display:block;margin:0 auto 10px auto;height:96px}@page{size:A4 portrait;margin:14mm}</style>
                            </head><body>
                            <img src='${logoClinica}' class='logo' />
                            <h1>Detalle de Faltista</h1>
                            <div class='grid'>
                              <div class='row'><span class='label'>No. Afiliación:</span> ${it.noafiliacion||''}</div>
                              <div class='row'><span class='label'>Sexo:</span> ${it.sexo||''}</div>
                              <div class='row' style='grid-column:1/-1'><span class='label'>Nombre Completo:</span> ${nombre||''}</div>
                              <div class='row'><span class='label'>Jornada:</span> ${it.jornada||''}</div>
                              <div class='row'><span class='label'>Acceso Vascular:</span> ${it.accesovascular||''}</div>
                              <div class='row'><span class='label'>Departamento:</span> ${it.departamento||''}</div>
                              <div class='row'><span class='label'>Clínica:</span> ${it.clinica||''}</div>
                              <div class='row'><span class='label'>Fecha Falta:</span> ${it.fechafalta||''}</div>
                            </div>
                            </body></html>`;
                          const w = window.open('', '_blank'); if(!w) return; w.document.open(); w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>w.print(),300);
                        }}
                        className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Descargar PDF
                      </button>
                      <button onClick={cerrarDetalle} className="px-4 py-2 rounded-md bg-green-700 hover:bg-green-800 text-white">Cerrar</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReporteFaltistas;
