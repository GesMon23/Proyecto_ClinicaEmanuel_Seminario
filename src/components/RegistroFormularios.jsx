import React, { useEffect, useState } from "react";
import CustomModal from '@/components/CustomModal.jsx';
import logoClinica from "@/assets/logoClinica2.png";
import { BOTON_LIMPIAR, BOTON_PRINCIPAL } from "@/constants/botones";
import { useAviso } from "@/hooks/useAviso";
import { cn } from "@/utils/cn";
import CampoGestion from "./pacientes/CampoGestion";
import {
  FORM_VACIO, MAX_PACIENTES, armarMasivo, cargarJornadas, guardarMasivo, prepararFila, problemaDelFormulario,
} from "./registroFormularios/formularios";

const TH = "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider";
const TD = "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200";
const BLOQUEO_DIGITOS = ["-", "+", "e", "E", ".", ","];

const RegistroFormularios = () => {
  const [formData, setFormData] = useState(FORM_VACIO);
  const [jornadas, setJornadas] = useState([]);
  const [pacientesCargados, setPacientesCargados] = useState([]);
  const [afiliacion, setAfiliacion] = useState("");
  const { modal, mostrar } = useAviso();

  useEffect(() => { cargarJornadas().then(setJornadas); }, []);

  const llena = pacientesCargados.length >= MAX_PACIENTES;
  const campo = (name) => ({ name, value: formData[name], onChange: (e) => setFormData((prev) => ({ ...prev, [name]: e.target.value })) });

  const handleLimpiar = () => setFormData(FORM_VACIO);

  const handleAgregarPaciente = async () => {
    if (llena) {
      mostrar("error", "Límite alcanzado", `Solo puede agregar un máximo de ${MAX_PACIENTES} pacientes por formulario.`);
      return;
    }
    if (!afiliacion) return;
    try {
      const { fila, titulo, mensaje, limpiar } = await prepararFila(afiliacion, pacientesCargados, jornadas);
      if (fila) {
        setPacientesCargados([...pacientesCargados, fila]);
        setAfiliacion("");
      } else {
        mostrar("error", titulo, mensaje);
        if (limpiar) setAfiliacion("");
      }
    } catch {
      mostrar("error", "Error", "No se pudo buscar el paciente.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problema = problemaDelFormulario(formData, pacientesCargados);
    if (problema) {
      mostrar("error", "Error", problema);
      return;
    }
    try {
      const data = await guardarMasivo(armarMasivo(formData, pacientesCargados));
      if (data && data.success) {
        mostrar("success", "Éxito", "Formulario guardado exitosamente.");
        handleLimpiar();
        setPacientesCargados([]);
      } else {
        mostrar("error", "Error", data?.detalle || data?.error || "Error al guardar el formulario.");
      }
    } catch (err) {
      mostrar("error", "Error", err.response?.data?.detalle || err.response?.data?.error || err.message || "Error inesperado.");
    }
  };

  return (
    <>
      <CustomModal {...modal} />

      <div className="w-full px-4 md:px-8 py-6">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md">
          <div className="p-6">
            <div className="w-full text-center mb-6">
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <img
                  src={logoClinica}
                  alt="Logo Clínica"
                  className="h-[180px] max-w-[320px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                />
                <span className="text-3xl font-bold text-green-800 dark:text-white mb-4">Registro de Formularios</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-b-xl">
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="mb-6">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  placeholder="Número de Afiliación"
                  type="text"
                  value={afiliacion}
                  onChange={(e) => setAfiliacion(e.target.value)}
                  className="text-lg px-4 py-2 w-56 rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAgregarPaciente}
                  disabled={llena}
                  className={BOTON_PRINCIPAL}
                >
                  {llena ? `Máximo ${MAX_PACIENTES}` : "Agregar Paciente"}
                </button>
                <button
                  type="button"
                  onClick={() => setPacientesCargados([])}
                  className="bg-red-600 hover:bg-red-700 text-white text-base font-semibold py-2 px-5 rounded"
                >
                  Limpiar Tabla
                </button>
              </div>

              <div className="w-full mt-4 bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-lg">
                <div className="overflow-x-auto">
                  <table className="min-w-[720px] w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-slate-700">
                      <tr>
                        {["No. Afiliación", "DPI", "Nombre", "Sexo", "Jornada", "Eliminar"].map((t) => <th key={t} scope="col" className={TH}>{t}</th>)}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {pacientesCargados.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No hay pacientes cargados</td>
                        </tr>
                      ) : (
                        pacientesCargados.map((p, idx) => (
                          <tr key={`${p.noafiliacion}-${p.dpi}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                            <td className={`${TD} !text-gray-500 dark:!text-gray-400`}>{p.noafiliacion}</td>
                            <td className={`${TD} !text-gray-500 dark:!text-gray-400`}>{p.dpi}</td>
                            <td className={TD}>{p.nombre}</td>
                            <td className={TD}>{p.sexo}</td>
                            <td className={TD}>{p.jornada}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                type="button"
                                onClick={() => setPacientesCargados(pacientesCargados.filter((_, i) => i !== idx))}
                                className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-1 px-3 rounded"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CampoGestion etiqueta="Número de Formulario" requerido placeholder="Ingrese el número de formulario" {...campo("numeroformulario")} />
                <CampoGestion
                  etiqueta="Sesiones autorizadas por mes" requerido tipo="number" min="1" step="1" inputMode="numeric"
                  placeholder="Ingrese cantidad de sesiones" {...campo("sesionesautorizadasmes")}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sesionesautorizadasmes: (e.target.value ?? "").replace(/\D+/g, "") }))}
                  onKeyDown={(e) => { if (BLOQUEO_DIGITOS.includes(e.key)) e.preventDefault(); }}
                  onPaste={(e) => { if (/[^0-9]/.test((e.clipboardData.getData("text") || "").trim())) e.preventDefault(); }}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Período de prestación de servicios <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <CampoGestion etiqueta="" tipo="date" requerido envoltura="flex-1" {...campo("periodoDel")} />
                  <span className="self-center font-semibold dark:text-white">al</span>
                  <CampoGestion
                    etiqueta="" tipo="date" requerido envoltura="flex-1" min={formData.periodoDel || undefined}
                    disabled={!formData.periodoDel} {...campo("periodoHasta")}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button type="submit" className={cn(BOTON_PRINCIPAL, 'mr-4')}>
                Guardar Formulario
              </button>
              <button type="button" onClick={handleLimpiar} className={BOTON_LIMPIAR}>
                Limpiar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default RegistroFormularios;
