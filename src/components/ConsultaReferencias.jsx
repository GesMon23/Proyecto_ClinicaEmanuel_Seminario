import React, { useEffect, useState } from 'react';
import { Table, Form, Row, Col, Card, Spinner, Button, Modal } from 'react-bootstrap';
import api from '../config/api';
import logoClinica from "@/assets/logoClinica2.png"

const ConsultaReferencias = () => {
  const [referencias, setReferencias] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [idMedico, setIdMedico] = useState('');
  const [noAfiliacion, setNoAfiliacion] = useState('');
  const [idReferencia, setIdReferencia] = useState('');
  const [sexo, setSexo] = useState('');
  const [medicos, setMedicos] = useState([]);
  const [detalle, setDetalle] = useState({ isOpen: false, item: null });

  useEffect(() => {
    fetchMedicos();
    fetchReferencias();
    // eslint-disable-next-line
  }, []);

  const fetchMedicos = async () => {
    try {
      const res = await api.get('/medicos');
      setMedicos(res.data);
    } catch (err) {
      setMedicos([]);
    }
  };

  const fetchReferencias = async () => {
    setLoading(true);
    try {
      const params = {};
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      if (idMedico) params.idmedico = idMedico;
      if (noAfiliacion) params.noafiliacion = noAfiliacion;
      if (idReferencia) params.idreferencia = idReferencia;
      if (sexo) params.sexo = sexo;
      const res = await api.get('/api/referencias/consulta', { params });
      setReferencias(res.data);
    } catch (err) {
      setReferencias([]);
    }
    setLoading(false);
  };

  const abrirDetalle = (item) => setDetalle({ isOpen: true, item });
  const cerrarDetalle = () => setDetalle({ isOpen: false, item: null });

  const descargarPDF = (item) => {
    const it = item || {};
    const paciente = [it.primernombre, it.segundonombre, it.primerapellido, it.segundoapellido].filter(Boolean).join(' ');
    const fecha = it.fechareferencia ? new Date(it.fechareferencia).toLocaleString() : '';

    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Referencia ${it.idreferencia || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
          h1 { color: #166534; font-size: 20px; margin-bottom: 8px; text-align: center; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
          .row { margin: 6px 0; }
          .label { font-weight: bold; }
          .box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; }
          hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
          .logo { display: block; margin: 0 auto 12px auto; height: 104px; }
          @page { size: A4 landscape; margin: 16mm; }
        </style>
      </head>
      <body>
        <img src="${logoClinica}" class="logo" />
        <h1>Detalle de Referencia</h1>
        <div class="grid">
          <div class="row"><span class="label">ID Referencia:</span> ${it.idreferencia || ''}</div>
          <div class="row"><span class="label">No. Afiliación:</span> ${it.noafiliacion || ''}</div>
          <div class="row" style="grid-column: 1 / -1;"><span class="label">Paciente:</span> ${paciente || ''}</div>
          <div class="row"><span class="label">Sexo:</span> ${it.sexo || ''}</div>
          <div class="row"><span class="label">Fecha:</span> ${fecha}</div>
        </div>
        <hr />
        <div class="grid">
          <div class="row"><span class="label">Motivo Traslado:</span> ${it.motivotraslado || ''}</div>
          <div class="row"><span class="label">Especialidad:</span> ${it.especialidadreferencia || ''}</div>
          <div class="row"><span class="label">ID Médico:</span> ${it.idmedico || ''}</div>
          <div class="row"><span class="label">Médico:</span> ${it.nombremedico || ''}</div>
        </div>
      </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };

  const descargarListadoPDF = () => {
    const rows = referenciasFiltradas;
    const fechaGen = new Date().toLocaleString();
    const htmlRows = rows.map((it, idx) => {
      const paciente = [it.primernombre, it.segundonombre, it.primerapellido, it.segundoapellido].filter(Boolean).join(' ');
      const fecha = it.fechareferencia ? new Date(it.fechareferencia).toLocaleDateString() : '';
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${it.idreferencia || ''}</td>
          <td>${it.noafiliacion || ''}</td>
          <td>${paciente}</td>
          <td>${it.sexo || ''}</td>
          <td>${fecha}</td>
          <td>${it.motivotraslado || ''}</td>
          <td>${it.nombremedico || ''}</td>
          <td>${it.especialidadreferencia || ''}</td>
        </tr>`;
    }).join('');

    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Listado Referencias</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
          h1 { color: #166534; font-size: 20px; margin-bottom: 8px; text-align:center; }
          .meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; }
          .logo { display: block; margin: 0 auto 12px auto; height: 104px; }
          @page { size: A4 landscape; margin: 16mm; }
        </style>
      </head>
      <body>
        <img src="${logoClinica}" class="logo" />
        <h1>Listado de Referencias</h1>
        <div class="meta">Generado: ${fechaGen} - Registros: ${rows.length}</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>ID Referencia</th>
              <th>No. Afiliación</th>
              <th>Paciente</th>
              <th>Sexo</th>
              <th>Fecha</th>
              <th>Motivo Traslado</th>
              <th>Médico</th>
              <th>Especialidad</th>
            </tr>
          </thead>
          <tbody>
            ${htmlRows}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };

  const referenciasFiltradas = referencias.filter(ref => {
    if (!filtro) return true;
    const nombrePaciente = [ref.primernombre, ref.segundonombre, ref.primerapellido, ref.segundoapellido].filter(Boolean).join(' ').toLowerCase();
    return (
      String(ref.noafiliacion).includes(filtro.toLowerCase()) ||
      nombrePaciente.includes(filtro.toLowerCase()) ||
      (ref.nombremedico || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (ref.especialidadreferencia || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (ref.motivotraslado || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (ref.sexo || '').toLowerCase().includes(filtro.toLowerCase())
    );
  });

  return (
    <div className="w-full px-4 md:px-8 mt-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md w-full">
        <div className="p-6">
          {/* Encabezado */}
          <div className="flex flex-wrap justify-center items-center gap-6 mb-4">
            <img
              src={logoClinica}
              alt="Logo Clínica"
              className="h-[160px] max-w-[260px] object-contain rounded-xl shadow-md p-2"
            />
            <span className="text-2xl sm:text-3xl font-semibold tracking-wide text-green-800 dark:text-white">
              Consulta de Referencias
            </span>
          </div>

          {/* Filtros */}
          <form className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
              <div className="col-span-1 lg:col-span-1">
                <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">Desde</label>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  max={hasta || undefined}
                  className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="col-span-1 lg:col-span-1">
                <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  min={desde || undefined}
                  disabled={!desde}
                  className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">
                  ID Médico
                </label>
                <select
                  value={idMedico}
                  onChange={(e) => setIdMedico(e.target.value)}
                  className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 dark:bg-slate-800 dark:text-white dark:border-slate-600"
                >
                  <option value="">Todos</option>
                  {medicos.map((med) => (
                    <option key={med.idmedico} value={med.idmedico}>
                      {med.nombrecompleto}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">No. Afiliación</label>
                <input
                  type="text"
                  placeholder="Número de afiliación"
                  value={noAfiliacion}
                  onChange={(e) => setNoAfiliacion(e.target.value)}
                  className="w-full border rounded-md px-4 py-2 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">No. Informe</label>
                <input
                  type="text"
                  placeholder="ID de referencia"
                  value={idReferencia}
                  onChange={(e) => setIdReferencia(e.target.value)}
                  className="w-full border rounded-md px-4 py-2 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-600"
                />
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">Sexo</label>
                <select
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value)}
                  className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 dark:bg-slate-800 dark:text-white dark:border-slate-600"
                >
                  <option value="">Todos</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">
                  Búsqueda rápida
                </label>
                <input
                  type="text"
                  placeholder="Afiliación, paciente, motivo..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="w-full border rounded-md px-4 py-2 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={fetchReferencias}
                disabled={loading}
                className={`px-6 py-2 font-semibold rounded-md transition-colors ${loading
                    ? 'bg-green-700 cursor-not-allowed text-white'
                    : 'bg-green-800 hover:bg-green-900 text-white border border-green-900'
                  }`}
              >
                Buscar
              </button>

              <button
                type="button"
                onClick={() => {
                  setDesde('');
                  setHasta('');
                  setIdMedico('');
                  setFiltro('');
                  setReferencias([]);
                }}
                disabled={loading}
                className="px-6 py-2 font-semibold rounded-md bg-red-700 hover:bg-red-800 text-white border border-red-800"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={descargarListadoPDF}
                disabled={loading || referenciasFiltradas.length === 0}
                className={`px-6 py-2 font-semibold rounded-md ${referenciasFiltradas.length === 0 ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-700 hover:bg-blue-800 text-white'}`}
              >
                Descargar PDF
              </button>
            </div>
          </form>
          <br />
          {/* Spinner o Tabla */}
          {loading ? (
            <div className="text-center my-5">
              <Spinner animation="border" variant="success" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table striped bordered hover className="min-w-full divide-y divide-gray-300 dark:divide-slate-700 text-sm text-left text-gray-800 dark:text-gray-100">

                <thead className="bg-gray-100 dark:bg-slate-800 text-xs uppercase font-semibold text-gray-700 dark:text-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">ID Referencia</th>
                    <th className="px-4 py-2 text-left">No. Afiliación</th>
                    <th className="px-4 py-2 text-left">Paciente</th>
                    <th className="px-4 py-2 text-left">Sexo</th>
                    <th className="px-4 py-2 text-left">Fecha Referencia</th>
                    <th className="px-4 py-2 text-left">Motivo Traslado</th>
                    <th className="px-4 py-2 text-left">Médico</th>
                    <th className="px-4 py-2 text-left">Especialidad</th>
                    <th className="px-4 py-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {referenciasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-4 text-gray-600 dark:text-gray-300">
                        No se encontraron referencias.
                      </td>
                    </tr>
                  ) : (
                    referenciasFiltradas.map((ref, idx) => (
                      <tr key={ref.idreferencia} className="border-t border-gray-200 dark:border-slate-700">
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2">{ref.idreferencia}</td>
                        <td className="px-3 py-2">{ref.noafiliacion}</td>
                        <td className="px-3 py-2">
                          {[ref.primernombre, ref.segundonombre, ref.primerapellido, ref.segundoapellido]
                            .filter(Boolean)
                            .join(' ')}
                        </td>
                        <td className="px-3 py-2">{ref.sexo}</td>
                        <td className="px-3 py-2">
                          {ref.fechareferencia ? new Date(ref.fechareferencia).toLocaleDateString() : ''}
                        </td>
                        <td className="px-3 py-2">{ref.motivotraslado}</td>
                        <td className="px-3 py-2">{ref.nombremedico}</td>
                        <td className="px-3 py-2">{ref.especialidadreferencia}</td>
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => abrirDetalle(ref)} className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm">Ver detalle</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {/* Modal dentro del contenedor */}
          {detalle.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Detalle de Referencia</h3>
                    <button onClick={cerrarDetalle} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
                  </div>
                  {(() => {
                    const it = detalle.item || {};
                    const paciente = [it.primernombre, it.segundonombre, it.primerapellido, it.segundoapellido].filter(Boolean).join(' ');
                    return (
                      <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><span className="font-semibold">ID Referencia:</span> {it.idreferencia || ''}</div>
                          <div><span className="font-semibold">No. Afiliación:</span> {it.noafiliacion || ''}</div>
                          <div className="md:col-span-2"><span className="font-semibold">Paciente:</span> {paciente || ''}</div>
                          <div><span className="font-semibold">Sexo:</span> {it.sexo || ''}</div>
                          <div><span className="font-semibold">Fecha:</span> {it.fechareferencia ? new Date(it.fechareferencia).toLocaleString() : ''}</div>
                        </div>
                        <hr className="border-slate-200 dark:border-slate-700" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><span className="font-semibold">Motivo Traslado:</span> {it.motivotraslado || ''}</div>
                          <div><span className="font-semibold">Especialidad:</span> {it.especialidadreferencia || ''}</div>
                          <div><span className="font-semibold">ID Médico:</span> {it.idmedico || ''}</div>
                          <div><span className="font-semibold">Médico:</span> {it.nombremedico || ''}</div>
                        </div>
                        <div className="flex justify-end gap-3">
                          <button onClick={() => descargarPDF(detalle.item)} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white">Descargar PDF</button>
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
      </div>
    </div>
  );
};

export default ConsultaReferencias;
