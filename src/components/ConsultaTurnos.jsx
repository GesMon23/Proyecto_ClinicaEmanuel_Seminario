import React, { useEffect, useState } from 'react';
import api from '../config/api';
import { Table, Form, Row, Col, Button, Card } from 'react-bootstrap';
import logoClinica from '@/assets/logoClinica2.png';
import './NuevoIngresoReportes.css';

const ConsultaTurnos = () => {
    const [turnos, setTurnos] = useState([]);
    const [filtros, setFiltros] = useState({ numeroafiliacion: '', fechaDesde: '', fechaHasta: '', clinica: '', estado: '' });
    const [clinicas, setClinicas] = useState([]);
    const [estados, setEstados] = useState([]);
    const [loading, setLoading] = useState(false);

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const [filasPorPagina, setFilasPorPagina] = useState(5); // por defecto 5
    const totalPaginas = Math.ceil(turnos.length / filasPorPagina);
    const turnosPaginados = turnos.slice((paginaActual - 1) * filasPorPagina, paginaActual * filasPorPagina);

    const handlePaginaChange = (nuevaPagina) => {
        setPaginaActual(nuevaPagina);
    };

    useEffect(() => {
        fetchClinicas();
        fetchEstados();
        fetchTurnos();
    }, []);

    const fetchClinicas = async () => {
        try {
            const res = await api.get('/GclinicasT');
            setClinicas(res.data);
        } catch (err) {
            setClinicas([]);
        }
    };

    const fetchEstados = async () => {
        try {
            const res = await api.get('/GestadosTurnoT');
            setEstados(res.data || []);
        } catch (err) {
            setEstados([]);
        }
    };

    const fetchTurnos = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filtros.numeroafiliacion) params.numeroafiliacion = filtros.numeroafiliacion;
            if (filtros.clinica) params.clinica = filtros.clinica;
            if (filtros.estado) params.estado = filtros.estado;
            const res = await api.get('/GturnosT', { params });
            let turnosFiltrados = res.data;
            // Filtrar por rango de fechas si están presentes
            if (filtros.fechaDesde) {
                turnosFiltrados = turnosFiltrados.filter(t => t.fecha >= filtros.fechaDesde);
            }
            if (filtros.fechaHasta) {
                turnosFiltrados = turnosFiltrados.filter(t => t.fecha <= filtros.fechaHasta);
            }
            setTurnos(turnosFiltrados);
        } catch (err) {
            setTurnos([]);
        }
        setLoading(false);
    };

    const handleChange = (e) => {
        setFiltros({ ...filtros, [e.target.name]: e.target.value });
    };

    const handleBuscar = (e) => {
        e.preventDefault();
        setPaginaActual(1); // Siempre cargar la página 1 al buscar
        fetchTurnos();
    };

    const handleFilasPorPaginaChange = (e) => {
        const value = parseInt(e.target.value, 10);
        setFilasPorPagina(value);
        setPaginaActual(1);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header Card */}
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-6 flex-wrap mb-4">
                    <img
                        src={logoClinica}
                        alt="Logo Clínica"
                        className="h-[140px] sm:h-[160px] lg:h-[180px] max-w-[280px] sm:max-w-[320px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                    />
                    <h1 className="text-2xl sm:text-3xl font-bold text-green-800 dark:text-white">
                        Consulta de Turnos
                    </h1>
                </div>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-slate-600 to-transparent"></div>
            </div>

            {/* Filters Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
                    Filtros de Búsqueda
                </h2>
                
                <form onSubmit={handleBuscar}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Número de Afiliación
                            </label>
                            <input
                                type="text"
                                name="numeroafiliacion"
                                value={filtros.numeroafiliacion}
                                onChange={handleChange}
                                placeholder="Ingrese número de afiliación"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:bg-slate-800 dark:text-white transition-colors"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Desde
                            </label>
                            <input
                                type="date"
                                name="fechaDesde"
                                value={filtros.fechaDesde}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:bg-slate-800 dark:text-white transition-colors"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Hasta
                            </label>
                            <input
                                type="date"
                                name="fechaHasta"
                                value={filtros.fechaHasta}
                                onChange={handleChange}
                                min={filtros.fechaDesde || undefined}
                                disabled={!filtros.fechaDesde}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:bg-slate-800 dark:text-white disabled:opacity-50 transition-colors"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Clínica
                            </label>
                            <select
                                name="clinica"
                                value={filtros.clinica}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:bg-slate-800 dark:text-white transition-colors"
                            >
                                <option value="">Todas</option>
                                {clinicas.map(clinica => (
                                    <option key={clinica.idclinica || clinica.idsala} value={clinica.descripcion}>
                                        {clinica.descripcion}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Estado
                            </label>
                            <select
                                name="estado"
                                value={filtros.estado}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:bg-slate-800 dark:text-white transition-colors"
                            >
                                <option value="">Todos</option>
                                {estados.map(est => (
                                    <option key={est.id_estado_turno} value={est.descripcion}>
                                        {est.descripcion}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="submit"
                            className="px-6 py-2 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-lg transition-colors"
                        >
                            Buscar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setFiltros({ numeroafiliacion: '', fechaDesde: '', fechaHasta: '', clinica: '', estado: '' });
                                setTurnos([]);
                            }}
                            className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors dark:bg-slate-600 dark:hover:bg-slate-700"
                        >
                            Limpiar
                        </button>
                    </div>
                </form>
            </div>

            {/* Results Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                        Resultados
                    </h2>
                    <div className="flex items-center gap-4">
                        {turnos.length > 0 && (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {turnos.length} turno{turnos.length !== 1 ? 's' : ''} encontrado{turnos.length !== 1 ? 's' : ''}
                            </span>
                        )}
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-700 dark:text-gray-300">Filas por página:</label>
                            <select
                                value={filasPorPagina}
                                onChange={handleFilasPorPaginaChange}
                                className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-white"
                            >
                                <option value={3}>3</option>
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={15}>15</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full table-auto border border-gray-300 dark:border-gray-600 text-sm text-center bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
                        <thead className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">
                            <tr>
                                <th className="p-3 border dark:border-gray-600 font-semibold">#</th>
                                <th className="p-3 border dark:border-gray-600 font-semibold">Código</th>
                                <th className="p-3 border dark:border-gray-600 font-semibold">Número Afiliación</th>
                                <th className="p-3 border dark:border-gray-600 font-semibold">Paciente</th>
                                <th className="p-3 border dark:border-gray-600 font-semibold">Fecha</th>
                                <th className="p-3 border dark:border-gray-600 font-semibold">Clínica</th>
                                <th className="p-3 border dark:border-gray-600 font-semibold">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-6 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                                            <span className="text-gray-600 dark:text-gray-400">Cargando...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : turnos.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-6 text-center text-gray-500 dark:text-gray-400 italic">
                                        No se encontraron turnos
                                    </td>
                                </tr>
                            ) : (
                                turnosPaginados.map((turno, idx) => (
                                    <tr key={turno.id_turno || idx} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                        <td className="p-3 border dark:border-gray-600 text-gray-800 dark:text-gray-200 font-medium">
                                            {(paginaActual - 1) * filasPorPagina + idx + 1}
                                        </td>
                                        <td className="p-3 border dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                            {turno.id_turno_cod}
                                        </td>
                                        <td className="p-3 border dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                            {turno.numeroafiliacion}
                                        </td>
                                        <td className="p-3 border dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                            {turno.nombrepaciente}
                                        </td>
                                        <td className="p-3 border dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                            {turno.fecha}
                                        </td>
                                        <td className="p-3 border dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                            {turno.nombreclinica}
                                        </td>
                                        <td className="p-3 border dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                            {turno.estado}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {totalPaginas > 1 && (
                    <div className="flex flex-wrap justify-center items-center gap-2 mt-6">
                        <button
                            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                            disabled={paginaActual === 1}
                            onClick={() => handlePaginaChange(paginaActual - 1)}
                        >
                            Anterior
                        </button>
                        {[...Array(totalPaginas)].map((_, i) => (
                            <button
                                key={i}
                                className={`px-3 py-2 rounded-lg transition-colors ${
                                    paginaActual === i + 1
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                                }`}
                                onClick={() => handlePaginaChange(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                            disabled={paginaActual === totalPaginas}
                            onClick={() => handlePaginaChange(paginaActual + 1)}
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConsultaTurnos;