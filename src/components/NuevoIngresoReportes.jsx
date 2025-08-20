import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Card, Form, Row, Col, Button, Table } from 'react-bootstrap';
import logoClinica from '@/assets/logoClinica2.png';
import api from '../config/api';
import './NuevoIngresoReportes.css';

function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return '';
    const fechaNac = new Date(fechaNacimiento);
    const hoy = new Date();
    let anios = hoy.getFullYear() - fechaNac.getFullYear();
    let meses = hoy.getMonth() - fechaNac.getMonth();
    let dias = hoy.getDate() - fechaNac.getDate();

    if (meses < 0 || (meses === 0 && dias < 0)) {
        anios--;
    }
    return anios >= 0 ? anios : '';
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
    const [filtros, setFiltros] = useState({ fechaInicioPeriodo: '', fechaFinPeriodo: '' });
    const [pacientes, setPacientes] = useState([]);
    const [loading, setLoading] = useState(false);

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

    const handleBuscar = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const params = { estado: 'Nuevo Ingreso' };
            if (filtros.fechaInicioPeriodo) params.fechainicio = filtros.fechaInicioPeriodo;
            if (filtros.fechaFinPeriodo) params.fechafin = filtros.fechaFinPeriodo;
            const res = await api.get('/api/pacientes', { params });
            setPacientes(res.data);
        } catch (err) {
            setPacientes([]);
        }
        setLoading(false);
    };

    // Nueva función para exportar a Excel desde backend (como PacientesReporte)
    const exportarExcel = () => {
        const params = new URLSearchParams();
        params.append('estado', 'Nuevo Ingreso');
        if (filtros.fechaInicioPeriodo) params.append('fechainicio', filtros.fechaInicioPeriodo);
        if (filtros.fechaFinPeriodo) params.append('fechafin', filtros.fechaFinPeriodo);
        window.open(`http://localhost:3001/api/reportes/nuevoingreso/excel?${params.toString()}`);
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

                            <div className="w-full md:w-1/3 flex flex-wrap items-end gap-2">
                                <button
                                    type="submit"
                                    className="bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded w-full sm:w-[6rem]"
                                >
                                    Buscar
                                </button>

                                <button
                                    type="button"
                                    className="bg-gray-400 hover:bg-gray-500 text-white font-medium px-4 py-2 rounded w-full sm:w-[6rem]"
                                    onClick={() => {
                                        setFiltros({ fechaInicioPeriodo: '', fechaFinPeriodo: '' });
                                        setPacientes([]);
                                    }}
                                >
                                    Limpiar
                                </button>

                                <button
                                    type="button"
                                    onClick={exportarExcel}
                                    disabled={pacientes.length === 0}
                                    className={`px-4 py-2 font-medium rounded transition-colors w-full sm:w-[6rem] ${pacientes.length === 0
                                            ? 'bg-gray-300 text-white cursor-not-allowed'
                                            : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                        }`}
                                >
                                    Excel
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
                            <th className="min-w-[140px] px-4 py-2">Estado del Paciente</th>
                            <th className="min-w-[120px] px-4 py-2">Jornada</th>
                            <th className="min-w-[160px] px-4 py-2">Acceso Vascular</th>
                            <th className="min-w-[180px] px-4 py-2">Número de Formulario</th>
                            <th className="min-w-[200px] px-4 py-2">Periodo</th>
                            <th className="min-w-[120px] px-4 py-2">Sesiones Autorizadas Mes</th>
                            <th className="min-w-[120px] px-4 py-2">Sesiones Realizadas Mes</th>
                            <th className="min-w-[150px] px-4 py-2">Sesiones No Realizadas Mes</th>
                            <th className="min-w-[220px] px-4 py-2">Observaciones</th>
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
                                    <td className="px-4 py-2">{calcularEdad(paciente.fechanacimiento)}</td>
                                    <td className="px-4 py-2">{paciente.fechanacimiento || ''}</td>
                                    <td className="px-4 py-2">{paciente.sexo || ''}</td>
                                    <td className="px-4 py-2">{paciente.direccion || ''}</td>
                                    <td className="px-4 py-2">{paciente.departamento || ''}</td>
                                    <td className="px-4 py-2">{paciente.fechaingreso || ''}</td>
                                    <td className="px-4 py-2">{paciente.estadopaciente || paciente.estado || ''}</td>
                                    <td className="px-4 py-2">{paciente.jornada || ''}</td>
                                    <td className="px-4 py-2">{paciente.accesovascular || ''}</td>
                                    <td className="px-4 py-2">{paciente.numeroformulario || ''}</td>
                                    <td className="px-4 py-2">{formatearPeriodo(paciente.fechainicioperiodo, paciente.fechafinperiodo)}</td>
                                    <td className="px-4 py-2">{paciente.sesionesautorizadasmes || ''}</td>
                                    <td className="px-4 py-2">{paciente.sesionesrealizadasmes || ''}</td>
                                    <td className="px-4 py-2">{(Number(paciente.sesionesautorizadasmes || 0) - Number(paciente.sesionesrealizadasmes || 0))}</td>
                                    <td className="px-4 py-2">{paciente.observaciones || ''}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
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

        </div>
    );
};

export default NuevoIngresoReportes;
