import React, { useState } from "react";
import { Alert } from "react-bootstrap";
import api from "../config/api";
import CustomModal from "@/components/CustomModal.jsx";
import { useAviso } from "@/hooks/useAviso";
import BuscadorPacientes from "./pacientes/BuscadorPacientes";
import CampoGestion from "./pacientes/CampoGestion";
import TarjetaPaciente from "./pacientes/TarjetaPaciente";
import {
  FORM_VACIO, armarReingreso, buscarCandidatos, claveDe, clasificar, formularioValido,
} from "./reingresoPacientes/reingreso";

const BUSQUEDA_VACIA = { dpi: "", noafiliacion: "" };
const SOLO_ENTEROS = ["e", "E", "+", "-", ".", ",", " "];

const ReingresoPacientes = (props) => {
  const [busqueda, setBusqueda] = useState(BUSQUEDA_VACIA);
  const [resultados, setResultados] = useState([]);
  const [formsById, setFormsById] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { modal, mostrar, cerrar } = useAviso();

  const handleLimpiarTodo = () => {
    setBusqueda(BUSQUEDA_VACIA);
    setResultados([]);
    setFormsById({});
    setError("");
    setLoading(false);
    cerrar();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResultados([]);
    setLoading(true);
    try {
      const noaf = (busqueda.noafiliacion || "").trim();
      const dpi = (busqueda.dpi || "").trim();
      if (!noaf && !dpi) {
        setError("Debe ingresar el número de afiliación o el DPI.");
        return;
      }
      const params = {};
      if (noaf) params.noafiliacion = noaf;
      if (dpi) params.dpi = dpi;

      const encontrados = await buscarCandidatos(params);
      const { fallecidos, elegibles } = clasificar(encontrados);
      setResultados(elegibles);
      setFormsById({});

      if (fallecidos.length > 0) mostrar("error", "Paciente fallecido", "El/los paciente(s) están fallecidos.");
      else if (encontrados.length > 0 && elegibles.length === 0) mostrar("error", "No elegible", "El paciente no es elegible para reingreso.");
      if (encontrados.length === 0) mostrar("error", "Paciente no encontrado", "Paciente no encontrado.");
    } catch {
      setError("Error al buscar paciente.");
    } finally {
      setLoading(false);
    }
  };

  const cambiarCampo = (key, name, value) =>
    setFormsById((prev) => ({ ...prev, [key]: { ...(prev[key] || FORM_VACIO), [name]: value } }));

  const guardar = (paciente, key) => async (e) => {
    e.preventDefault();
    setError("");
    const f = formsById[key] || FORM_VACIO;
    if (!formularioValido(f)) {
      mostrar(
        "error", "Campos incompletos",
        "Complete los campos requeridos: Número de formulario, Fecha de reingreso, Período de prestación (inicio y fin) y Sesiones autorizadas por mes (entero >= 1)."
      );
      return;
    }
    try {
      const { data } = await api.post("/pacientes/reingreso", armarReingreso(paciente, f));
      if (data?.success) {
        mostrar("success", "Éxito", "Reingreso guardado exitosamente.");
        setResultados((prev) => prev.filter((r) => claveDe(r) !== key));
        setFormsById((prev) => ({ ...prev, [key]: { ...FORM_VACIO } }));
      } else {
        mostrar("error", "Error", data?.error || data?.detail || "Error al guardar el reingreso.");
      }
    } catch (err) {
      mostrar("error", "Error", err?.response?.data?.error || err?.response?.data?.detail || err.message || "Error inesperado.");
    }
  };

  return (
    <>
      <CustomModal {...modal} />

      <BuscadorPacientes
        titulo={props.customTitle || "Reingreso Pacientes"}
        busqueda={busqueda}
        onCambiar={setBusqueda}
        onBuscar={handleSubmit}
        onLimpiar={handleLimpiarTodo}
        loading={loading}
      />

      <div className="w-full px-4 md:px-8">
        {resultados.map((p) => {
          const key = claveDe(p);
          const f = formsById[key] || FORM_VACIO;
          const campo = (name) => ({ name, value: f[name] || "", onChange: (e) => cambiarCampo(key, name, e.target.value) });
          return (
            <React.Fragment key={key}>
              <TarjetaPaciente paciente={p.ficha} />

              <div className="w-full mb-10">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Datos para Reingreso</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Complete la información requerida para registrar el reingreso.</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      {p.noafiliacion}
                    </span>
                  </div>

                  <form onSubmit={guardar(p, key)}>
                    <div className="grid gap-6 px-5 py-6 md:grid-cols-1 lg:grid-cols-[minmax(320px,520px)_minmax(0,1fr)]">
                      <div className="space-y-5 min-w-0">
                        <CampoGestion
                          etiqueta="Número de Formulario" requerido placeholder="Ingrese el número de formulario" inputMode="numeric"
                          ayuda="Acepta números y guiones." {...campo("numeroformulario")}
                        />
                        <CampoGestion etiqueta="Fecha de Reingreso" requerido tipo="date" {...campo("fechaReingreso")} />

                        <div className="space-y-2">
                          <label className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                            Período Prestación de Servicios <span className="text-rose-500">*</span>
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2">
                            <CampoGestion etiqueta="" tipo="date" requerido placeholder="Inicio" envoltura="min-w-0" {...campo("inicioPrestServicios")} />
                            <span className="text-sm text-slate-500">a</span>
                            <CampoGestion etiqueta="" tipo="date" requerido placeholder="Fin" min={f.inicioPrestServicios || undefined} {...campo("finPrestServicios")} />
                          </div>
                          <small className="block text-xs text-slate-500 dark:text-slate-400">
                            Si ingresa una fecha, complete ambas y asegúrese que el inicio sea menor o igual al fin.
                          </small>
                        </div>

                        <CampoGestion
                          etiqueta="Sesiones autorizadas por mes" requerido tipo="number" min="1" step="1" inputMode="numeric"
                          placeholder="Ingrese cantidad de sesiones" {...campo("sesionesAutorizadasMes")}
                          onChange={(e) => cambiarCampo(key, "sesionesAutorizadasMes", (e.target.value || "").replace(/[^0-9]/g, ""))}
                          onKeyDown={(e) => { if (SOLO_ENTEROS.includes(e.key)) e.preventDefault(); }}
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <CampoGestion
                          etiqueta="Observaciones" tipo="textarea" rows={8} maxLength={500} placeholder="Ingrese observaciones"
                          contador={`${(f.observaciones || "").length}/500`} className="min-h-[220px]" {...campo("observaciones")}
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-slate-700 pt-6 px-5 pb-5">
                      <div className="flex flex-col sm:flex-row gap-4 justify-end">
                        <button
                          type="submit"
                          disabled={!formularioValido(f)}
                          className="w-full sm:w-56 px-8 py-3 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white text-lg font-semibold rounded-lg shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-600"
                        >
                          Guardar Reingreso
                        </button>
                        <button
                          type="button"
                          onClick={handleLimpiarTodo}
                          className="w-full sm:w-40 px-8 py-3 bg-red-600 hover:bg-red-700 text-white text-lg font-semibold rounded-lg shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-600"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {error && <Alert variant="danger">{error}</Alert>}
      </div>
    </>
  );
};

export default ReingresoPacientes;
