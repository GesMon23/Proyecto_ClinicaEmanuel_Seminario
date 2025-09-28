import React, { useState, useEffect } from "react";
import { PencilLine ,Trash } from "lucide-react";
import api from "../config/api";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import logoClinica from "@/assets/logoClinica2.png";

const CustomModal = ({ show, onClose, title, message, type, onConfirm }) => {
  if (!show) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed z-50 top-1/2 left-1/2 w-11/12 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white dark:bg-slate-900 shadow-lg p-6">
        <h4
          className={`text-lg font-bold mb-3 ${
            type === "success"
              ? "text-green-700 dark:text-green-400"
              : type === "error"
              ? "text-red-700 dark:text-red-400"
              : "text-slate-800 dark:text-slate-200"
          }`}
        >
          {title}
        </h4>
        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
          {message}
        </p>
        {type === "confirm" ? (
          <div className="flex justify-end gap-3 mt-5">
            <button
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              onClick={onConfirm}
            >
              Sí, eliminar
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-gray-400 text-white hover:bg-gray-500"
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex justify-end mt-5">
            <button
              className={`px-4 py-2 rounded-lg ${
                type === "success"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              } text-white`}
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </>
  );
};

const GestionTurno = () => {
  const [numeroAfiliacion, setNumeroAfiliacion] = useState("");
  const [opcionSeleccionada, setOpcionSeleccionada] = useState("");
  const [nombrePaciente, setNombrePaciente] = useState("");
  const [clinicas, setClinicas] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [eventosCalendario, setEventosCalendario] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [turnoEditando, setTurnoEditando] = useState(null);
  const [calendarioHabilitado, setCalendarioHabilitado] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");
  const [idTurnoAEliminar, setIdTurnoAEliminar] = useState(null);
  const [onConfirmEliminar, setOnConfirmEliminar] = useState(null);
  // UX estados
  const [buscando, setBuscando] = useState(false);
  const [resaltarNombre, setResaltarNombre] = useState(false);
  // Paginación tabla turnos
  const [paginaActual, setPaginaActual] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(5);
  const totalPaginas = Math.ceil(turnos.length / filasPorPagina);
  const turnosPaginados = turnos.slice(
    (paginaActual - 1) * filasPorPagina,
    paginaActual * filasPorPagina
  );
  const handlePaginaChange = (nueva) => setPaginaActual(nueva);
  const handleFilasPorPaginaChange = (e) => {
    setFilasPorPagina(parseInt(e.target.value, 10));
    setPaginaActual(1);
  };

  const handleCloseModal = () => setShowModal(false);

  const showSuccessModal = (message) => {
    setModalMessage(message);
    setModalType("success");
    setShowModal(true);
  };

  const showErrorModal = (message) => {
    setModalMessage(message);
    setModalType("error");
    setShowModal(true);
  };

  useEffect(() => {
    const fetchClinicas = async () => {
      try {
        const response = await api.get("/GclinicasT");
        setClinicas(response.data);
      } catch (error) {
        showErrorModal("Error al cargar clínicas");
      }
    };
    fetchClinicas();
  }, []);

  // Función para aplicar colores del tema
  const applyCalendarThemeColors = () => {
    const titleElement = document.querySelector('.fc-toolbar-title');
    const dayNumbers = document.querySelectorAll('.fc-daygrid-day-number');
    const dayNumbersInTop = document.querySelectorAll('.fc-daygrid-day-top .fc-daygrid-day-number');
    const allDayNumbers = document.querySelectorAll('.fc-daygrid-day .fc-daygrid-day-number, .fc-daygrid-day-top .fc-daygrid-day-number, .fc-daygrid-day-frame .fc-daygrid-day-number');
    const isDark = document.documentElement.classList.contains('dark');
    
    if (titleElement) {
      titleElement.style.color = isDark ? '#f1f5f9' : '#1e293b';
    }
    
    // Aplicar a todos los selectores posibles de números
    [dayNumbers, dayNumbersInTop, allDayNumbers].forEach(nodeList => {
      nodeList.forEach(dayNumber => {
        dayNumber.style.color = isDark ? '#94a3b8 !important' : '#000000 !important';
        dayNumber.style.setProperty('color', isDark ? '#94a3b8' : '#000000', 'important');
      });
    });
    
    // Forzar con CSS dinámico
    const existingStyle = document.getElementById('dynamic-calendar-colors');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'dynamic-calendar-colors';
    style.textContent = `
      .fc-daygrid-day-number {
        color: ${isDark ? '#94a3b8' : '#000000'} !important;
      }
      .fc-daygrid-day-top .fc-daygrid-day-number {
        color: ${isDark ? '#94a3b8' : '#000000'} !important;
      }
      .fc-daygrid-day-frame .fc-daygrid-day-number {
        color: ${isDark ? '#94a3b8' : '#000000'} !important;
      }
      .fc-highlight {
        background: ${isDark 
          ? 'linear-gradient(135deg, #14532d 0%, #166534 100%)' 
          : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'} !important;
        border: 3px solid ${isDark ? '#22c55e' : '#16a34a'} !important;
        border-radius: 0.5rem !important;
        box-shadow: 0 0 0 2px ${isDark 
          ? 'rgba(34, 197, 94, 0.4)' 
          : 'rgba(22, 163, 74, 0.3)'} !important;
      }
    `;
    document.head.appendChild(style);
  };

  // Listener para cambios de tema
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          setTimeout(() => {
            applyCalendarThemeColors();
          }, 50);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const handleBuscar = async () => {
    setBuscando(true);
    try {
      // Buscar información del paciente
      const response = await api.get(`/GpacientesT/${numeroAfiliacion}`);
      const paciente = response.data;

      if (!paciente) {
        showErrorModal("El paciente no existe");
        setCalendarioHabilitado(false);
        return;
      }

      setNombrePaciente(paciente.nombrepaciente || `${paciente.primer_nombre || ''} ${paciente.segundo_nombre || ''} ${paciente.primer_apellido || ''} ${paciente.segundo_apellido || ''}`.trim());
      setCalendarioHabilitado(true);
      // Resaltar el nombre brevemente
      setResaltarNombre(true);
      setTimeout(() => setResaltarNombre(false), 1600);

      // Buscar turnos del paciente
      try {
        const turnosResponse = await api.get(
          `/GmuestraTurnosT?noafiliacion=${numeroAfiliacion}`
        );
        const turnosPaciente = turnosResponse.data || [];
        setTurnos(turnosPaciente);
        setPaginaActual(1);

        const eventos = turnosPaciente.map((turno) => ({
          title: `Clínica: ${turno.nombre_clinica}`,
          start: new Date(turno.fecha_turno),
          end: new Date(
            new Date(turno.fecha_turno).getTime() + 24 * 60 * 60 * 1000
          ),
          allDay: true,
          extendedProps: {
            turnoId: turno.id_turno,
            noAfiliacion: turno.noafiliacion,
            paciente: turno.nombrepaciente,
            clinica: turno.nombre_clinica,
          },
        }));
        setEventosCalendario(eventos);
      } catch (turnosError) {
        console.log("Error al cargar turnos:", turnosError);
        // Si falla cargar turnos, aún permitimos continuar con el paciente encontrado
        setTurnos([]);
        setEventosCalendario([]);
      }
    } catch (error) {
      console.log("Error al buscar paciente:", error);
      showErrorModal("Error al buscar paciente");
      setCalendarioHabilitado(false);
    }
    setBuscando(false);
  };

  const handleCancelar = () => {
    setNumeroAfiliacion("");
    setOpcionSeleccionada("");
    setNombrePaciente("");
    setTurnos([]);
    setEventosCalendario([]);
    setFechaSeleccionada(null);
    setModoEdicion(false);
    setTurnoEditando(null);
    setCalendarioHabilitado(false);
    setPaginaActual(1);
  };

  const handleEditar = (idTurno) => {
    const turno = turnos.find((t) => t.id_turno === idTurno);
    if (turno) {
      setModoEdicion(true);
      setTurnoEditando(turno);
      setOpcionSeleccionada(turno.nombre_clinica);
      setFechaSeleccionada(new Date(turno.fecha_turno));
    }
  };

  const handleEliminar = (idTurno) => {
    setIdTurnoAEliminar(idTurno);
    setModalMessage("¿Está seguro que desea eliminar este turno?");
    setModalType("confirm");
    setShowModal(true);
    setOnConfirmEliminar(() => () => confirmarEliminarTurno(idTurno));
  };

  const confirmarEliminarTurno = async (idTurno) => {
    try {
      const response = await api.delete(`/eliminar-turno/${idTurno}`);
      if (response.data.success) {
        showSuccessModal("Turno eliminado correctamente");
        // Actualizar tanto la lista de turnos como los eventos del calendario
        const turnosActualizados = turnos.filter((t) => t.id_turno !== idTurno);
        setTurnos(turnosActualizados);
        // Ajustar página si quedó fuera de rango
        const nuevasPaginas = Math.max(1, Math.ceil(turnosActualizados.length / filasPorPagina));
        setPaginaActual((prev) => Math.min(prev, nuevasPaginas));
        
        const eventosActualizados = turnosActualizados.map((turno) => ({
          title: `Clínica: ${turno.nombre_clinica}`,
          start: new Date(turno.fecha_turno),
          end: new Date(
            new Date(turno.fecha_turno).getTime() + 24 * 60 * 60 * 1000
          ),
          allDay: true,
          extendedProps: {
            turnoId: turno.id_turno,
            noAfiliacion: turno.noafiliacion,
            paciente: turno.nombrepaciente,
            clinica: turno.nombre_clinica,
          },
        }));
        setEventosCalendario(eventosActualizados);
      } else {
        showErrorModal("No se pudo eliminar el turno.");
      }
    } catch (error) {
      showErrorModal("Error al eliminar el turno.");
    }
    setIdTurnoAEliminar(null);
    setOnConfirmEliminar(null);
  };

  const handleEventClick = (clickInfo) => {
    const evento = clickInfo.event;
    const props = evento.extendedProps;
    showSuccessModal(
      `Información del Turno:\n` +
        `Turno: # ${props.turnoId}\n` +
        `Paciente: ${props.paciente}\n` +
        `No. Afiliación: ${props.noAfiliacion}\n` +
        `Clínica: ${props.clinica}\n` +
        `Fecha: ${evento.start.toLocaleDateString()}`
    );
  };

  const handleSelectDate = (selectInfo) => {
    setFechaSeleccionada(selectInfo.start);
  };

  const handleAceptar = async () => {
    if (!opcionSeleccionada || !fechaSeleccionada) {
      showErrorModal("Debe seleccionar una clínica y una fecha");
      return;
    }

    try {
      const response = await api.post("/Gcrear-turnoT", {
        noAfiliacion: numeroAfiliacion,
        clinica: opcionSeleccionada,
        fechaTurno: fechaSeleccionada.toISOString().split('T')[0]
      });

      if (response.data.success) {
        showSuccessModal("Turno creado exitosamente");
        // Refrescar la lista de turnos
        await handleBuscar();
        setOpcionSeleccionada("");
        setFechaSeleccionada(null);
      }
    } catch (error) {
      console.log("Error al crear turno:", error);
      const errorMessage = error.response?.data?.detail || error.message || "Error al crear el turno";
      showErrorModal(`Error al crear el turno: ${errorMessage}`);
    }
  };

  const handleGuardar = async () => {
    if (!turnoEditando || !fechaSeleccionada || !opcionSeleccionada) {
      showErrorModal("Debe seleccionar una fecha y una clínica");
      return;
    }

    try {
      const response = await api.put(`/Gactualizar-turnoT/${turnoEditando.id_turno}`, {
        fechaTurno: fechaSeleccionada.toISOString().split('T')[0],
        clinica: opcionSeleccionada
      });

      if (response.data.success) {
        showSuccessModal("Turno actualizado exitosamente");
        // Refrescar la lista de turnos
        await handleBuscar();
        setModoEdicion(false);
        setTurnoEditando(null);
        setOpcionSeleccionada("");
        setFechaSeleccionada(null);
      }
    } catch (error) {
      showErrorModal("Error al actualizar el turno");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <CustomModal
        show={showModal}
        onClose={handleCloseModal}
        title={
          modalType === "success"
            ? "Éxito"
            : modalType === "confirm"
            ? "Confirmar"
            : "Error"
        }
        message={modalMessage}
        type={modalType}
        onConfirm={onConfirmEliminar}
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Izquierda: formulario + tabla */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
          <div className="text-center mb-4">
            <img src={logoClinica} alt="Logo clínica" className="mx-auto h-20" />
            <h1 className="text-2xl sm:text-3xl font-bold text-green-800 dark:text-white">
                          Creación de Turnos
                          </h1>
            <hr className="border-slate-300 dark:border-slate-700 my-4" />
          </div>

          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="Número de Afiliación"
              value={numeroAfiliacion}
              onChange={(e) => setNumeroAfiliacion(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
            <button
              onClick={handleBuscar}
              disabled={buscando || !numeroAfiliacion}
              className={`px-4 py-2 rounded-lg text-white ${buscando ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-700 hover:bg-green-800'}`}
            >
              {buscando ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Buscando...
                </span>
              ) : (
                'Buscar'
              )}
            </button>
          </div>

          <div
            className={`transition-colors duration-500 rounded-lg px-3 py-2 mb-2 inline-flex items-center gap-3 ${
              resaltarNombre && nombrePaciente
                ? 'bg-green-50 ring-2 ring-green-500 dark:bg-green-900/20'
                : ''
            }`}
            aria-live="polite"
          >
            <h3 className="text-xl font-semibold text-green-800 dark:text-green-700">
              {nombrePaciente || "Nombre del paciente"}
            </h3>
            {nombrePaciente && resaltarNombre && (
              <span className="inline-flex items-center text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full">
                Paciente encontrado
              </span>
            )}
          </div>
          <hr className="border-slate-300 dark:border-slate-700 mb-4" />

          {modoEdicion && turnoEditando && (
            <div
              className="mb-4 flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-900 dark:border-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-200"
              role="status"
              aria-live="polite"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5 mt-0.5 flex-shrink-0"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9.401 3.004c1.155-2.007 4.043-2.007 5.198 0l6.77 11.76c1.155 2.007-.289 4.51-2.6 4.51H5.23c-2.31 0-3.754-2.503-2.6-4.51l6.77-11.76zM12 8.25a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-sm">
                <p className="font-semibold">Modo edición activo</p>
                <p>
                  Actualizando turno #<span className="font-medium">{turnoEditando.id_turno}</span>. Cambia la clínica y/o la fecha y presiona <span className="font-medium">Guardar</span>.
                </p>
              </div>
            </div>
          )}

          {/* Controles de tabla */}
          <div className="flex items-center justify-end mb-2 gap-3">
            <label className="text-sm text-gray-700 dark:text-gray-300">Filas por página:</label>
            <select
              value={filasPorPagina}
              onChange={handleFilasPorPaginaChange}
              className="px-2 py-1 border border-gray-300 dark:border-slate-700 rounded-md dark:bg-slate-800 dark:text-white"
            >
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto border border-gray-300 dark:border-gray-600 text-sm text-center bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="p-3 border dark:border-gray-600 font-semibold">ID Turno</th>
                  <th className="p-3 border dark:border-gray-600 font-semibold">Clínica</th>
                  <th className="p-3 border dark:border-gray-600 font-semibold">Fecha</th>
                  <th className="p-3 border dark:border-gray-600 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {turnos.length > 0 ? (
                  turnosPaginados.map((turno) => (
                    <tr key={turno.id_turno} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <td className="p-3 border dark:border-gray-600 text-gray-800 dark:text-gray-200 font-medium">
                        {turno.id_turno_cod}
                      </td>
                      <td className="p-3 border dark:border-gray-600 text-gray-800 dark:text-gray-200">
                        {turno.nombre_clinica}
                      </td>
                      <td className="p-3 border dark:border-gray-600 text-gray-800 dark:text-gray-200">
                        {new Date(turno.fecha_turno).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </td>
                      <td className="p-3 border dark:border-gray-600">
                        <div className="flex justify-center gap-2">
                          <button
                            title="Editar"
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/30 transition-colors"
                            onClick={() => handleEditar(turno.id_turno)}
                          >
                            <PencilLine />
                          </button>
                          <button
                            title="Eliminar"
                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30 transition-colors"
                            onClick={() => handleEliminar(turno.id_turno)}
                          >
                            <Trash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-gray-500 dark:text-gray-400 italic">
                      No hay turnos registrados para este paciente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex flex-wrap justify-center items-center gap-2 mt-4">
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

          <div className="mt-4">
            <select
              value={opcionSeleccionada}
              onChange={(e) => setOpcionSeleccionada(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              disabled={!calendarioHabilitado}
            >
              <option value="">Seleccione una clínica</option>
              {clinicas.map((clinica) => (
                <option key={clinica.idsala} value={clinica.descripcion}>
                  {clinica.descripcion}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between mt-4">
            <button
              className="px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800"
              onClick={handleCancelar}
            >
              Cancelar
            </button>
            {modoEdicion ? (
              <button
                className="px-4 py-2 rounded-lg bg-green-700 text-white hover:bg-green-800"
                onClick={handleGuardar}
              >
                Guardar
              </button>
            ) : (
              <button
                className="px-4 py-2 rounded-lg bg-green-700 text-white hover:bg-green-800"
                onClick={handleAceptar}
              >
                Aceptar
              </button>
            )}
          </div>
        </div>

        {/* Derecha: calendario */}
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-slate-700">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold text-green-800 dark:text-green-700 mb-2">
                Calendario de Turnos
              </h3>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                calendarioHabilitado 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {calendarioHabilitado ? '✓ Activo' : 'X Inactivo'}
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {calendarioHabilitado 
                ? "Haz clic en una fecha para programar un nuevo turno" 
                : "Busca un paciente para activar el calendario"}
            </p>
          </div>
          
          <div className="calendar-wrapper bg-white dark:bg-slate-800 rounded-xl p-4 shadow-inner border border-gray-200 dark:border-slate-600">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              selectable={calendarioHabilitado}
              events={eventosCalendario}
              select={calendarioHabilitado ? handleSelectDate : null}
              eventClick={handleEventClick}
              headerToolbar={{
                left: "prev,next",
                center: "title",
                right: "today",
              }}
              height="auto"
              locale="es"
              buttonText={{
                today: "Hoy",
                month: "Mes",
                week: "Semana",
              }}
              dayHeaderFormat={{ weekday: 'short' }}
              eventDisplay="block"
              eventBackgroundColor="#10b981"
              eventBorderColor="#10b981"
              eventTextColor="#ffffff"
              selectMirror={true}
              unselectAuto={false}
              dayMaxEvents={2}
              moreLinkText="+ más"
              aspectRatio={1.35}
              viewDidMount={() => {
                setTimeout(() => {
                  applyCalendarThemeColors();
                }, 100);
              }}
              datesSet={() => {
                setTimeout(() => {
                  applyCalendarThemeColors();
                }, 100);
              }}
            />
          </div>
          {/* Se puede quitar */}
          <style jsx>{`
            .calendar-wrapper :global(.fc) {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }
            
            /* Contenedor principal */
            .calendar-wrapper :global(.fc-theme-standard .fc-scrollgrid) {
              border: none;
              border-radius: 0.75rem;
              overflow: hidden;
              box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            }
            
            /* Encabezados de días */
            .calendar-wrapper :global(.fc-theme-standard th) {
              background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
              border: 1px solid #cbd5e1;
              color: #1e293b !important;
              font-weight: 700;
              font-size: 0.875rem;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              padding: 1rem 0.5rem;
              text-align: center;
            }
            
            .calendar-wrapper :global(.dark .fc-theme-standard th) {
              background: linear-gradient(135deg, #475569 0%, #334155 100%);
              border-color: #64748b;
              color: #f1f5f9 !important;
            }
            
            /* Personalizar texto de encabezados */
            .calendar-wrapper :global(.fc-col-header-cell-cushion) {
              text-indent: -9999px;
              overflow: hidden;
              position: relative;
            }
            
            .calendar-wrapper :global(.fc-col-header-cell-cushion::before) {
              text-indent: 0;
              position: absolute;
              left: 50%;
              top: 50%;
              transform: translate(-50%, -50%);
              font-size: 0.875rem;
              font-weight: 700;
              color: inherit;
            }
            
            .calendar-wrapper :global(.fc-col-header-cell:nth-child(1) .fc-col-header-cell-cushion::before) {
              content: "DO";
            }
            
            .calendar-wrapper :global(.fc-col-header-cell:nth-child(2) .fc-col-header-cell-cushion::before) {
              content: "LU";
            }
            
            .calendar-wrapper :global(.fc-col-header-cell:nth-child(3) .fc-col-header-cell-cushion::before) {
              content: "MA";
            }
            
            .calendar-wrapper :global(.fc-col-header-cell:nth-child(4) .fc-col-header-cell-cushion::before) {
              content: "MI";
            }
            
            .calendar-wrapper :global(.fc-col-header-cell:nth-child(5) .fc-col-header-cell-cushion::before) {
              content: "JU";
            }
            
            .calendar-wrapper :global(.fc-col-header-cell:nth-child(6) .fc-col-header-cell-cushion::before) {
              content: "VI";
            }
            
            .calendar-wrapper :global(.fc-col-header-cell:nth-child(7) .fc-col-header-cell-cushion::before) {
              content: "SA";
            }
            
            /* Celdas de días */
            .calendar-wrapper :global(.fc-theme-standard td) {
              border: 1px solid #f1f5f9;
              background-color: #ffffff;
              transition: all 0.2s ease;
            }
            
            .calendar-wrapper :global(.dark .fc-theme-standard td) {
              border-color: #334155;
              background-color: #0f172a;
            }
            
            /* Números de días */
            .calendar-wrapper :global(.fc-daygrid-day-number) {
              color: #000000 !important;
              font-weight: 500;
              font-size: 0.875rem;
              padding: 0.5rem;
              transition: all 0.2s ease;
            }
            
            :global(.dark) .calendar-wrapper :global(.fc-daygrid-day-number) {
              color: #94a3b8 !important;
            }
            
            /* Forzar colores de números con mayor especificidad */
            .calendar-wrapper :global(.fc-daygrid-day-top .fc-daygrid-day-number) {
              color: #000000 !important;
            }
            
            :global(.dark) .calendar-wrapper :global(.fc-daygrid-day-top .fc-daygrid-day-number) {
              color: #94a3b8 !important;
            }
            
            /* Día actual */
            .calendar-wrapper :global(.fc-day-today) {
              background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%) !important;
              position: relative;
            }
            
            .calendar-wrapper :global(.fc-day-today .fc-daygrid-day-number) {
              color: #059669 !important;
              font-weight: 700;
              background: #10b981;
              color: white !important;
              border-radius: 50%;
              width: 2rem;
              height: 2rem;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0.25rem;
            }
            
            .calendar-wrapper :global(.dark .fc-day-today) {
              background: linear-gradient(135deg, #064e3b 0%, #065f46 100%) !important;
            }
            
            /* Hover en días */
            .calendar-wrapper :global(.fc-daygrid-day:hover) {
              background-color: #f8fafc !important;
              transform: scale(1.02);
            }
            
            .calendar-wrapper :global(.dark .fc-daygrid-day:hover) {
              background-color: #1e293b !important;
            }
            
            /* Botones del toolbar */
            .calendar-wrapper :global(.fc-button) {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              border: none;
              color: white;
              font-weight: 600;
              padding: 0.5rem 1rem;
              border-radius: 0.5rem;
              font-size: 0.875rem;
              transition: all 0.3s ease;
              box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
            }
            
            .calendar-wrapper :global(.fc-button:hover) {
              background: linear-gradient(135deg, #059669 0%, #047857 100%);
              transform: translateY(-1px);
              box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
            }
            
            .calendar-wrapper :global(.fc-button:disabled) {
              background: #9ca3af;
              opacity: 0.5;
              transform: none;
              box-shadow: none;
            }
            
            .calendar-wrapper :global(.fc-button-active) {
              background: linear-gradient(135deg, #047857 0%, #065f46 100%) !important;
              box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            /* Título del mes */
            .calendar-wrapper :global(.fc-toolbar-title) {
              color: #1e293b !important;
              font-weight: 700;
              font-size: 1.5rem;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }
            
            :global(.dark) .calendar-wrapper :global(.fc-toolbar-title) {
              color: #f1f5f9 !important;
              text-shadow: 0 1px 2px rgba(255, 255, 255, 0.1);
            }
            
            /* Forzar color en modo dark con mayor especificidad */
            :global(.dark) .calendar-wrapper :global(.fc-toolbar h2.fc-toolbar-title) {
              color: #f1f5f9 !important;
            }
            
            /* Eventos */
            .calendar-wrapper :global(.fc-event) {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              border: none;
              border-radius: 0.375rem;
              font-size: 0.75rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
              margin: 1px;
            }
            
            .calendar-wrapper :global(.fc-event:hover) {
              background: linear-gradient(135deg, #059669 0%, #047857 100%);
              transform: translateY(-2px) scale(1.02);
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            }
            
            /* Selección de fecha - Modo Claro */
            .calendar-wrapper :global(.fc-highlight) {
              background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
              border: 3px solid #16a34a !important;
              border-radius: 0.5rem;
              box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.3);
            }
            
            /* Selección de fecha - Modo Dark */
            .calendar-wrapper :global(.dark .fc-highlight) {
              background: linear-gradient(135deg, #14532d 0%, #166534 100%) !important;
              border: 3px solid #22c55e !important;
              box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.4);
            }
            
            /* Días del mes anterior/siguiente */
            .calendar-wrapper :global(.fc-day-other .fc-daygrid-day-number) {
              color: #cbd5e1;
            }
            
            .calendar-wrapper :global(.dark .fc-day-other .fc-daygrid-day-number) {
              color: #475569;
            }
            
            /* Animaciones */
            .calendar-wrapper :global(.fc-daygrid-day) {
              transition: all 0.2s ease;
            }
            
            .calendar-wrapper :global(.fc-event-title) {
              font-weight: 600;
            }
          `}</style>
        </div>
      </div>
    </div>
  );
};

export default GestionTurno;
