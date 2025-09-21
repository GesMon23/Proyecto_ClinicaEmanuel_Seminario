import React, { useState } from 'react';
import api from '../config/api';
import logoClinica from '@/assets/logoClinica2.png';

const ConsultaPsicologia = () => {
  const [noAfiliacion, setNoAfiliacion] = useState('');
  const [idInforme, setIdInforme] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [sexo, setSexo] = useState('');
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detalle, setDetalle] = useState({ isOpen: false, item: null });

  const abrirDetalle = (item) => setDetalle({ isOpen: true, item });
  const cerrarDetalle = () => setDetalle({ isOpen: false, item: null });

  const buscar = async () => {
    setError('');
    setRegistros([]);
    setLoading(true);
    try {
      const params = {};
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      if (noAfiliacion) params.noafiliacion = noAfiliacion;
      if (idInforme) params.idinforme = idInforme;
      if (sexo) params.sexo = sexo;
      const { data } = await api.get('/api/psicologia/historial', { params });
      if (data?.success) {
        setRegistros(data.data || []);
      } else {
        setError(data?.message || 'No se pudo obtener el historial.');
      }
    } catch (e) {
      setError('Error al consultar el historial.');
    } finally {
      setLoading(false);
    }
  };

  const limpiar = () => {
    setNoAfiliacion('');
    setIdInforme('');
    setDesde('');
    setHasta('');
    setSexo('');
    setRegistros([]);
    setError('');
  };

  const descargarPDF = (item) => {
    const it = item || {};
    const pn = it.primer_nombre ?? it.primernombre ?? '';
    const sn = it.segundo_nombre ?? it.segundonombre ?? '';
    const pa = it.primer_apellido ?? it.primerapellido ?? '';
    const sa = it.segundo_apellido ?? it.segundoapellido ?? '';
    const sexo = it.sexo ?? it.Sexo ?? '';
    const paciente = [pn, sn, pa, sa].filter(Boolean).join(' ');
    const fecha = it.fecha_creacion ? new Date(it.fecha_creacion).toLocaleString() : '';

    // Parseo seguro de KDQOL
    let kdqolObj = null;
    try {
      kdqolObj = typeof it.kdqol === 'string' ? JSON.parse(it.kdqol) : it.kdqol;
    } catch (_) { kdqolObj = null; }
    const getNum = (v) => {
      const n = typeof v === 'string' ? parseFloat(v) : v;
      return isNaN(n) ? null : n;
    };
    const dims = [
      { key: 'fisico_mental', label: 'Físico y Mental' },
      { key: 'enfermedad_renal', label: 'Enfermedad Renal' },
      { key: 'sintomas_problemas', label: 'Síntomas y Problemas' },
      { key: 'efectos_enfermedad', label: 'Efectos de la Enfermedad' },
      { key: 'vida_diaria', label: 'Vida Diaria' },
      // claves alternativas posibles
      { key: 'puntaje_fisico', label: 'Puntaje Físico' },
      { key: 'puntaje_mental', label: 'Puntaje Mental' },
      { key: 'puntaje_sintomas', label: 'Puntaje Síntomas' },
      { key: 'puntaje_carga', label: 'Puntaje Carga' },
      { key: 'puntaje_efectos', label: 'Puntaje Efectos' },
    ];
    const kdqolRows = [];
    let sum = 0, count = 0;
    if (kdqolObj && typeof kdqolObj === 'object') {
      dims.forEach(d => {
        const val = kdqolObj[d.key];
        const num = getNum(val);
        if (num != null) { sum += num; count += 1; kdqolRows.push({ label: d.label, value: num }); }
      });
    }
    const promedio = count > 0 ? Math.round((sum / count) * 100) / 100 : null;

    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Informe Psicología ${it.id_informe || ''}</title>
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
        <h1>Informe de Psicología</h1>
        <div class="grid">
          <div class="row"><span class="label">No. Afiliación:</span> ${it.no_afiliacion || ''}</div>
          <div class="row"><span class="label">ID Informe:</span> ${it.id_informe || ''}</div>
          <div class="row" style="grid-column: 1 / -1;"><span class="label">Paciente:</span> ${paciente}</div>
          <div class="row"><span class="label">Sexo:</span> ${sexo}</div>
          <div class="row"><span class="label">Fecha:</span> ${fecha}</div>
        </div>
        <hr />
        <div class="grid">
          <div class="row"><span class="label">Motivo:</span> ${it.motivo_consulta ?? ''}</div>
          <div class="row"><span class="label">Tipo de Consulta:</span> ${it.tipo_consulta ?? ''}</div>
          <div class="row"><span class="label">Tipo de Atención:</span> ${it.tipo_atencion ?? ''}</div>
          <div class="row"><span class="label">Pronóstico:</span> ${it.pronostico_paciente ?? ''}</div>
        </div>
        <h2 style="font-size:16px; color:#065f46;">Observaciones</h2>
        <div class="box">${(it.observaciones || '—').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        <h2 style="font-size:16px; color:#065f46;">KDQOL</h2>
        ${kdqolObj ? `<div class="meta" style="color:#64748b; font-size:12px; margin:4px 0 8px;">ID KDQOL: ${kdqolObj.id_kdqol ?? '—'} | Fecha aplicación: ${kdqolObj.fecha_aplicacion ? new Date(kdqolObj.fecha_aplicacion).toLocaleString() : '—'}</div>` : ''}
        ${kdqolRows.length > 0 ? `
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead>
            <tr>
              <th style="text-align:left; border:1px solid #e5e7eb; padding:6px 8px; background:#f1f5f9;">Dimensión</th>
              <th style="text-align:left; border:1px solid #e5e7eb; padding:6px 8px; background:#f1f5f9;">Puntaje</th>
            </tr>
          </thead>
          <tbody>
            ${kdqolRows.map(r => `<tr><td style='border:1px solid #e5e7eb; padding:6px 8px;'>${r.label}</td><td style='border:1px solid #e5e7eb; padding:6px 8px;'>${r.value}</td></tr>`).join('')}
          </tbody>
        </table>
        <div style="margin-top:8px;"><span class="label">Promedio KDQOL:</span> ${promedio != null ? promedio : '—'}</div>
        ` : `<div class="box">—</div>`}
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
    const rows = registros || [];
    const fechaGen = new Date().toLocaleString();
    const buildName = (it) => {
      const pn = it.primer_nombre ?? it.primernombre ?? '';
      const sn = it.segundo_nombre ?? it.segundonombre ?? '';
      const pa = it.primer_apellido ?? it.primerapellido ?? '';
      const sa = it.segundo_apellido ?? it.segundoapellido ?? '';
      return [pn, sn, pa, sa].filter(Boolean).join(' ');
    };
    const htmlRows = rows.map((it, idx) => {
      const sexo = it.sexo ?? it.Sexo ?? '';
      const fecha = it.fecha_creacion ? new Date(it.fecha_creacion).toLocaleDateString() : '';
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${it.no_afiliacion ?? ''}</td>
          <td>${buildName(it)}</td>
          <td>${sexo}</td>
          <td>${it.id_informe ?? ''}</td>
          <td>${fecha}</td>
          <td>${it.motivo_consulta ?? ''}</td>
          <td>${it.tipo_consulta ?? ''}</td>
          <td>${it.tipo_atencion ?? ''}</td>
          <td>${it.pronostico_paciente ?? ''}</td>
          <td>${it.usuario_creacion ?? ''}</td>
        </tr>`;
    }).join('');

    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Listado Informes Psicología</title>
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
        <h1>Listado de Informes de Psicología</h1>
        <div class="meta">Generado: ${fechaGen} - Registros: ${rows.length}</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>No. Afiliación</th>
              <th>Paciente</th>
              <th>Sexo</th>
              <th>ID Informe</th>
              <th>Fecha</th>
              <th>Motivo</th>
              <th>Tipo Consulta</th>
              <th>Tipo Atención</th>
              <th>Pronóstico</th>
              <th>Usuario</th>
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

  return (
    <div className="mt-2">
      <div className="flex flex-wrap justify-center items-center gap-6 mb-4">
        <img src={logoClinica} alt="Logo Clínica" className="h-[120px] max-w-[220px] object-contain rounded-xl shadow-md p-2" />
        <span className="text-2xl sm:text-3xl font-semibold tracking-wide text-green-800 dark:text-white">
          Consulta de Psicología
        </span>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        <div className="col-span-1 lg:col-span-1">
          <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} max={hasta || undefined} className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-600" />
        </div>
        <div className="col-span-1 lg:col-span-1">
          <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} min={desde || undefined} disabled={!desde} className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-600 disabled:opacity-60 disabled:cursor-not-allowed" />
        </div>
        <div className="col-span-1 lg:col-span-2">
          <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">No. Afiliación</label>
          <input type="text" value={noAfiliacion} onChange={(e) => setNoAfiliacion(e.target.value)} placeholder="Ingrese número de afiliación" className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 dark:bg-slate-800 dark:text-white dark:border-slate-600" />
        </div>
        <div className="col-span-1 lg:col-span-2">
          <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">No. Informe</label>
          <input type="text" value={idInforme} onChange={(e) => setIdInforme(e.target.value)} placeholder="Ingrese el ID de informe" className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 dark:bg-slate-800 dark:text-white dark:border-slate-600" />
        </div>
        <div className="col-span-1 lg:col-span-2">
          <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">Sexo</label>
          <select value={sexo} onChange={(e) => setSexo(e.target.value)} className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 dark:bg-slate-800 dark:text-white dark:border-slate-600">
            <option value="">Todos</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
        </div>
        <div className="flex items-end gap-3 col-span-1 lg:col-span-2">
          <button type="button" onClick={buscar} disabled={loading} className={`px-6 py-2 font-semibold rounded-md transition-colors ${loading ? 'bg-green-700 cursor-not-allowed text-white' : 'bg-green-800 hover:bg-green-900 text-white border border-green-900'}`}>Buscar</button>
          <button type="button" onClick={limpiar} disabled={loading} className="px-6 py-2 font-semibold rounded-md bg-red-700 hover:bg-red-800 text-white border border-red-800">Limpiar</button>
          <button type="button" onClick={descargarListadoPDF} disabled={loading || registros.length === 0} className={`px-6 py-2 font-semibold rounded-md ${registros.length === 0 ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-700 hover:bg-blue-800 text-white'}`}>Descargar PDF</button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <div className="text-center my-5"><span className="text-green-700">Cargando...</span></div>
        ) : (
          <table className="min-w-full divide-y divide-gray-300 dark:divide-slate-700 text-sm text-left text-gray-800 dark:text-gray-100">
            <thead className="bg-gray-100 dark:bg-slate-800 text-xs uppercase font-semibold text-gray-700 dark:text-gray-200">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">No. Afiliación</th>
                <th className="px-4 py-2 text-left">Paciente</th>
                <th className="px-4 py-2 text-left">Sexo</th>
                <th className="px-4 py-2 text-left">ID Informe</th>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Motivo</th>
                <th className="px-4 py-2 text-left">Tipo Consulta</th>
                <th className="px-4 py-2 text-left">Tipo Atención</th>
                <th className="px-4 py-2 text-left">Pronóstico</th>
                <th className="px-4 py-2 text-left">Usuario</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-4 text-gray-600 dark:text-gray-300">No hay informes para mostrar.</td></tr>
              ) : (
                registros.map((it, idx) => {
                  const pn = it.primer_nombre ?? it.primernombre ?? '';
                  const sn = it.segundo_nombre ?? it.segundonombre ?? '';
                  const pa = it.primer_apellido ?? it.primerapellido ?? '';
                  const sa = it.segundo_apellido ?? it.segundoapellido ?? '';
                  const sexo = it.sexo ?? it.Sexo ?? '';
                  return (
                    <tr key={it.id_informe || idx} className="border-t border-gray-200 dark:border-slate-700">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{it.no_afiliacion}</td>
                      <td className="px-3 py-2">{[pn, sn, pa, sa].filter(Boolean).join(' ')}</td>
                      <td className="px-3 py-2">{sexo}</td>
                      <td className="px-3 py-2">{it.id_informe}</td>
                      <td className="px-3 py-2">{it.fecha_creacion ? new Date(it.fecha_creacion).toLocaleDateString() : ''}</td>
                      <td className="px-3 py-2">{it.motivo_consulta}</td>
                      <td className="px-3 py-2">{it.tipo_consulta}</td>
                      <td className="px-3 py-2">{it.tipo_atencion}</td>
                      <td className="px-3 py-2">{it.pronostico_paciente}</td>
                      <td className="px-3 py-2">{it.usuario_creacion}</td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => abrirDetalle(it)} className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm">Ver detalle</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Detalle */}
      {detalle.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Detalle del Informe de Psicología</h3>
                <button onClick={cerrarDetalle} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
              </div>
              {(() => {
                const it = detalle.item || {};
                const pn = it.primer_nombre ?? it.primernombre ?? '';
                const sn = it.segundo_nombre ?? it.segundonombre ?? '';
                const pa = it.primer_apellido ?? it.primerapellido ?? '';
                const sa = it.segundo_apellido ?? it.segundoapellido ?? '';
                const sexo = it.sexo ?? it.Sexo ?? '';
                // Parseo y presentación KDQOL en modal
                let kdqolObj = null;
                try { kdqolObj = typeof it.kdqol === 'string' ? JSON.parse(it.kdqol) : it.kdqol; } catch (_) { kdqolObj = null; }
                const dims = [
                  { key: 'fisico_mental', label: 'Físico y Mental' },
                  { key: 'enfermedad_renal', label: 'Enfermedad Renal' },
                  { key: 'sintomas_problemas', label: 'Síntomas y Problemas' },
                  { key: 'efectos_enfermedad', label: 'Efectos de la Enfermedad' },
                  { key: 'vida_diaria', label: 'Vida Diaria' },
                  { key: 'puntaje_fisico', label: 'Puntaje Físico' },
                  { key: 'puntaje_mental', label: 'Puntaje Mental' },
                  { key: 'puntaje_sintomas', label: 'Puntaje Síntomas' },
                  { key: 'puntaje_carga', label: 'Puntaje Carga' },
                  { key: 'puntaje_efectos', label: 'Puntaje Efectos' },
                ];
                const getNum = (v) => { const n = typeof v === 'string' ? parseFloat(v) : v; return isNaN(n) ? null : n; };
                const rows = [];
                let s = 0, c = 0;
                if (kdqolObj && typeof kdqolObj === 'object') {
                  dims.forEach(d => {
                    const num = getNum(kdqolObj[d.key]);
                    if (num != null) { rows.push({ label: d.label, value: num }); s += num; c += 1; }
                  });
                }
                const prom = c > 0 ? Math.round((s / c) * 100) / 100 : null;

                return (
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><span className="font-semibold">No. Afiliación:</span> {it.no_afiliacion || ''}</div>
                      <div><span className="font-semibold">ID Informe:</span> {it.id_informe || ''}</div>
                      <div className="md:col-span-2"><span className="font-semibold">Paciente:</span> {[pn, sn, pa, sa].filter(Boolean).join(' ')}</div>
                      <div><span className="font-semibold">Sexo:</span> {sexo}</div>
                      <div><span className="font-semibold">Fecha:</span> {it.fecha_creacion ? new Date(it.fecha_creacion).toLocaleString() : ''}</div>
                    </div>
                    <hr className="border-slate-200 dark:border-slate-700" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><span className="font-semibold">Motivo:</span> {it.motivo_consulta}</div>
                      <div><span className="font-semibold">Tipo de Consulta:</span> {it.tipo_consulta}</div>
                      <div><span className="font-semibold">Tipo de Atención:</span> {it.tipo_atencion}</div>
                      <div><span className="font-semibold">Pronóstico:</span> {it.pronostico_paciente}</div>
                    </div>
                    <div>
                      <span className="font-semibold">Observaciones:</span>
                      <div className="mt-1 p-2 rounded bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200">{it.observaciones || '—'}</div>
                    </div>
                    <div>
                      <span className="font-semibold">KDQOL:</span>
                      {kdqolObj && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span className="mr-2">ID KDQOL: {kdqolObj.id_kdqol ?? '—'}</span>
                          <span>Fecha aplicación: {kdqolObj.fecha_aplicacion ? new Date(kdqolObj.fecha_aplicacion).toLocaleString() : '—'}</span>
                        </div>
                      )}
                      {rows.length > 0 ? (
                        <div className="mt-1 overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr>
                                <th className="text-left border border-slate-200 dark:border-slate-700 px-2 py-1">Dimensión</th>
                                <th className="text-left border border-slate-200 dark:border-slate-700 px-2 py-1">Puntaje</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((r, i) => (
                                <tr key={i}>
                                  <td className="border border-slate-200 dark:border-slate-700 px-2 py-1">{r.label}</td>
                                  <td className="border border-slate-200 dark:border-slate-700 px-2 py-1">{r.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="mt-2"><span className="font-semibold">Promedio KDQOL:</span> {prom != null ? prom : '—'}</div>
                        </div>
                      ) : (
                        <div className="mt-1 p-2 rounded bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200">—</div>
                      )}
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
  );
};

export default ConsultaPsicologia;
