import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Card, Form, Row, Col, Button, Table } from 'react-bootstrap';
import logoClinica from '@/assets/logoClinica2.png';
import api from '../config/api';
import './NuevoIngresoReportes.css';

function parseYMD(str) {
    if (!str) return null;
    const [y, m, d] = String(str).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

function calcularEdadHasta(fechaNacimiento, hastaStr) {
    if (!fechaNacimiento) return '';
    const nacimiento = parseYMD(fechaNacimiento) || new Date(fechaNacimiento);
    const hasta = hastaStr ? (parseYMD(hastaStr) || new Date(hastaStr)) : new Date();
    if (!(nacimiento instanceof Date) || isNaN(nacimiento)) return '';
    if (!(hasta instanceof Date) || isNaN(hasta)) return '';
    let anios = hasta.getFullYear() - nacimiento.getFullYear();
    let meses = hasta.getMonth() - nacimiento.getMonth();
    let dias = hasta.getDate() - nacimiento.getDate();
    if (dias < 0) { meses -= 1; const prevMonth = new Date(hasta.getFullYear(), hasta.getMonth(), 0).getDate(); dias += prevMonth; }
    if (meses < 0) { anios -= 1; meses += 12; }
    return anios >= 0 ? anios : '';
}

function diffDMA(desdeStr, hastaStr) {
    if (!desdeStr) return '';
    const desde = parseYMD(desdeStr) || new Date(desdeStr);
    const hasta = hastaStr ? (parseYMD(hastaStr) || new Date(hastaStr)) : new Date();
    if (!(desde instanceof Date) || isNaN(desde)) return '';
    if (!(hasta instanceof Date) || isNaN(hasta)) return '';
    if (hasta < desde) return '0-0-0';
    let anios = hasta.getFullYear() - desde.getFullYear();
    let meses = hasta.getMonth() - desde.getMonth();
    let dias = hasta.getDate() - desde.getDate();
    if (dias < 0) { meses -= 1; const prev = new Date(hasta.getFullYear(), hasta.getMonth(), 0).getDate(); dias += prev; }
    if (meses < 0) { anios -= 1; meses += 12; }
    return `${dias}-${meses}-${anios}`;
}

function fechaCortePaciente(p) {
    const estado = (p.estadopaciente || p.estado || '').toString().toLowerCase();
    if (estado === 'fallecido' && p.fechafallecido) return p.fechafallecido;
    return null; // hoy
}

function formatearPeriodo(fechaInicio, fechaFin) {
    if (!fechaInicio && !fechaFin) return '';
    const parseFecha = (fechaStr) => {
        if (!fechaStr) return null;
        // Espera formato 'YYYY-MM-DD'
        const [anio, mes, dia] = fechaStr.split('-').map(Number);
        return { dia, mes, anio };
    };
    const formato = (f) => f ? (f.dia.toString().padStart(2, '0') + '/' + f.mes.toString().padStart(2, '0') + '/' + f.anio) : '';
    const f1 = parseFecha(fechaInicio);
    const f2 = parseFecha(fechaFin);
    if (f1 && f2) return `Del ${formato(f1)} al ${formato(f2)}`;
    if (f1) return `Desde ${formato(f1)}`;
    if (f2) return `Hasta ${formato(f2)}`;
    return '';
}

const NuevoIngresoReportes = () => {
    const [filtros, setFiltros] = useState({
        fechaInicioPeriodo: '',
        fechaFinPeriodo: '',
        sexo: '',
        jornada: '',
        accesovascular: '',
        departamento: '',
    });
    const [pacientes, setPacientes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [detalle, setDetalle] = useState({ isOpen: false, item: null });
    const [catalogos, setCatalogos] = useState({ jornadas: [], accesos: [], departamentos: [], sexos: [] });

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const filasPorPagina = 10;
    const totalPaginas = Math.ceil(pacientes.length / filasPorPagina);
    const pacientesPaginados = pacientes.slice((paginaActual - 1) * filasPorPagina, paginaActual * filasPorPagina);

    const handlePaginaChange = (nuevaPagina) => {
        setPaginaActual(nuevaPagina);
    };

    const handleChange = (e) => {
        setFiltros({ ...filtros, [e.target.name]: e.target.value });
    };

    // Cargar catálogos para filtros
    useEffect(() => {
        const cargarCatalogos = async () => {
            try {
                const { data } = await api.get('/api/nuevoingreso/catalogos');
                setCatalogos({
                    jornadas: data?.jornadas || [],
                    accesos: data?.accesos || [],
                    departamentos: data?.departamentos || [],
                    sexos: data?.sexos || [],
                });
            } catch (e) {
                setCatalogos({ jornadas: [], accesos: [], departamentos: [], sexos: [] });
            }
        };
        cargarCatalogos();
    }, []);

    const handleBuscar = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const params = {};
            if (filtros.fechaInicioPeriodo) params.fechainicio = filtros.fechaInicioPeriodo;
            if (filtros.fechaFinPeriodo) params.fechafin = filtros.fechaFinPeriodo;
            if (filtros.jornada) params.jornada = filtros.jornada;
            if (filtros.accesovascular) params.accesovascular = filtros.accesovascular;
            if (filtros.sexo) params.sexo = filtros.sexo;
            if (filtros.departamento) params.departamento = filtros.departamento;
            const res = await api.get('/api/nuevoingreso', { params });
            setPacientes(res.data);
        } catch (err) {
            setPacientes([]);
        }
        setLoading(false);
    };

    // Nueva función para exportar a Excel desde backend (como PacientesReporte)
    const exportarExcel = () => {
        const params = new URLSearchParams();
        if (filtros.fechaInicioPeriodo) params.append('fechainicio', filtros.fechaInicioPeriodo);
        if (filtros.fechaFinPeriodo) params.append('fechafin', filtros.fechaFinPeriodo);
        if (filtros.jornada) params.append('jornada', filtros.jornada);
        if (filtros.accesovascular) params.append('accesovascular', filtros.accesovascular);
        if (filtros.sexo) params.append('sexo', filtros.sexo);
        if (filtros.departamento) params.append('departamento', filtros.departamento);
        window.open(`/api/nuevoingreso/excel?${params.toString()}`);
    };

    const descargarListadoPDF = () => {
        const rows = pacientes || [];
        const fechaGen = new Date().toLocaleString();
        const htmlRows = rows.map((it, idx) => {
            const nombre = [it.primernombre, it.segundonombre, it.otrosnombres, it.primerapellido, it.segundoapellido, it.apellidocasada].filter(Boolean).join(' ');
            const estancia = diffDMA(it.fechaingreso, fechaCortePaciente(it));
            return `
              <tr>
                <td>${idx + 1}</td>
                <td>${it.noafiliacion || ''}</td>
                <td>${nombre || ''}</td>
                <td>${it.sexo || ''}</td>
                <td>${it.departamento || ''}</td>
                <td>${it.jornada || ''}</td>
                <td>${it.accesovascular || ''}</td>
                <td>${it.numeroformulario || ''}</td>
                <td>${estancia || ''}</td>
              </tr>`;
        }).join('');

        const html = `
          <html>
          <head>
            <meta charset="utf-8" />
            <title>Listado Pacientes Nuevo Ingreso</title>
            <style>
              body { font-family: Arial, sans-serif; color: #0f172a; padding: 28px; }
              h1 { color: #166534; font-size: 22px; margin-bottom: 6px; text-align:center; }
              .meta { color: #475569; font-size: 12px; margin-bottom: 12px; text-align:center; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
              th { background: #f1f5f9; }
              .logo { display:block; margin: 0 auto 10px auto; height: 96px; }
              @page { size: A4 landscape; margin: 14mm; }
            </style>
          </head>
          <body>
            <img src="${logoClinica}" class="logo" />
            <h1>Pacientes Nuevo Ingreso</h1>
            <div class="meta">Generado: ${fechaGen} — Registros: ${rows.length}</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>No. Afiliación</th>
                  <th>Nombre</th>
                  <th>Sexo</th>
                  <th>Departamento</th>
                  <th>Jornada</th>
                  <th>Acceso</th>
                  <th>No. Formulario</th>
                  <th>Estancia (D-M-A)</th>
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

    const abrirDetalle = (item) => setDetalle({ isOpen: true, item });
    const cerrarDetalle = () => setDetalle({ isOpen: false, item: null });
    const descargarPDFDetalle = (item) => {
        const it = item || {};
        const nombre = [it.primernombre, it.segundonombre, it.otrosnombres, it.primerapellido, it.segundoapellido, it.apellidocasada].filter(Boolean).join(' ');
        const estancia = diffDMA(it.fechaingreso, fechaCortePaciente(it));
        const edad = calcularEdadHasta(it.fechanacimiento, fechaCortePaciente(it));
        const html = `
          <html>
          <head>
            <meta charset="utf-8" />
            <title>Detalle Paciente ${it.noafiliacion || ''}</title>
            <style>
              body { font-family: Arial, sans-serif; color: #0f172a; padding: 28px; }
              h1 { color: #166534; font-size: 22px; margin: 4px 0 12px; text-align: center; }
              .meta { color: #475569; font-size: 12px; text-align: center; margin-bottom: 12px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
              .section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
              .row { margin: 6px 0; }
              .label { font-weight: 700; color: #0f172a; }
              .logo { display: block; margin: 0 auto 10px auto; height: 96px; }
              @page { size: A4 portrait; margin: 14mm; }
            </style>
          </head>
          <body>
            <img src="${logoClinica}" class="logo" />
            <h1>Detalle de Paciente (Nuevo Ingreso)</h1>
            <div class="meta">Generado: ${new Date().toLocaleString()}</div>
            <div class="section">
              <div class="grid">
                <div class="row"><span class="label">No. Afiliación:</span> ${it.noafiliacion || ''}</div>
                <div class="row"><span class="label">DPI:</span> ${it.dpi || ''}</div>
                <div class="row" style="grid-column: 1 / -1;"><span class="label">Nombre Completo:</span> ${nombre || ''}</div>
                <div class="row"><span class="label">Edad:</span> ${edad || ''}</div>
                <div class="row"><span class="label">Fecha Nacimiento:</span> ${it.fechanacimiento || ''}</div>
                <div class="row"><span class="label">Sexo:</span> ${it.sexo || ''}</div>
                <div class="row"><span class="label">Dirección:</span> ${it.direccion || ''}</div>
                <div class="row"><span class="label">Departamento:</span> ${it.departamento || ''}</div>
                <div class="row"><span class="label">Fecha Ingreso:</span> ${it.fechaingreso || ''}</div>
                <div class="row"><span class="label">Estancia (D-M-A):</span> ${estancia || ''}</div>
                <div class="row"><span class="label">Estado:</span> ${it.estadopaciente || it.estado || ''}</div>
                <div class="row"><span class="label">Jornada:</span> ${it.jornada || ''}</div>
                <div class="row"><span class="label">Acceso Vascular:</span> ${it.accesovascular || ''}</div>
                <div class="row"><span class="label">No. Formulario:</span> ${it.numeroformulario || ''}</div>
                <div class="row" style="grid-column: 1 / -1;"><span class="label">Periodo:</span> ${(it.fechainicioperiodo || it.fechafinperiodo) ? `${it.fechainicioperiodo || ''} - ${it.fechafinperiodo || ''}` : ''}</div>
                <div class="row" style="grid-column: 1 / -1;"><span class="label">Observaciones:</span> ${it.observaciones || ''}</div>
              </div>
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

                        <span className="text-2xl font-semibold text-green-800 tracking-wide dark:text-white">
                            Pacientes Nuevo Ingreso
                        </span>
                    </div>
                </div>
                <div className="p-6">
                    <form onSubmit={handleBuscar}>
                        <div className="flex flex-wrap gap-6 mb-6">
                            <div className="w-full md:w-1/4">
                                <label htmlFor="fechaInicioPeriodo" className="block mb-1 font-medium text-gray-700 dark:text-white">
                                    Fecha Inicio Periodo
                                </label>
                                <input
                                    type="date"
                                    id="fechaInicioPeriodo"
                                    name="fechaInicioPeriodo"
                                    value={filtros.fechaInicioPeriodo}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                />
                            </div>

                            <div className="w-full md:w-1/4">
                                <label htmlFor="fechaFinPeriodo" className="block mb-1 font-medium text-gray-700 dark:text-white">
                                    Fecha Fin Periodo
                                </label>
                                <input
                                    type="date"
                                    id="fechaFinPeriodo"
                                    name="fechaFinPeriodo"
                                    value={filtros.fechaFinPeriodo}
                                    min={filtros.fechaInicioPeriodo || undefined}
                                    onChange={handleChange}
                                    disabled={!filtros.fechaInicioPeriodo}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white disabled:opacity-50"
                                />
                            </div>

                            {/* Jornada */}
                            <div className="w-full md:w-1/4">
                                <label className="block mb-1 font-medium text-gray-700 dark:text-white">Jornada</label>
                                <select
                                    name="jornada"
                                    value={filtros.jornada}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                >
                                    <option value="">Todas</option>
                                    {catalogos.jornadas.map((j) => (
                                        <option key={j} value={j}>{j}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Acceso Vascular */}
                            <div className="w-full md:w-1/4">
                                <label className="block mb-1 font-medium text-gray-700 dark:text-white">Acceso Vascular</label>
                                <select
                                    name="accesovascular"
                                    value={filtros.accesovascular}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                >
                                    <option value="">Todos</option>
                                    {catalogos.accesos.map((a) => (
                                        <option key={a} value={a}>{a}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Sexo */}
                            <div className="w-full md:w-1/4">
                                <label className="block mb-1 font-medium text-gray-700 dark:text-white">Sexo</label>
                                <select
                                    name="sexo"
                                    value={filtros.sexo}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                >
                                    <option value="">Todos</option>
                                    {catalogos.sexos.map((s) => (
                                        <option key={s} value={s}>{s}</option>
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
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                                >
                                    <option value="">Todos</option>
                                    {catalogos.departamentos.map((d) => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    className="bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded"
                                >
                                    Buscar
                                </button>

                                <button
                                    type="button"
                                    className="font-medium px-4 py-2 rounded border text-white bg-[#B91C1C] hover:bg-[#991B1B] border-[#991B1B]"
                                    onClick={() => {
                                        setFiltros({ fechaInicioPeriodo: '', fechaFinPeriodo: '', sexo: '', jornada: '', accesovascular: '', departamento: '' });
                                        setPacientes([]);
                                    }}
                                >
                                    Limpiar
                                </button>

                                <button
                                    type="button"
                                    onClick={exportarExcel}
                                    disabled={pacientes.length === 0}
                                    className={`px-4 py-2 font-medium rounded border flex items-center gap-2 ${pacientes.length === 0
                                            ? 'bg-gray-300 text-white cursor-not-allowed border-gray-400'
                                            : 'bg-[#107C41] hover:bg-[#0E6A39] text-white border-[#0E6A39]'
                                        }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                      <path d="M4 3.5A1.5 1.5 0 0 1 5.5 2h8.879a1.5 1.5 0 0 1 1.06.44l3.121 3.121c.282.282.44.665.44 1.06V20.5A1.5 1.5 0 0 1 17.5 22h-12A1.5 1.5 0 0 1 4 20.5v-17Z"/>
                                      <path d="M15 2.75V5a1 1 0 0 0 1 1h2.25" className="opacity-80"/>
                                      <path d="M7.2 10h2l1.3 2.4L11.8 10h2l-2.2 4 2.2 4h-2l-1.3-2.4L9.2 18h-2l2.2-4-2.2-4Z" className="opacity-95"/>
                                    </svg>
                                    Excel
                                </button>
                                <button
                                    type="button"
                                    onClick={descargarListadoPDF}
                                    disabled={pacientes.length === 0}
                                    className={`px-4 py-2 font-medium rounded border flex items-center gap-2 ${pacientes.length === 0
                                            ? 'bg-gray-300 text-white cursor-not-allowed border-gray-400'
                                            : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white border-[#991B1B]'
                                        }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                      <path d="M6 2h9.379a1.5 1.5 0 0 1 1.06.44L20 5v14a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z"/>
                                      <path d="M7.5 10h2.25a2.25 2.25 0 1 1 0 4.5H7.5V10Zm1.5 1.5v1.5h.75a.75.75 0 0 0 0-1.5H9ZM12.75 10h2.25a.75.75 0 0 1 .75.75V15h-1.5v-1.125h-1.5V15h-1.5v-3.75a.75.75 0 0 1 .75-.75Zm1.5 1.5V12h-1.5v-.75h1.5Z" className="opacity-95"/>
                                    </svg>
                                    PDF
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>


            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-slate-700 text-sm text-left text-gray-800 dark:text-gray-100">
                    <thead className="bg-gray-100 dark:bg-slate-800 text-xs uppercase font-semibold text-gray-700 dark:text-gray-200">
                        <tr>
                            <th className="min-w-[60px] px-4 py-2">#</th>
                            <th className="min-w-[140px] px-4 py-2">No. Afiliación</th>
                            <th className="min-w-[130px] px-4 py-2">DPI</th>
                            <th className="min-w-[130px] px-4 py-2">Número Proveedor</th>
                            <th className="min-w-[220px] px-4 py-2">Nombre Completo</th>
                            <th className="min-w-[80px] px-4 py-2">Edad</th>
                            <th className="min-w-[140px] px-4 py-2">Fecha de Nacimiento</th>
                            <th className="min-w-[80px] px-4 py-2">Sexo</th>
                            <th className="min-w-[200px] px-4 py-2">Dirección</th>
                            <th className="min-w-[160px] px-4 py-2">Departamento</th>
                            <th className="min-w-[140px] px-4 py-2">Fecha Ingreso</th>
                            <th className="min-w-[160px] px-4 py-2">Estancia en el Programa</th>
                            <th className="min-w-[140px] px-4 py-2">Estado del Paciente</th>
                            <th className="min-w-[120px] px-4 py-2">Jornada</th>
                            <th className="min-w-[160px] px-4 py-2">Acceso Vascular</th>
                            <th className="min-w-[180px] px-4 py-2">Número de Formulario</th>
                            <th className="min-w-[200px] px-4 py-2">Periodo</th>
                            <th className="min-w-[120px] px-4 py-2">Sesiones Autorizadas Mes</th>
                            <th className="min-w-[120px] px-4 py-2">Sesiones Realizadas Mes</th>
                            <th className="min-w-[150px] px-4 py-2">Sesiones No Realizadas Mes</th>
                            <th className="min-w-[220px] px-4 py-2">Observaciones</th>
                            <th className="min-w-[120px] px-4 py-2">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="20" className="text-center px-4 py-4">Cargando...</td></tr>
                        ) : pacientes.length === 0 ? (
                            <tr><td colSpan="20" className="text-center px-4 py-4">No se encontraron pacientes</td></tr>
                        ) : (
                            pacientesPaginados.map((paciente, idx) => (
                                <tr key={paciente.id || idx}>
                                    <td className="px-4 py-2">{(paginaActual - 1) * filasPorPagina + idx + 1}</td>
                                    <td className="px-4 py-2">{paciente.noafiliacion || ''}</td>
                                    <td className="px-4 py-2">{paciente.dpi || ''}</td>
                                    <td className="px-4 py-2">{paciente.nopacienteproveedor || ''}</td>
                                    <td className="px-4 py-2">{[
                                        paciente.primernombre,
                                        paciente.segundonombre,
                                        paciente.otrosnombres,
                                        paciente.primerapellido,
                                        paciente.segundoapellido,
                                        paciente.apellidocasada
                                    ].filter(Boolean).join(' ')}</td>
                                    <td className="px-4 py-2">{calcularEdadHasta(paciente.fechanacimiento, fechaCortePaciente(paciente))}</td>
                                    <td className="px-4 py-2">{paciente.fechanacimiento || ''}</td>
                                    <td className="px-4 py-2">{paciente.sexo || ''}</td>
                                    <td className="px-4 py-2">{paciente.direccion || ''}</td>
                                    <td className="px-4 py-2">{paciente.departamento || ''}</td>
                                    <td className="px-4 py-2">{paciente.fechaingreso || ''}</td>
                                    <td className="px-4 py-2">{diffDMA(paciente.fechaingreso, fechaCortePaciente(paciente))}</td>
                                    <td className="px-4 py-2">{paciente.estadopaciente || paciente.estado || ''}</td>
                                    <td className="px-4 py-2">{paciente.jornada || ''}</td>
                                    <td className="px-4 py-2">{paciente.accesovascular || ''}</td>
                                    <td className="px-4 py-2">{paciente.numeroformulario || ''}</td>
                                    <td className="px-4 py-2">{formatearPeriodo(paciente.fechainicioperiodo, paciente.fechafinperiodo)}</td>
                                    <td className="px-4 py-2">{paciente.sesionesautorizadasmes || ''}</td>
                                    <td className="px-4 py-2">{paciente.sesionesrealizadasmes || ''}</td>
                                    <td className="px-4 py-2">{(Number(paciente.sesionesautorizadasmes || 0) - Number(paciente.sesionesrealizadasmes || 0))}</td>
                                    <td className="px-4 py-2">{paciente.observaciones || ''}</td>
                                    <td className="px-4 py-2">
                                        <button type="button" onClick={() => abrirDetalle(paciente)} className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm">Ver detalle</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {/* Modal de Detalle */}
            {detalle.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Detalle de Paciente (Nuevo Ingreso)</h3>
                                <button onClick={cerrarDetalle} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
                            </div>
                            {(() => {
                                const it = detalle.item || {};
                                const nombre = [it.primernombre, it.segundonombre, it.otrosnombres, it.primerapellido, it.segundoapellido, it.apellidocasada].filter(Boolean).join(' ');
                                const edad = calcularEdadHasta(it.fechanacimiento, fechaCortePaciente(it));
                                const estancia = diffDMA(it.fechaingreso, fechaCortePaciente(it));
                                return (
                                    <div className="space-y-4 text-sm">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div><span className="font-semibold">No. Afiliación:</span> {it.noafiliacion || ''}</div>
                                            <div><span className="font-semibold">DPI:</span> {it.dpi || ''}</div>
                                            <div className="md:col-span-2"><span className="font-semibold">Nombre Completo:</span> {nombre || ''}</div>
                                            <div><span className="font-semibold">Edad:</span> {edad || ''}</div>
                                            <div><span className="font-semibold">Fecha Nacimiento:</span> {it.fechanacimiento || ''}</div>
                                            <div><span className="font-semibold">Sexo:</span> {it.sexo || ''}</div>
                                            <div><span className="font-semibold">Dirección:</span> {it.direccion || ''}</div>
                                            <div><span className="font-semibold">Departamento:</span> {it.departamento || ''}</div>
                                            <div><span className="font-semibold">Fecha Ingreso:</span> {it.fechaingreso || ''}</div>
                                            <div><span className="font-semibold">Estancia (D-M-A):</span> {estancia || ''}</div>
                                            <div><span className="font-semibold">Estado:</span> {it.estadopaciente || it.estado || ''}</div>
                                            <div><span className="font-semibold">Jornada:</span> {it.jornada || ''}</div>
                                            <div><span className="font-semibold">Acceso Vascular:</span> {it.accesovascular || ''}</div>
                                            <div><span className="font-semibold">No. Formulario:</span> {it.numeroformulario || ''}</div>
                                            <div className="md:col-span-2"><span className="font-semibold">Periodo:</span> {formatearPeriodo(it.fechainicioperiodo, it.fechafinperiodo)}</div>
                                            <div className="md:col-span-2"><span className="font-semibold">Observaciones:</span> {it.observaciones || ''}</div>
                                        </div>
                                        <div className="flex items-center gap-3 pt-2">
                                            <button type="button" onClick={() => descargarPDFDetalle(it)} className="px-4 py-2 font-medium rounded bg-blue-600 hover:bg-blue-700 text-white">Descargar PDF</button>
                                            <button type="button" onClick={cerrarDetalle} className="px-4 py-2 font-medium rounded bg-gray-200 hover:bg-gray-300 text-gray-800 border">Cerrar</button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

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

        </div>
    );
};

export default NuevoIngresoReportes;
