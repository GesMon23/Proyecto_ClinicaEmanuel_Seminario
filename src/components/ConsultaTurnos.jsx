import React, { useEffect, useState } from 'react';
import api from '../config/api';
import { Table, Form, Row, Col, Button, Card } from 'react-bootstrap';
import logoClinica from '@/assets/logoClinica2.png';
import './NuevoIngresoReportes.css';

const ConsultaTurnos = () => {
    const [turnos, setTurnos] = useState([]);
    const [filtros, setFiltros] = useState({ numeroafiliacion: '', fechaDesde: '', fechaHasta: '', clinica: '' });
    const [clinicas, setClinicas] = useState([]);
    const [loading, setLoading] = useState(false);

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const filasPorPagina = 10;
    const totalPaginas = Math.ceil(turnos.length / filasPorPagina);
    const turnosPaginados = turnos.slice((paginaActual - 1) * filasPorPagina, paginaActual * filasPorPagina);

    const handlePaginaChange = (nuevaPagina) => {
        setPaginaActual(nuevaPagina);
    };

    useEffect(() => {
        fetchClinicas();
        fetchTurnos();
    }, []);

    const fetchClinicas = async () => {
        try {
            const res = await api.get('/clinicas');
            setClinicas(res.data);
        } catch (err) {
            setClinicas([]);
        }
    };

    const fetchTurnos = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filtros.numeroafiliacion) params.numeroafiliacion = filtros.numeroafiliacion;
            if (filtros.clinica) params.clinica = filtros.clinica;
            const res = await api.get('/turnos', { params });
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

    return (
        <>

            <Card>
                <Card.Header>
                    <div className="flex flex-col items-center justify-center gap-4 text-center mx-auto w-full max-w-xl">
                        <img
                            src={logoClinica}
                            alt="Logo Clínica"
                            className="h-[180px] max-w-[320px] object-contain rounded-xl shadow-md p-2 dark:bg-slate-800"
                        />
                        <span className="text-3xl font-bold text-green-800 dark:text-white mb-4">
                            Consulta de Turnos
                        </span>
                    </div>
                </Card.Header>

                <div className="p-4">
                    <form onSubmit={handleBuscar}>
                        <div className="flex flex-wrap -mx-2 mb-4">
                            <div className="w-full md:w-1/3 px-2 mb-4 md:mb-0">
                                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                    Número de Afiliación
                                </label>
                                <input
                                    type="text"
                                    name="numeroafiliacion"
                                    value={filtros.numeroafiliacion}
                                    onChange={handleChange}
                                    placeholder="Ingrese número de afiliación"
                                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="w-full md:w-1/4 px-2 mb-4 md:mb-0">
                                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                    Desde
                                </label>
                                <input
                                    type="date"
                                    name="fechaDesde"
                                    value={filtros.fechaDesde}
                                    onChange={handleChange}
                                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="w-full md:w-1/4 px-2 mb-4 md:mb-0">
                                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                    Hasta
                                </label>
                                <input
                                    type="date"
                                    name="fechaHasta"
                                    value={filtros.fechaHasta}
                                    onChange={handleChange}
                                    min={filtros.fechaDesde || undefined}
                                    disabled={!filtros.fechaDesde}
                                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-900 dark:text-white disabled:opacity-50"
                                />
                            </div>
                            <div className="w-full md:w-1/3 px-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                    Clínica
                                </label>
                                <select
                                    name="clinica"
                                    value={filtros.clinica}
                                    onChange={handleChange}
                                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-900 dark:text-white"
                                >
                                    <option value="">Todas</option>
                                    {clinicas.map(clinica => (
                                        <option key={clinica.idclinica || clinica.idsala} value={clinica.descripcion}>
                                            {clinica.descripcion}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>


                        <div className="flex items-end gap-2 mb-3">
                            <button
                                type="submit"
                                className="bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-2 rounded transition-colors"
                            >
                                Buscar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setFiltros({ numeroafiliacion: '', fechaDesde: '', fechaHasta: '', clinica: '' });
                                    setTurnos([]);
                                }}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-4 py-2 rounded transition-colors dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
                            >
                                Limpiar
                            </button>
                        </div>

                        <hr />
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full mt-4 table-auto border border-gray-300 dark:border-gray-600 text-sm text-center bg-white dark:bg-slate-800">
                                <thead className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">
                                    <tr>
                                        <th className="p-2 border dark:border-gray-600">#</th>
                                        <th className="p-2 border dark:border-gray-600">Número Afiliación</th>
                                        <th className="p-2 border dark:border-gray-600">Paciente</th>
                                        <th className="p-2 border dark:border-gray-600">Fecha</th>
                                        <th className="p-2 border dark:border-gray-600">Clínica</th>
                                        <th className="p-2 border dark:border-gray-600">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="border-t dark:border-gray-600">Cargando...</td>
                                        </tr>
                                    ) : turnos.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="border-t dark:border-gray-600">No se encontraron turnos</td>
                                        </tr>
                                    ) : (
                                        turnosPaginados.map((turno, idx) => (
                                            <tr key={turno.idturno || idx} className="hover:bg-gray-100 dark:hover:bg-slate-700">
                                                <td className="p-2 border dark:border-gray-600">{(paginaActual - 1) * filasPorPagina + idx + 1}</td>
                                                <td className="p-2 border dark:border-gray-600">{turno.numeroafiliacion}</td>
                                                <td className="p-2 border dark:border-gray-600">{turno.nombrepaciente}</td>
                                                <td className="p-2 border dark:border-gray-600">{turno.fecha}</td>
                                                <td className="p-2 border dark:border-gray-600">{turno.nombreclinica}</td>
                                                <td className="p-2 border dark:border-gray-600">{turno.estado}</td>
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
                    </form>
                </div>
            </Card>
        </>
    );
};

export default ConsultaTurnos;
