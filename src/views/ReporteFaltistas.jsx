import React, { useState, useEffect } from "react";
import { Card, Form, Row, Col, Button, Table } from "react-bootstrap";
import logoClinica from '@/assets/logoClinica2.png';
import '../components/NuevoIngresoReportes.css';

const ReporteFaltistas = () => {
  // Filtros y datos mock
  const [filtros, setFiltros] = useState({ fechaInicio: '', fechaFin: '' });
  const [faltistas, setFaltistas] = useState([]);
  const [todosFaltistas, setTodosFaltistas] = useState([]);
  const [buscado, setBuscado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const filasPorPagina = 10;
  const totalPaginas = Math.ceil(faltistas.length / filasPorPagina);
  const faltistasPaginados = faltistas.slice((paginaActual - 1) * filasPorPagina, paginaActual * filasPorPagina);

  const handleChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  const handleBuscar = async (e) => {
    e.preventDefault();
    setLoading(true);
    setBuscado(true);
    try {
      const res = await fetch('http://localhost:3001/api/faltistas');
      const data = await res.json();
      setTodosFaltistas(data);
      let filtrados = [...data];
      if (filtros.fechaInicio) {
        filtrados = filtrados.filter(f => f.fechafalta >= filtros.fechaInicio);
      }
      if (filtros.fechaFin) {
        filtrados = filtrados.filter(f => f.fechafalta <= filtros.fechaFin);
      }
      setFaltistas(filtrados);
      setPaginaActual(1);
    } catch {
      setTodosFaltistas([]);
      setFaltistas([]);
    }
    setLoading(false);
  };



  const handleLimpiar = () => {
    setFiltros({ fechaInicio: '', fechaFin: '' });
    setFaltistas([]);
    setTodosFaltistas([]);
    setPaginaActual(1);
    setBuscado(false);
  };

  const handlePaginaChange = (nuevaPagina) => {
    setPaginaActual(nuevaPagina);
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
              <div className="w-full md:w-1/3 flex flex-wrap items-end gap-2">
                <Button type="submit" className="bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded w-full sm:w-[6rem]">Buscar</Button>
                <Button type="button" className="bg-gray-400 hover:bg-gray-500 text-white font-medium px-4 py-2 rounded w-full sm:w-[6rem]" onClick={handleLimpiar}>Limpiar</Button>
                {/* Aquí podría ir un botón de exportar si se requiere en el futuro */}
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table striped bordered hover className="min-w-full divide-y divide-gray-300 dark:divide-slate-700 text-sm text-left text-gray-800 dark:text-gray-100">
          <thead className="bg-gray-100 dark:bg-slate-800 text-xs uppercase font-semibold text-gray-700 dark:text-gray-200">
            <tr>
              <th className="min-w-[60px] px-4 py-2">#</th>
              <th className="min-w-[140px] px-4 py-2">No. Afiliación</th>
              <th className="min-w-[220px] px-4 py-2">Nombres y Apellidos</th>
              <th className="min-w-[180px] px-4 py-2">Clínica</th>
              <th className="min-w-[140px] px-4 py-2">Fecha de Falta</th>
              <th className="min-w-[180px] px-4 py-2">Motivo de Falta</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center px-4 py-4">Cargando...</td></tr>
            ) : !buscado ? (
              <tr><td colSpan="6" className="text-center px-4 py-4">Realice una búsqueda para ver resultados</td></tr>
            ) : faltistasPaginados.length === 0 ? (
              <tr><td colSpan="6" className="text-center px-4 py-4">No se encontraron faltistas</td></tr>
            ) : (
              faltistasPaginados.map((f, idx) => (
                <tr key={f.noafiliacion + f.fechafalta}>
                  <td className="px-4 py-2">{(paginaActual - 1) * filasPorPagina + idx + 1}</td>
                  <td className="px-4 py-2">{f.noafiliacion}</td>
                  <td className="px-4 py-2">{f.nombres} {f.apellidos}</td>
                  <td className="px-4 py-2">{f.clinica}</td>
                  <td className="px-4 py-2">{f.fechafalta}</td>
                  <td className="px-4 py-2">{f.motivofalta}</td>
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

export default ReporteFaltistas;
