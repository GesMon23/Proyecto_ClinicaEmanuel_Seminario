import React, { useEffect, useState } from "react";
import { Form, Button, Table, Row, Col, Card } from "react-bootstrap";
import logoClinica from '@/assets/logoClinica2.png';
import axios from "axios";

// Eliminar array local de estados, ahora vendrán de la API


function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return '';
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let anios = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
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

function PacientesReporte() {

  const [filtros, setFiltros] = useState({ FechaInicioPeriodo: '', FechaFinPeriodo: '', Numeroformulario: '' });



  // Función para manejar el cambio de estado
  const handleEstadoChange = (e) => {
    setFiltros({ ...filtros, Estado: e.target.value });
  };

  // Función para descargar Excel
  const descargarExcel = () => {
    const params = new URLSearchParams();
    if (filtros.FechaInicioPeriodo) params.append('fechainicio', filtros.FechaInicioPeriodo);
    if (filtros.FechaFinPeriodo) params.append('fechafin', filtros.FechaFinPeriodo);
    if (filtros.Estado) params.append('estado', filtros.Estado);
    if (filtros.Numeroformulario) params.append('numeroformulario', filtros.Numeroformulario);
    window.open(`http://localhost:3001/api/pacientes/excel?${params.toString()}`);
  };
  // Renderiza el select de estados
  // ...otros componentes y filtros...
  // Ejemplo de uso en el render:
  // <select value={filtros.Estado} onChange={handleEstadoChange}>
  //   <option value="">Todos</option>
  //   {estados.map(e => (
  //     <option key={e.idestado} value={e.idestado}>{e.descripcion}</option>
  //   ))}
  // </select>

  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  // Ya no se filtra localmente, los datos vienen filtrados del backend

  const handleBuscar = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const params = {};
      if (filtros.FechaInicioPeriodo) params.fechainicio = filtros.FechaInicioPeriodo;
      if (filtros.FechaFinPeriodo) params.fechafin = filtros.FechaFinPeriodo;
      if (filtros.Estado) params.estado = filtros.Estado;
      if (filtros.Numeroformulario) params.numeroformulario = filtros.Numeroformulario;
      const res = await axios.get("http://localhost:3001/api/pacientes", { params });
      setPacientes(res.data);
    } catch (error) {
      setPacientes([]);
      alert("Error al buscar pacientes");
    }
    setCargando(false);
  };

  // Limpiar igual que en NuevoIngresoReportes
  const handleLimpiar = () => {
    setFiltros({ FechaInicioPeriodo: "", FechaFinPeriodo: "", Numeroformulario: "" });
    setPacientes([]);
  };

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const filasPorPagina = 10;
  const totalPaginas = Math.ceil(pacientes.length / filasPorPagina);
  const pacientesPaginados = pacientes.slice((paginaActual - 1) * filasPorPagina, paginaActual * filasPorPagina);

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
            <span className="text-2xl font-semibold text-green-800 tracking-wide dark:text-white">
              Reporte de Pacientes
            </span>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleBuscar}>
            <div className="flex flex-wrap gap-6 mb-6">
              <div className="w-full md:w-1/4">
                <label htmlFor="FechaInicioPeriodo" className="block mb-1 font-medium text-gray-700 dark:text-white">
                  Fecha Inicio Periodo
                </label>
                <input
                  type="date"
                  id="FechaInicioPeriodo"
                  name="FechaInicioPeriodo"
                  value={filtros.FechaInicioPeriodo}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="w-full md:w-1/4">
                <label htmlFor="FechaFinPeriodo" className="block mb-1 font-medium text-gray-700 dark:text-white">
                  Fecha Fin Periodo
                </label>
                <input
                  type="date"
                  id="FechaFinPeriodo"
                  name="FechaFinPeriodo"
                  value={filtros.FechaFinPeriodo}
                  min={filtros.FechaInicioPeriodo || undefined}
                  onChange={handleChange}
                  disabled={!filtros.FechaInicioPeriodo}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white disabled:opacity-50"
                />
              </div>

              <div className="w-full md:w-1/4">
                <label htmlFor="Numeroformulario" className="block mb-1 font-medium text-gray-700 dark:text-white">
                  Número Formulario
                </label>
                <input
                  type="text"
                  id="Numeroformulario"
                  name="Numeroformulario"
                  value={filtros.Numeroformulario}
                  onChange={handleChange}
                  placeholder="Ingrese número de formulario"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-white"
                />
              </div>
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
                onClick={handleLimpiar}
                className="bg-gray-400 hover:bg-gray-500 text-white font-medium px-4 py-2 rounded"
              >
                Limpiar
              </button>

              {pacientes.length > 0 && (
                <button
                  type="button"
                  onClick={descargarExcel}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded"
                >
                  Excel
                </button>
              )}
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
            {cargando ? (
              <tr>
                <td colSpan="20" className="text-center px-4 py-4">
                  Cargando...
                </td>
              </tr>
            ) : pacientes.length === 0 ? (
              <tr>
                <td colSpan="20" className="text-center px-4 py-4">
                  No se encontraron pacientes
                </td>
              </tr>
            ) : (
              pacientesPaginados.map((paciente, idx) => (
                <tr key={paciente.noafiliacion + '-' + idx} className="border-b border-gray-200 dark:border-slate-700">
                  <td className="px-4 py-2">{(paginaActual - 1) * filasPorPagina + idx + 1}</td>
                  <td className="px-4 py-2">{paciente.noafiliacion || ''}</td>
                  <td className="px-4 py-2">{paciente.dpi || ''}</td>
                  <td className="px-4 py-2">{paciente.nopacienteproveedor || ''}</td>
                  <td className="px-4 py-2">
                    {[
                      paciente.primernombre,
                      paciente.segundonombre,
                      paciente.otrosnombres,
                      paciente.primerapellido,
                      paciente.segundoapellido,
                      paciente.apellidocasada,
                    ].filter(Boolean).join(' ')}
                  </td>
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
                  <td className="px-4 py-2">
                    {formatearPeriodo(paciente.fechainicioperiodo, paciente.fechafinperiodo)}
                  </td>
                  <td className="px-4 py-2">{paciente.sesionesautorizadasmes || ''}</td>
                  <td className="px-4 py-2">{paciente.sesionesrealizadasmes || ''}</td>
                  <td className="px-4 py-2">
                    {Number(paciente.sesionesautorizadasmes || 0) - Number(paciente.sesionesrealizadasmes || 0)}
                  </td>
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
}

export default PacientesReporte;
