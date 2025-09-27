import React, { useState } from 'react';
import api from '../config/api';
import logoClinica from '@/assets/logoClinica2.png';

const ConsultaLaboratorios = () => {
  const [noAfiliacion, setNoAfiliacion] = useState('');
  const [idLaboratorio, setIdLaboratorio] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [sexo, setSexo] = useState('');
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detalle, setDetalle] = useState({ isOpen: false, item: null });

  const abrirDetalle = (item) => setDetalle({ isOpen: true, item });
  const cerrarDetalle = () => setDetalle({ isOpen: false, item: null });

  const descargarPDF = (item) => {
    const it = item || {};
    const primerNombre = it.primer_nombre ?? it.primernombre ?? '';
    const segundoNombre = it.segundo_nombre ?? it.segundonombre ?? '';
    const primerApellido = it.primer_apellido ?? it.primerapellido ?? '';
    const segundoApellido = it.segundo_apellido ?? it.segundoapellido ?? '';
    const sexo = it.sexo ?? '';
    const paciente = [primerNombre, segundoNombre, primerApellido, segundoApellido].filter(Boolean).join(' ');
    const fecha = it.fecha_laboratorio ? new Date(it.fecha_laboratorio).toLocaleDateString() : '';

    const excludeKeys = new Set([
      'id_laboratorio','idlaboratorio','no_afiliacion','noafiliacion','primer_nombre','primernombre','segundo_nombre','segundonombre','primer_apellido','primerapellido','segundo_apellido','segundoapellido','sexo','fecha_laboratorio','periodicidad','examen_realizado','causa_no_realizado','infeccion_acceso','complicacion_acceso','virologia','antigeno_hepatitis_c','antigeno_superficie','hiv','observacion','usuario_creacion','fecha_registro','idperlaboratorio'
    ]);
    const entries = Object.entries(it || {}).filter(([k,v]) => !excludeKeys.has(k) && v !== null && v !== undefined && v !== '');
    const pretty = (s) => String(s).replace(/_/g,' ').replace(/\b\w/g, m => m.toUpperCase());
    let paramRows = '';
    if (Array.isArray(it.parametros) && it.parametros.length > 0) {
      paramRows = it.parametros.map((p, idx) => `
        <tr>
          <td>${p.parametro ?? ''}</td>
          <td>${p.valor ?? ''}</td>
        </tr>
      `).join('');
    } else {
      paramRows = entries.map(([k,v]) => `
        <tr>
          <td>${pretty(k)}</td>
          <td>${typeof v === 'boolean' ? (v ? 'Sí' : 'No') : v}</td>
        </tr>
      `).join('');
    }

    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Informe de Laboratorio ${it.id_laboratorio || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
          h1 { color: #166534; font-size: 20px; margin-bottom: 8px; }
          h2 { color: #065f46; font-size: 16px; margin: 16px 0 8px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
          .row { margin: 6px 0; }
          .label { font-weight: bold; }
          .box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; }
          hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
          .logo { display: block; margin: 0 auto 12px auto; height: 104px; }
          .title { text-align: center; }
          @page { size: A4 landscape; margin: 16mm; }
        </style>
      </head>
      <body>
        <img src="${logoClinica}" alt="Logo Clínica" class="logo" />
        <h1 class="title">Detalle de Laboratorio</h1>
        <div class="grid">
          <div class="row"><span class="label">No. Afiliación:</span> ${it.no_afiliacion || ''}</div>
          <div class="row"><span class="label">ID Laboratorio:</span> ${it.id_laboratorio || ''}</div>
          <div class="row" style="grid-column: 1 / -1;"><span class="label">Paciente:</span> ${paciente}</div>
          <div class="row"><span class="label">Sexo:</span> ${sexo}</div>
          <div class="row"><span class="label">Fecha de Laboratorio:</span> ${fecha}</div>
          <div class="row"><span class="label">Periodicidad:</span> ${it.periodicidad || ''}</div>
        </div>
        <hr />
        <h2>Resultados/Estado</h2>
        <div class="grid">
          <div class="row"><span class="label">Examen Realizado:</span> ${it.examen_realizado ? 'Sí' : 'No'}</div>
          <div class="row"><span class="label">Causa No Realizado:</span> ${it.causa_no_realizado || '—'}</div>
          <div class="row"><span class="label">Infección de Acceso:</span> ${it.infeccion_acceso || '—'}</div>
          <div class="row"><span class="label">Complicación de Acceso:</span> ${it.complicacion_acceso || '—'}</div>
          <div class="row"><span class="label">Virología:</span> ${it.virologia || '—'}</div>
          <div class="row"><span class="label">Ag. Hepatitis C:</span> ${it.antigeno_hepatitis_c ? 'Positivo' : 'Negativo'}</div>
          <div class="row"><span class="label">Ag. Superficie:</span> ${it.antigeno_superficie ? 'Positivo' : 'Negativo'}</div>
          <div class="row"><span class="label">HIV:</span> ${it.hiv || '—'}</div>
        </div>
        <h2>Observaciones</h2>
        <div class="box">${(it.observacion || '—').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        <h2>Parámetros</h2>
        <table>
          <thead>
            <tr>
              <th>Parámetro</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            ${paramRows || '<tr><td colspan="2">—</td></tr>'}
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
    setTimeout(() => {
      w.print();
    }, 300);
  };

  const descargarListadoPDF = () => {
    const rows = historial || [];
    const fechaGen = new Date().toLocaleString();
    const buildName = (it) => {
      const pn = it.primer_nombre ?? it.primernombre ?? '';
      const sn = it.segundo_nombre ?? it.segundonombre ?? '';
      const pa = it.primer_apellido ?? it.primerapellido ?? '';
      const sa = it.segundo_apellido ?? it.segundoapellido ?? '';
      return [pn, sn, pa, sa].filter(Boolean).join(' ');
    };
    const htmlRows = rows.map((it, idx) => {
      const sexo = it.sexo ?? '';
      const fecha = it.fecha_laboratorio ? new Date(it.fecha_laboratorio).toLocaleDateString() : '';
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${it.no_afiliacion ?? ''}</td>
          <td>${buildName(it)}</td>
          <td>${sexo}</td>
          <td>${it.id_laboratorio ?? ''}</td>
          <td>${fecha}</td>
          <td>${it.periodicidad ?? ''}</td>
          <td>${it.examen_realizado ? 'Sí' : 'No'}</td>
          <td>${it.virologia ?? ''}</td>
          <td>${it.hiv ?? ''}</td>
          <td>${it.usuario_creacion ?? ''}</td>
        </tr>`;
    }).join('');

    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Listado de Laboratorios</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
          h1 { color: #166534; font-size: 20px; margin-bottom: 8px; }
          .meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; }
          .logo { display: block; margin: 0 auto 12px auto; height: 104px; }
          .title { text-align: center; }
          @page { size: A4 landscape; margin: 16mm; }
        </style>
      </head>
      <body>
        <img src="${logoClinica}" alt="Logo Clínica" class="logo" />
        <h1 class="title">Listado de Laboratorios</h1>
        <div class="meta">Generado: ${fechaGen} - Registros: ${rows.length}</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>No. Afiliación</th>
              <th>Paciente</th>
              <th>Sexo</th>
              <th>ID Laboratorio</th>
              <th>Fecha</th>
              <th>Periodicidad</th>
              <th>Examen</th>
              <th>Virología</th>
              <th>HIV</th>
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
    setTimeout(() => {
      w.print();
    }, 300);
  };

  const buscarHistorial = async () => {
    setError('');
    setHistorial([]);
    setLoading(true);
    try {
      const params = {};
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      if (noAfiliacion) params.noafiliacion = noAfiliacion;
      if (idLaboratorio) params.idlaboratorio = idLaboratorio;
      if (sexo) params.sexo = sexo;
      const { data } = await api.get(`/api/laboratorios/historial`, { params });
      if (data?.success) {
        setHistorial(data.data || []);
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
    setIdLaboratorio('');
    setDesde('');
    setHasta('');
    setSexo('');
    setHistorial([]);
    setError('');
  };

  return (
    <div className="mt-2">
      <div className="flex flex-wrap justify-center items-center gap-6 mb-4">
        <img
          src={logoClinica}
          alt="Logo Clínica"
          className="h-[120px] max-w-[220px] object-contain rounded-xl shadow-md p-2"
        />
        <span className="text-2xl sm:text-3xl font-semibold tracking-wide text-green-800 dark:text-white">
          Consulta de Laboratorios
        </span>
      </div>

      {/* Filtros */}
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
          <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">No. Afiliación</label>
          <input
            type="text"
            value={noAfiliacion}
            onChange={(e) => setNoAfiliacion(e.target.value)}
            placeholder="Ingrese número de afiliación"
            className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 dark:bg-slate-800 dark:text-white dark:border-slate-600"
          />
        </div>

        <div className="col-span-1 lg:col-span-2">
          <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">No. Laboratorio</label>
          <input
            type="text"
            value={idLaboratorio}
            onChange={(e) => setIdLaboratorio(e.target.value)}
            placeholder="Ingrese el ID de laboratorio"
            className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 dark:bg-slate-800 dark:text-white dark:border-slate-600"
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

        <div className="flex items-end gap-3 col-span-1 lg:col-span-2">
          <button
            type="button"
            onClick={buscarHistorial}
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
            onClick={limpiar}
            disabled={loading}
            className="px-6 py-2 font-semibold rounded-md bg-red-700 hover:bg-red-800 text-white border border-red-800"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={descargarListadoPDF}
            disabled={loading || historial.length === 0}
            className={`px-6 py-2 font-semibold rounded-md ${historial.length === 0 ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-700 hover:bg-blue-800 text-white'} `}
          >
            Descargar PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 text-red-700 bg-red-100 border border-red-400 px-4 py-2 rounded text-lg">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <div className="text-center my-5">
            <span className="text-green-700">Cargando...</span>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-300 dark:divide-slate-700 text-sm text-left text-gray-800 dark:text-gray-100">
            <thead className="bg-gray-100 dark:bg-slate-800 text-xs uppercase font-semibold text-gray-700 dark:text-gray-200">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">No. Afiliación</th>
                <th className="px-4 py-2 text-left">Paciente</th>
                <th className="px-4 py-2 text-left">Sexo</th>
                <th className="px-4 py-2 text-left">ID Laboratorio</th>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Periodicidad</th>
                <th className="px-4 py-2 text-left">Examen</th>
                <th className="px-4 py-2 text-left">Virología</th>
                <th className="px-4 py-2 text-left">HIV</th>
                <th className="px-4 py-2 text-left">Usuario</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historial.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-4 text-gray-600 dark:text-gray-300">
                    No hay registros para mostrar.
                  </td>
                </tr>
              ) : (
                historial.map((it, idx) => {
                  const primerNombre = it.primer_nombre ?? it.primernombre ?? '';
                  const segundoNombre = it.segundo_nombre ?? it.segundonombre ?? '';
                  const primerApellido = it.primer_apellido ?? it.primerapellido ?? '';
                  const segundoApellido = it.segundo_apellido ?? it.segundoapellido ?? '';
                  const sexo = it.sexo ?? '';
                  return (
                    <tr key={it.id_laboratorio || idx} className="border-t border-gray-200 dark:border-slate-700">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{it.no_afiliacion}</td>
                      <td className="px-3 py-2">
                        {[primerNombre, segundoNombre, primerApellido, segundoApellido].filter(Boolean).join(' ')}
                      </td>
                      <td className="px-3 py-2">{sexo}</td>
                      <td className="px-3 py-2">{it.id_laboratorio}</td>
                      <td className="px-3 py-2">{it.fecha_laboratorio ? new Date(it.fecha_laboratorio).toLocaleDateString() : ''}</td>
                      <td className="px-3 py-2">{it.periodicidad}</td>
                      <td className="px-3 py-2">{it.examen_realizado ? 'Sí' : 'No'}</td>
                      <td className="px-3 py-2">{it.virologia}</td>
                      <td className="px-3 py-2">{it.hiv}</td>
                      <td className="px-3 py-2">{it.usuario_creacion}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => abrirDetalle(it)}
                          className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm"
                        >
                          Ver detalle
                        </button>
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
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Detalle de Laboratorio</h3>
                <button onClick={cerrarDetalle} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
              </div>
              {(() => {
                const it = detalle.item || {};
                const primerNombre = it.primer_nombre ?? it.primernombre ?? '';
                const segundoNombre = it.segundo_nombre ?? it.segundonombre ?? '';
                const primerApellido = it.primer_apellido ?? it.primerapellido ?? '';
                const segundoApellido = it.segundo_apellido ?? it.segundoapellido ?? '';
                const sexo = it.sexo ?? '';
                const excludeKeys = new Set([
                  'id_laboratorio','idlaboratorio','no_afiliacion','noafiliacion','primer_nombre','primernombre','segundo_nombre','segundonombre','primer_apellido','primerapellido','segundo_apellido','segundoapellido','sexo','fecha_laboratorio','periodicidad','examen_realizado','causa_no_realizado','infeccion_acceso','complicacion_acceso','virologia','antigeno_hepatitis_c','antigeno_superficie','hiv','observacion','usuario_creacion','fecha_registro','idperlaboratorio'
                ]);
                const entries = Object.entries(it || {}).filter(([k,v]) => !excludeKeys.has(k) && v !== null && v !== undefined && v !== '');
                const pretty = (s) => String(s).replace(/_/g,' ').replace(/\b\w/g, m => m.toUpperCase());
                const parametros = Array.isArray(it.parametros) ? it.parametros : [];
                return (
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-semibold">No. Afiliación:</span> {it.no_afiliacion || ''}
                      </div>
                      <div>
                        <span className="font-semibold">ID Laboratorio:</span> {it.id_laboratorio || ''}
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-semibold">Paciente:</span> {[primerNombre, segundoNombre, primerApellido, segundoApellido].filter(Boolean).join(' ')}
                      </div>
                      <div>
                        <span className="font-semibold">Sexo:</span> {sexo}
                      </div>
                      <div>
                        <span className="font-semibold">Fecha:</span> {it.fecha_laboratorio ? new Date(it.fecha_laboratorio).toLocaleString() : ''}
                      </div>
                    </div>
                    <hr className="border-slate-200 dark:border-slate-700" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-semibold">Periodicidad:</span> {it.periodicidad}
                      </div>
                      <div>
                        <span className="font-semibold">Examen Realizado:</span> {it.examen_realizado ? 'Sí' : 'No'}
                      </div>
                      <div>
                        <span className="font-semibold">Causa No Realizado:</span> {it.causa_no_realizado || '—'}
                      </div>
                      <div>
                        <span className="font-semibold">Virología:</span> {it.virologia || '—'}
                      </div>
                      <div>
                        <span className="font-semibold">Ag. Hepatitis C:</span> {it.antigeno_hepatitis_c ? 'Positivo' : 'Negativo'}
                      </div>
                      <div>
                        <span className="font-semibold">Ag. Superficie:</span> {it.antigeno_superficie ? 'Positivo' : 'Negativo'}
                      </div>
                      <div>
                        <span className="font-semibold">HIV:</span> {it.hiv || '—'}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold">Observaciones:</span>
                      <div className="mt-1 p-2 rounded bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {it.observacion || '—'}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold">Parámetros:</span>
                      <div className="mt-2 overflow-x-auto">
                        <table className="min-w-full border border-slate-200 dark:border-slate-700 text-xs">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-700">
                              <th className="px-2 py-1 text-left">Parámetro</th>
                              <th className="px-2 py-1 text-left">Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(parametros.length > 0) ? (
                              parametros.map(p => (
                                <tr key={`${p.idparametro}-${p.parametro}`} className="border-t border-slate-200 dark:border-slate-700">
                                  <td className="px-2 py-1">{p.parametro ?? ''}</td>
                                  <td className="px-2 py-1">{p.valor ?? ''}</td>
                                </tr>
                              ))
                            ) : entries.length === 0 ? (
                              <tr>
                                <td className="px-2 py-1" colSpan={2}>—</td>
                              </tr>
                            ) : entries.map(([k,v]) => (
                              <tr key={k} className="border-t border-slate-200 dark:border-slate-700">
                                <td className="px-2 py-1">{pretty(k)}</td>
                                <td className="px-2 py-1">{typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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

export default ConsultaLaboratorios;
