import React, { useEffect, useMemo, useState } from "react";
import api from "../config/api";
import logoClinica from "@/assets/logoClinica2.png";
import CustomModal from '@/components/CustomModal';
import { BOTON_PRINCIPAL } from '@/constants/botones';
import { cn } from '@/utils/cn';
import { IconoCargando } from '@/components/Cargando';
import CalendarioTurnos from "./gestionTurno/CalendarioTurnos";
import TablaTurnos from "./gestionTurno/TablaTurnos";
import { useTemaCalendario } from "./gestionTurno/temaCalendario";
import {
  detalleDeEvento, formatDateToYMDLocal, motivoSinTurnos, nombreDePaciente, parseYMDToLocalDate, turnosAEventos,
} from "./gestionTurno/turnos";

const TITULOS_MODAL = { success: "Éxito", confirm: "Confirmar", error: "Error" };

// Creación, edición y cancelación de turnos de un paciente, con calendario.
const GestionTurno = () => {
  const [numeroAfiliacion, setNumeroAfiliacion] = useState("");
  const [opcionSeleccionada, setOpcionSeleccionada] = useState("");
  const [nombrePaciente, setNombrePaciente] = useState("");
  const [clinicas, setClinicas] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
  const [turnoEditando, setTurnoEditando] = useState(null);
  const [calendarioHabilitado, setCalendarioHabilitado] = useState(false);
  const [modal, setModal] = useState({ show: false, message: "", type: "info", onConfirm: null, limpiarAlCerrar: false });
  const [buscando, setBuscando] = useState(false);
  const [resaltarNombre, setResaltarNombre] = useState(false);
  const [reinicio, setReinicio] = useState(0); // cambia al limpiar: reinicia el buscador de la tabla

  useTemaCalendario();

  const abrirModal = (type, message, extra = {}) => setModal({ show: true, type, message, onConfirm: null, limpiarAlCerrar: false, ...extra });
  const showSuccessModal = (message) => abrirModal("success", message);
  const showErrorModal = (message) => abrirModal("error", message, {});

  const handleCloseModal = () => {
    setModal((m) => ({ ...m, show: false }));
    if (modal.limpiarAlCerrar) handleCancelar();
  };

  // Solo las clínicas asignadas al usuario para crear turnos (todas si nadie lo restringió)
  useEffect(() => {
    api.get("/turnos/clinicas/crear")
      .then((r) => setClinicas(r.data))
      .catch((error) => {
        console.error("Error al cargar clínicas:", error);
        setModal({ show: true, type: "error", message: "Error al cargar clínicas", onConfirm: null, limpiarAlCerrar: false });
      });
  }, []);

  const cargarTurnos = async (afiliacion) => {
    try {
      const { data } = await api.get(`/GmuestraTurnosT?noafiliacion=${afiliacion}`);
      setTurnos(data || []);
    } catch (error) {
      // Aunque falle la carga se sigue con el paciente encontrado
      console.log("Error al cargar turnos:", error);
      setTurnos([]);
    }
  };

  const handleBuscar = async () => {
    setBuscando(true);
    try {
      const { data: paciente } = await api.get(`/GpacientesT/${numeroAfiliacion}`);
      if (!paciente) {
        showErrorModal("El paciente no existe");
        setCalendarioHabilitado(false);
        return;
      }

      // Bloquear egresados y fallecidos
      const motivo = motivoSinTurnos(paciente);
      if (motivo) {
        abrirModal("error", motivo, { limpiarAlCerrar: true });
        setNombrePaciente("");
        setCalendarioHabilitado(false);
        return;
      }

      setNombrePaciente(nombreDePaciente(paciente));
      setCalendarioHabilitado(true);
      // Resaltar el nombre brevemente
      setResaltarNombre(true);
      setTimeout(() => setResaltarNombre(false), 1600);
      await cargarTurnos(numeroAfiliacion);
    } catch (error) {
      console.log("Error al buscar paciente:", error);
      showErrorModal("Error al buscar paciente");
      setCalendarioHabilitado(false);
    } finally {
      setBuscando(false);
    }
  };

  const handleCancelar = () => {
    setNumeroAfiliacion("");
    setOpcionSeleccionada("");
    setNombrePaciente("");
    setTurnos([]);
    setFechaSeleccionada(null);
    setTurnoEditando(null);
    setCalendarioHabilitado(false);
    setReinicio((n) => n + 1);
  };

  const handleEditar = (idTurno) => {
    const turno = turnos.find((t) => t.id_turno === idTurno);
    if (!turno) return;
    setTurnoEditando(turno);
    setOpcionSeleccionada(turno.nombre_clinica);
    setFechaSeleccionada(parseYMDToLocalDate(turno.fecha_turno));
  };

  // "Eliminar" solo cancela el turno (pasa a estado Cancelado)
  const handleEliminar = (idTurno) => {
    abrirModal("confirm", "¿Está seguro que desea cancelar este turno?", { onConfirm: () => confirmarEliminarTurno(idTurno) });
  };

  const confirmarEliminarTurno = async (idTurno) => {
    try {
      const response = await api.put(`/Gcancelar-turnoT/${idTurno}`);
      if (response.data.success) {
        showSuccessModal("Turno cancelado correctamente");
        setTurnos((actuales) => actuales.filter((t) => t.id_turno !== idTurno));
      } else {
        showErrorModal("No se pudo cancelar el turno.");
      }
    } catch (error) {
      showErrorModal(error.response?.data?.message || "Error al cancelar el turno.");
    }
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
        // YMD local para evitar desfase en el backend
        fechaTurno: formatDateToYMDLocal(fechaSeleccionada),
      });
      if (response.data.success) {
        showSuccessModal("Turno creado exitosamente");
        await handleBuscar();
        setOpcionSeleccionada("");
        setFechaSeleccionada(null);
      }
    } catch (error) {
      console.log("Error al crear turno:", error);
      const detalle = error.response?.data?.message || error.response?.data?.detail || error.message || "Error al crear el turno";
      showErrorModal(`Error al crear el turno: ${detalle}`);
    }
  };

  const handleGuardar = async () => {
    if (!turnoEditando || !fechaSeleccionada || !opcionSeleccionada) {
      showErrorModal("Debe seleccionar una fecha y una clínica");
      return;
    }
    try {
      const response = await api.put(`/Gactualizar-turnoT/${turnoEditando.id_turno}`, {
        fechaTurno: formatDateToYMDLocal(fechaSeleccionada),
        clinica: opcionSeleccionada,
      });
      if (response.data.success) {
        showSuccessModal("Turno actualizado exitosamente");
        await handleBuscar();
        setTurnoEditando(null);
        setOpcionSeleccionada("");
        setFechaSeleccionada(null);
      }
    } catch (error) {
      showErrorModal(error.response?.data?.message || "Error al actualizar el turno");
    }
  };

  const modoEdicion = Boolean(turnoEditando);
  const eventos = useMemo(() => turnosAEventos(turnos), [turnos]);
  // Se ven todos los turnos del paciente, pero solo se editan o cancelan los de clínicas asignadas
  const puedeModificar = (turno) => clinicas.some((c) => c.descripcion === turno.nombre_clinica);

  return (
    <div className="p-6 space-y-6">
      <CustomModal
        show={modal.show}
        onClose={handleCloseModal}
        title={TITULOS_MODAL[modal.type] || "Error"}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        confirmText="Sí, cancelar"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Izquierda: formulario + tabla */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
          <div className="text-center mb-4">
            <img src={logoClinica} alt="Logo clínica" className="mx-auto h-20" />
            <h1 className="text-2xl sm:text-3xl font-bold text-green-800 dark:text-white">Creación de Turnos</h1>
            <hr className="border-slate-300 dark:border-slate-700 my-4" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              placeholder="Número de Afiliación"
              value={numeroAfiliacion}
              onChange={(e) => setNumeroAfiliacion(e.target.value)}
              className="w-full sm:flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
            <button
              onClick={handleBuscar}
              disabled={buscando || !numeroAfiliacion}
              className={cn(BOTON_PRINCIPAL, 'w-full sm:w-auto')}
            >
              {buscando ? (
                <span className="inline-flex items-center gap-2">
                  <IconoCargando />
                  Buscando...
                </span>
              ) : 'Buscar'}
            </button>
          </div>

          <div
            className={`transition-colors duration-500 rounded-lg px-3 py-2 mb-2 inline-flex items-center gap-3 ${resaltarNombre && nombrePaciente ? 'bg-green-50 ring-2 ring-green-500 dark:bg-green-900/20' : ''}`}
            aria-live="polite"
          >
            <h3 className="text-xl font-semibold text-green-800 dark:text-green-700">{nombrePaciente || "Nombre del paciente"}</h3>
            {nombrePaciente && resaltarNombre && (
              <span className="inline-flex items-center text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full">
                Paciente encontrado
              </span>
            )}
          </div>
          <hr className="border-slate-300 dark:border-slate-700 mb-4" />

          {modoEdicion && (
            <div
              className="mb-4 flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-900 dark:border-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-200"
              role="status"
              aria-live="polite"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 mt-0.5 flex-shrink-0" aria-hidden="true">
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

          <TablaTurnos key={reinicio} turnos={turnos} onEditar={handleEditar} onCancelar={handleEliminar} puedeModificar={puedeModificar} />

          <div className="mt-4">
            <select
              value={opcionSeleccionada}
              onChange={(e) => setOpcionSeleccionada(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              disabled={!calendarioHabilitado}
            >
              <option value="">Seleccione una clínica</option>
              {clinicas.map((clinica) => (
                <option key={clinica.id_clinica} value={clinica.descripcion}>{clinica.descripcion}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between mt-4">
            <button className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800" onClick={handleCancelar}>
              Cancelar
            </button>
            <button
              className={cn(BOTON_PRINCIPAL, 'w-full sm:w-auto')}
              onClick={modoEdicion ? handleGuardar : handleAceptar}
            >
              {modoEdicion ? "Guardar" : "Aceptar"}
            </button>
          </div>
        </div>

        {/* Derecha: calendario */}
        <CalendarioTurnos
          habilitado={calendarioHabilitado}
          eventos={eventos}
          onSeleccionar={setFechaSeleccionada}
          onEvento={(evento) => showSuccessModal(detalleDeEvento(evento))}
        />
      </div>
    </div>
  );
};

export default GestionTurno;
