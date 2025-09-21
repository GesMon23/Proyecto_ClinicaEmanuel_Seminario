import React, { useState } from 'react';
import api from '../config/api';
import logoClinica from '@/assets/logoClinica2.png';

const ConsultaNutricion = () => {
  const [noAfiliacion, setNoAfiliacion] = useState('');
  const [idInforme, setIdInforme] = useState('');
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
    const primerNombre = it.primer_nombre ?? it.primernombre ?? it.primerNombre ?? '';
    const segundoNombre = it.segundo_nombre ?? it.segundonombre ?? it.segundoNombre ?? '';
    const primerApellido = it.primer_apellido ?? it.primerapellido ?? it.primerApellido ?? '';
    const segundoApellido = it.segundo_apellido ?? it.segundoapellido ?? it.segundoApellido ?? '';
    const sexo = it.sexo ?? it.Sexo ?? '';

    const paciente = [primerNombre, segundoNombre, primerApellido, segundoApellido].filter(Boolean).join(' ');
    const fecha = it.fecha_creacion ? new Date(it.fecha_creacion).toLocaleString() : '';

    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Informe de Nutrición ${it.id_informe || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
          h1 { color: #166534; font-size: 20px; margin-bottom: 8px; }
          h2 { color: #065f46; font-size: 16px; margin: 16px 0 8px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
          .row { margin: 6px 0; }
          .label { font-weight: bold; }
          .box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; }
          hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
          .logo { display: block; margin: 0 auto 12px auto; height: 104px; }
          .title { text-align: center; }
          @page { size: A4 landscape; margin: 16mm; }
        </style>
      </head>
      <body>
        <img src="${logoClinica}" alt="Logo Clínica" class="logo" />
        <h1 class="title">Informe de Nutrición</h1>
        <div class="grid">
          <div class="row"><span class="label">No. Afiliación:</span> ${it.no_afiliacion || ''}</div>
          <div class="row"><span class="label">ID Informe:</span> ${it.id_informe || ''}</div>
          <div class="row" style="grid-column: 1 / -1;"><span class="label">Paciente:</span> ${paciente}</div>
          <div class="row"><span class="label">Sexo:</span> ${sexo}</div>
          <div class="row"><span class="label">Fecha:</span> ${fecha}</div>
        </div>
        <hr />
        <h2>Datos Antropométricos</h2>
        <div class="grid">
          <div class="row"><span class="label">Altura (cm):</span> ${it.altura_cm ?? ''}</div>
          <div class="row"><span class="label">Peso (kg):</span> ${it.peso_kg ?? ''}</div>
          <div class="row"><span class="label">IMC:</span> ${it.imc ?? ''}</div>
        </div>
        <h2>Estado y Motivo</h2>
        <div class="grid">
          <div class="row"><span class="label">Estado Nutricional:</span> ${it.estado_nutricional ?? ''}</div>
          <div class="row"><span class="label">Motivo:</span> ${it.motivo_consulta ?? ''}</div>
        </div>
        <h2>Observaciones</h2>
        <div class="box">${(it.observaciones || '—').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </body>
      </html>
    `;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    // Dar tiempo a la ventana para renderizar
    setTimeout(() => {
      w.print();
      // w.close(); // opcional, algunos navegadores bloquean el cierre automático
    }, 300);
  };

  const descargarListadoPDF = () => {
    const rows = historial || [];
    const fechaGen = new Date().toLocaleString();
    const buildName = (it) => {
      const pn = it.primer_nombre ?? it.primernombre ?? it.primerNombre ?? '';
      const sn = it.segundo_nombre ?? it.segundonombre ?? it.segundoNombre ?? '';
      const pa = it.primer_apellido ?? it.primerapellido ?? it.primerApellido ?? '';
      const sa = it.segundo_apellido ?? it.segundoapellido ?? it.segundoApellido ?? '';
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
          <td>${it.estado_nutricional ?? ''}</td>
          <td>${it.altura_cm ?? ''}</td>
          <td>${it.peso_kg ?? ''}</td>
          <td>${it.imc ?? ''}</td>
          <td>${it.usuario_creacion ?? ''}</td>
        </tr>`;
    }).join('');

    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Listado Informe Nutrición</title>
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
        <h1 class="title">Listado de Informes de Nutrición</h1>
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
              <th>Estado Nutricional</th>
              <th>Altura (cm)</th>
              <th>Peso (kg)</th>
              <th>IMC</th>
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
      if (idInforme) params.idinforme = idInforme;
      if (sexo) params.sexo = sexo;
      const { data } = await api.get(`/api/nutricion/historial`, { params });
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
    setIdInforme('');
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
          Consulta de Nutrición
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
          <label className="block text-[16px] font-medium text-gray-800 dark:text-white mb-1">No. Informe</label>
          <input
            type="text"
            value={idInforme}
            onChange={(e) => setIdInforme(e.target.value)}
            placeholder="Ingrese el ID de informe"
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
                <th className="px-4 py-2 text-left">ID Informe</th>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Motivo</th>
                <th className="px-4 py-2 text-left">Estado Nutricional</th>
                <th className="px-4 py-2 text-left">Altura (cm)</th>
                <th className="px-4 py-2 text-left">Peso (kg)</th>
                <th className="px-4 py-2 text-left">IMC</th>
                <th className="px-4 py-2 text-left">Usuario</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historial.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-4 text-gray-600 dark:text-gray-300">
                    No hay informes para mostrar.
                  </td>
                </tr>
              ) : (
                historial.map((it, idx) => {
                  const primerNombre = it.primer_nombre ?? it.primernombre ?? it.primerNombre ?? '';
                  const segundoNombre = it.segundo_nombre ?? it.segundonombre ?? it.segundoNombre ?? '';
                  const primerApellido = it.primer_apellido ?? it.primerapellido ?? it.primerApellido ?? '';
                  const segundoApellido = it.segundo_apellido ?? it.segundoapellido ?? it.segundoApellido ?? '';
                  const sexo = it.sexo ?? it.Sexo ?? '';
                  return (
                  <tr key={it.id_informe || idx} className="border-t border-gray-200 dark:border-slate-700">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">{it.no_afiliacion}</td>
                    <td className="px-3 py-2">
                      {[primerNombre, segundoNombre, primerApellido, segundoApellido].filter(Boolean).join(' ')}
                    </td>
                    <td className="px-3 py-2">{sexo}</td>
                    <td className="px-3 py-2">{it.id_informe}</td>
                    <td className="px-3 py-2">{it.fecha_creacion ? new Date(it.fecha_creacion).toLocaleDateString() : ''}</td>
                    <td className="px-3 py-2">{it.motivo_consulta}</td>
                    <td className="px-3 py-2">{it.estado_nutricional}</td>
                    <td className="px-3 py-2">{it.altura_cm}</td>
                    <td className="px-3 py-2">{it.peso_kg}</td>
                    <td className="px-3 py-2">{it.imc}</td>
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
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Detalle del Informe de Nutrición</h3>
                <button onClick={cerrarDetalle} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
              </div>
              {(() => {
                const it = detalle.item || {};
                const primerNombre = it.primer_nombre ?? it.primernombre ?? it.primerNombre ?? '';
                const segundoNombre = it.segundo_nombre ?? it.segundonombre ?? it.segundoNombre ?? '';
                const primerApellido = it.primer_apellido ?? it.primerapellido ?? it.primerApellido ?? '';
                const segundoApellido = it.segundo_apellido ?? it.segundoapellido ?? it.segundoApellido ?? '';
                const sexo = it.sexo ?? it.Sexo ?? '';
                return (
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-semibold">No. Afiliación:</span> {it.no_afiliacion || ''}
                      </div>
                      <div>
                        <span className="font-semibold">ID Informe:</span> {it.id_informe || ''}
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-semibold">Paciente:</span> {[primerNombre, segundoNombre, primerApellido, segundoApellido].filter(Boolean).join(' ')}
                      </div>
                      <div>
                        <span className="font-semibold">Sexo:</span> {sexo}
                      </div>
                      <div>
                        <span className="font-semibold">Fecha:</span> {it.fecha_creacion ? new Date(it.fecha_creacion).toLocaleString() : ''}
                      </div>
                    </div>
                    <hr className="border-slate-200 dark:border-slate-700" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="font-semibold">Altura (cm):</span> {it.altura_cm}
                      </div>
                      <div>
                        <span className="font-semibold">Peso (kg):</span> {it.peso_kg}
                      </div>
                      <div>
                        <span className="font-semibold">IMC:</span> {it.imc}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold">Estado Nutricional:</span> {it.estado_nutricional}
                    </div>
                    <div>
                      <span className="font-semibold">Motivo:</span> {it.motivo_consulta}
                    </div>
                    <div>
                      <span className="font-semibold">Observaciones:</span>
                      <div className="mt-1 p-2 rounded bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {it.observaciones || '—'}
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

export default ConsultaNutricion;
