import React, { useState } from "react";
import logoClinica from "@/assets/logoClinica2.png";
import defaultAvatar from "@/assets/img/default-avatar.png";
import { Form, Button, Alert } from "react-bootstrap";
import api from "../config/api";
import CustomModal from "@/components/CustomModal.jsx";

// Calcula edad desde fecha (YYYY-MM-DD o ISO)
function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return "";
  const d = new Date(fechaNacimiento);
  if (isNaN(d.getTime())) return "";
  const hoy = new Date();
  let edad = hoy.getFullYear() - d.getFullYear();
  const m = hoy.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < d.getDate())) edad--;
  return edad;
}

// ⚠️ Solo lo necesario para reingreso
const initForm = {
  numeroformulario: "",
  fechaReingreso: "", // YYYY-MM-DD
  observaciones: "",
  inicioPrestServicios: "", // YYYY-MM-DD
  finPrestServicios: "",    // YYYY-MM-DD
  sesionesAutorizadasMes: "", // numeric string
};

// Normaliza claves
const normalizePaciente = (r) => ({
  idpaciente: r.idpaciente ?? r.id_paciente ?? null,
  noafiliacion: r.noafiliacion ?? r.no_afiliacion ?? "",
  dpi: r.dpi ?? "",
  nopacienteproveedor: r.nopacienteproveedor ?? r.no_paciente_proveedor ?? "",
  primernombre: r.primernombre ?? r.primer_nombre ?? "",
  segundonombre: r.segundonombre ?? r.segundo_nombre ?? "",
  otrosnombres: r.otrosnombres ?? r.otros_nombres ?? "",
  primerapellido: r.primerapellido ?? r.primer_apellido ?? "",
  segundoapellido: r.segundoapellido ?? r.segundo_apellido ?? "",
  apellidacasada: r.apellidacasada ?? r.apellido_casada ?? "",
  fechanacimiento: r.fechanacimiento ?? r.fecha_nacimiento ?? null,
  sexo: r.sexo ?? "",
  direccion: r.direccion ?? "",
  fechaegreso: r.fechaegreso ?? r.fecha_egreso ?? null,
  idestado: r.idestado ?? r.id_estado ?? null,
  idcausa: r.idcausa ?? r.id_causa ?? null,
  causaegreso_descripcion:
    r.causaegreso_descripcion ??
    r.causa_egreso_descripcion ??
    r.causa_descripcion ??
    r.descripcion ??
    r.descripcionEgreso ??
    "",
  departamento_nombre: r.departamento_nombre ?? r.departamento ?? "",
  estado_descripcion: r.estado_descripcion ?? r.estado ?? "",
  jornada_descripcion: r.jornada_descripcion ?? r.jornada ?? "",
  acceso_descripcion: r.acceso_descripcion ?? r.acceso ?? "",
  urlfoto: r.urlfoto ?? r.url_foto ?? null,
});

const ReingresoPacientes = (props) => {
  const [busqueda, setBusqueda] = useState({ dpi: "", noafiliacion: "" });
  const [resultados, setResultados] = useState([]);
  const [formsById, setFormsById] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [modalType, setModalType] = useState("info");

  const baseURL = (api?.defaults?.baseURL || "").replace(/\/$/, "");

  const handleChange = (e) => {
    setBusqueda({ ...busqueda, [e.target.name]: e.target.value });
  };
  // Eliminado selector de filtro; búsqueda simultánea por afiliación o DPI

  const handleLimpiarTodo = () => {
    setBusqueda({ dpi: "", noafiliacion: "" });
    setResultados([]);
    setFormsById({});
    setError("");
    setShowModal(false);
    setModalMessage("");
    setModalTitle("");
    setModalType("info");
    setLoading(false);
  };

  const getKey = (p) =>
    p.idpaciente ?? p.noafiliacion ?? p.dpi ?? `${p.primernombre}-${p.dpi || ""}`;

  const verificarExistenciaFoto = async (idOrFilename) => {
    try {
      const response = await api.get(`/check-photo/${idOrFilename}`);
      if (response.data?.exists && response.data?.filename) {
        return response.data.filename; // devolver nombre real
      }
      return null;
    } catch {
      return null;
    }
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

      const { data } = await api.get("/api/reingreso/pacientes/reingreso", {
        params,
      });

      const enriquecidos = await Promise.all(
        (Array.isArray(data) ? data : []).map(async (raw) => {
          let p = normalizePaciente(raw);
          // Enriquecer info si faltan campos
          const needsDetails = !p.departamento_nombre || !p.estado_descripcion || !p.jornada_descripcion || !p.acceso_descripcion || !p.direccion;
          if (needsDetails && p.noafiliacion) {
            try {
              const egresoResp = await api.get('/api/pacientes/egreso', { params: { noafiliacion: p.noafiliacion } });
              const eg = Array.isArray(egresoResp.data) && egresoResp.data.length > 0 ? egresoResp.data[0] : null;
              if (eg) {
                p = {
                  ...p,
                  direccion: p.direccion || eg.direccion || '',
                  departamento_nombre: p.departamento_nombre || eg.departamento_nombre || '',
                  estado_descripcion: p.estado_descripcion || eg.estado_descripcion || '',
                  jornada_descripcion: p.jornada_descripcion || eg.jornada_descripcion || '',
                  acceso_descripcion: p.acceso_descripcion || eg.acceso_descripcion || '',
                };
              }
            } catch (e) {
              // continuar con datos existentes
            }
          }

          // Resolver foto: primero BD (urlfoto), si no hay intentar /check-photo
          let fotoFilename = null;
          if (!p.urlfoto && p.noafiliacion) {
            try {
              const fn = await verificarExistenciaFoto(p.noafiliacion);
              if (fn) fotoFilename = fn;
            } catch (_) {}
          }

          return {
            ...p,
            fotoFilename,
            _cacheBuster: Date.now(),
          };
        })
      );

      const fallecidos = enriquecidos.filter(
        (p) =>
          Number(p.idcausa) === 1 ||
          (p.causaegreso_descripcion || "").toLowerCase().includes("fallec")
      );
      const elegibles = enriquecidos.filter(
        (p) => Number(p.idestado) === 3 && !fallecidos.includes(p)
      );

      setResultados(elegibles);
      setFormsById({});

      if (fallecidos.length > 0) {
        setModalMessage("El/los paciente(s) están fallecidos.");
        setModalTitle("Paciente fallecido");
        setModalType("error");
        setShowModal(true);
      } else if (enriquecidos.length > 0 && elegibles.length === 0) {
        setModalMessage("El paciente no es elegible para reingreso.");
        setModalTitle("No elegible");
        setModalType("error");
        setShowModal(true);
      }
      if (enriquecidos.length === 0) {
        setModalMessage("Paciente no encontrado.");
        setModalTitle("Paciente no encontrado");
        setModalType("error");
        setShowModal(true);
      }
    } catch {
      setError("Error al buscar paciente.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (key, name, value) => {
    setFormsById((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || initForm), [name]: value },
    }));
  };

  const isFormValid = (f) => {
    if (!f?.numeroformulario || !f?.fechaReingreso) return false;
    const d = new Date(f.fechaReingreso);
    if (isNaN(d.getTime())) return false;
    // Validaciones opcionales de periodo: si se llena uno, deben llenarse ambos y el inicio <= fin
    const i = f.inicioPrestServicios ? new Date(f.inicioPrestServicios) : null;
    const fn = f.finPrestServicios ? new Date(f.finPrestServicios) : null;
    if ((i && !fn) || (!i && fn)) return false;
    if (i && fn && i.getTime() > fn.getTime()) return false;
    // sesiones debe ser entero >= 0 si viene
    if (f.sesionesAutorizadasMes !== "" && (isNaN(Number(f.sesionesAutorizadasMes)) || Number(f.sesionesAutorizadasMes) < 0)) return false;
    return true;
  };

  const handleReingresoSubmit = (paciente, key) => async (e) => {
    e.preventDefault();
    setError("");
    const f = formsById[key] || initForm;
    if (!isFormValid(f)) {
      setModalMessage(
        "Ingrese el número de formulario y una fecha de reingreso válida."
      );
      setModalTitle("Campos incompletos");
      setModalType("error");
      setShowModal(true);
      return;
    }

    try {
      const payload = {
        noAfiliacion: paciente.noafiliacion,
        numeroFormulario: f.numeroformulario,
        fechaReingreso: f.fechaReingreso,
        observaciones: f.observaciones || "",
        inicioPrestServicios: f.inicioPrestServicios || null,
        finPrestServicios: f.finPrestServicios || null,
        sesionesAutorizadasMes: f.sesionesAutorizadasMes === "" ? null : Number(f.sesionesAutorizadasMes),
        usuario: "web",
      };

      const resp = await api.post(`/api/reingreso/pacientes/reingreso`, payload);

      if (resp.data?.success) {
        setModalMessage("Reingreso guardado exitosamente.");
        setModalTitle("Éxito");
        setModalType("success");
        setShowModal(true);
        setResultados((prev) => prev.filter((r) => getKey(r) !== key));
        setFormsById((prev) => ({ ...prev, [key]: { ...initForm } }));
      } else {
        setModalMessage(
          resp.data?.error || resp.data?.detail || "Error al guardar el reingreso."
        );
        setModalTitle("Error");
        setModalType("error");
        setShowModal(true);
      }
    } catch (err) {
      setModalMessage(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err.message ||
          "Error inesperado."
      );
      setModalTitle("Error");
      setModalType("error");
      setShowModal(true);
    }
  };

  // utilitarios dark-friendly
  const controlClasses =
    "!bg-white !text-slate-900 !border-slate-300 " +
    "focus:!ring-2 focus:!ring-emerald-600 focus:!border-emerald-600 " +
    "placeholder:!text-slate-400 " +
    "dark:!bg-slate-800 dark:!text-slate-100 dark:!border-slate-600 " +
    "dark:placeholder:!text-slate-400";

  const labelClasses = "!text-slate-700 dark:!text-slate-200 !font-semibold";

  return (
    <React.Fragment>
      <CustomModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
      />

      {/* Buscador (SIN CAMBIOS) */}
      <div className="w-full px-4 md:px-8 py-6">
        <div className="w-full">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md">
            <div className="p-6">
              <form onSubmit={handleSubmit} className="mb-6">
                <div className="w-full text-center mb-6">
                  <div className="flex items-center justify-center gap-6 flex-wrap">
                    <img
                      src={logoClinica}
                      alt="Logo Clínica"
                      className="h-[180px] max-w-[320px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                    />
                    <span className="text-3xl font-bold text-green-800 dark:text-white mb-4">
                      {props.customTitle || "Reingreso Pacientes"}
                    </span>
                  </div>
                  <hr className="border-t border-slate-500 dark:border-white my-4" />
                </div>

                {/* Selector de filtro */}
                {/* Sin selector: ambos campos disponibles */}

                {/* Input según filtro */}
                <div className="flex justify-center">
                  <div className="w-full max-w-md mb-4">
                    <input
                      placeholder="Número de Afiliación"
                      type="text"
                      name="noafiliacion"
                      value={busqueda.noafiliacion}
                      onChange={handleChange}
                      disabled={Boolean(busqueda.dpi)}
                      className="w-full text-lg px-4 py-2 mb-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:bg-slate-800 dark:text-white disabled:opacity-60"
                    />
                    <input
                      placeholder="DPI"
                      type="text"
                      name="dpi"
                      value={busqueda.dpi}
                      onChange={(e) => {
                        const onlyDigits = (e.target.value || '').replace(/\D+/g, '').slice(0, 13);
                        setBusqueda({ ...busqueda, dpi: onlyDigits });
                      }}
                      disabled={Boolean(busqueda.noafiliacion)}
                      className="w-full text-lg px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:bg-slate-800 dark:text-white disabled:opacity-60"
                      inputMode="numeric"
                      maxLength={13}
                      pattern="\\d{13}"
                      onKeyDown={(e) => {
                        if (["e","E","+","-",".",","," "].includes(e.key)) e.preventDefault();
                      }}
                      onPaste={(e) => {
                        const t = (e.clipboardData.getData('text') || '').trim();
                        if (/[^0-9]/.test(t)) e.preventDefault();
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-36 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-base font-semibold rounded-md shadow transition duration-200 disabled:opacity-70"
                  >
                    {loading ? "Buscando..." : "Buscar"}
                  </button>
                  <button
                    type="button"
                    onClick={handleLimpiarTodo}
                    className="w-36 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-base font-semibold rounded-md shadow transition duration-200"
                    aria-label="Limpiar búsqueda y resultados"
                  >
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {resultados.length > 0 &&
        resultados.map((p) => {
          const key = getKey(p);
          const f = formsById[key] || initForm;
          let fotoSrc = defaultAvatar;
          if (p.urlfoto) {
            fotoSrc = `${baseURL}/fotos/${p.urlfoto}`;
          } else if (p.fotoFilename) {
            fotoSrc = `${baseURL}/fotos/${p.fotoFilename}`;
          }
          if (fotoSrc !== defaultAvatar) {
            fotoSrc = `${fotoSrc}?v=${p._cacheBuster}`;
          }

          const nombre = `${p.primernombre || ""} ${p.segundonombre || ""} ${
            p.otrosnombres || ""
          } ${p.primerapellido || ""} ${p.segundoapellido || ""} ${p.apellidacasada || ""}`
            .replace(/ +/g, " ")
            .trim();

          return (
            <React.Fragment key={key}>
              {/* Tarjeta del paciente (responsive mejorado) */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden mb-6 transition-all duration-200 hover:shadow-xl">
                {/* Foto arriba en móviles; lado a lado solo desde lg */}
                <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
                  {/* Foto */}
                  <div className="flex items-center justify-center p-6 bg-white dark:bg-slate-900">
                    <div className="w-48 h-48 lg:w-56 lg:h-56 rounded-xl overflow-hidden border-4 border-green-700 dark:border-green-600 shadow-lg bg-gray-100 dark:bg-slate-800">
                      <img
                        src={fotoSrc}
                        alt="Foto del paciente"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = defaultAvatar;
                        }}
                      />
                    </div>
                  </div>

                  {/* Datos */}
                  <div className="p-6">
                    <div className="text-center lg:text-left mb-6">
                      <h2 className="text-2xl lg:text-3xl font-bold text-green-700 dark:text-white uppercase tracking-wide break-words leading-tight">
                        {nombre || "—"}
                      </h2>
                      <div className="w-24 h-1 bg-green-600 dark:bg-white mx-auto lg:mx-0 mt-2 rounded-full"></div>
                    </div>

                    {/* Información básica en cards con estilo de Egreso */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 px-2 sm:px-0">
                      <div className="bg-green-50 dark:bg-slate-800 rounded-lg p-4 sm:p-6 border-l-4 border-green-600 min-w-0 min-h-[155px] flex flex-col justify-center">
                        <div className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-400 mb-2">
                          No. Afiliación
                        </div>
                        <div className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white break-all">
                          {p.noafiliacion || "—"}
                        </div>
                      </div>

                      <div className="bg-green-50 dark:bg-slate-800 rounded-lg p-4 sm:p-6 border-l-4 border-green-600 min-w-0 min-h-[155px] flex flex-col justify-center">
                        <div className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-400 mb-2">
                          DPI
                        </div>
                        <div className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white break-all">
                          {p.dpi || "—"}
                        </div>
                      </div>

                      <div className="bg-green-50 dark:bg-slate-800 rounded-lg p-4 sm:p-6 border-l-4 border-green-600 min-w-0 min-h-[100px] flex flex-col justify-center sm:col-span-2 xl:col-span-1">
                        <div className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-400 mb-2">
                          Sexo
                        </div>
                        <div className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white break-all">
                          {p.sexo || "—"}
                        </div>
                      </div>
                    </div>

                    {/* Separador */}
                    <div className="border-t border-gray-200 dark:border-slate-700"></div>

                    {/* Información Detallada */}
                    <div className="pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                        Información Detallada
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[
                          { label: 'No. Paciente Proveedor', value: p.nopacienteproveedor },
                          { label: 'Dirección', value: p.direccion },
                          { label: 'Departamento', value: p.departamento_nombre },
                          { label: 'Estado', value: p.estado_descripcion },
                          { label: 'Jornada', value: p.jornada_descripcion },
                          { label: 'Acceso Vascular', value: p.acceso_descripcion },
                        ].map((item, index) => (
                          <div key={index} className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                              {item.label}
                            </div>
                            <div className="text-base text-gray-900 dark:text-white font-medium break-words">
                              {item.value || '—'}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Observaciones en sección separada si existen */}
                      {p.observaciones && (
                        <div className="mt-6 bg-yellow-50 dark:bg-slate-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center mt-0.5">
                                <span className="text-xs text-yellow-900">!</span>
                              </div>
                            </div>
                            <div className="ml-3 flex-1">
                              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-1">
                                Observaciones
                              </h4>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300 break-words">
                                {p.observaciones}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Datos para Reingreso (responsivo y ordenado) */}
              <div className="w-full max-w-6xl mx-auto mb-10">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                  {/* Encabezado */}
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        Datos para Reingreso
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Complete la información requerida para registrar el reingreso.
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      {p.noafiliacion}
                    </span>
                  </div>

                  <Form onSubmit={handleReingresoSubmit(p, key)}>
                    {/* En móvil: 1 col; desde lg: izq fija y der fluida */}
                    <div className="grid gap-6 px-5 py-6 md:grid-cols-1 lg:grid-cols-[minmax(320px,520px)_minmax(0,1fr)]">
                      {/* Columna izquierda */}
                      <div className="space-y-5 min-w-0">
                        <Form.Group controlId={`formNumeroFormulario-${key}`}>
                          <Form.Label className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                            Número de Formulario <span className="text-rose-500">*</span>
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="numeroformulario"
                            value={f.numeroformulario}
                            onChange={(e) =>
                              handleFormChange(key, e.target.name, e.target.value)
                            }
                            placeholder="Ingrese el número de formulario"
                            required
                            className="w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                            inputMode="numeric"
                            pattern="[0-9A-Za-z-]+"
                            aria-required="true"
                          />
                          <small className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                            Acepta números y guiones.
                          </small>
                        </Form.Group>

                        <Form.Group controlId={`formFechaReingreso-${key}`}>
                          <Form.Label className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                            Fecha de Reingreso <span className="text-rose-500">*</span>
                          </Form.Label>
                          <Form.Control
                            type="date"
                            name="fechaReingreso"
                            value={f.fechaReingreso || ""}
                            onChange={(e) =>
                              handleFormChange(key, e.target.name, e.target.value)
                            }
                            required
                            className="w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                            aria-required="true"
                          />
                        </Form.Group>

                        {/* Periodo Prestación de Servicios */}
                        <Form.Group controlId={`formPeriodo-${key}`}>
                          <Form.Label className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                            Período Prestación de Servicios
                          </Form.Label>
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                            <Form.Control
                              type="date"
                              name="inicioPrestServicios"
                              value={f.inicioPrestServicios || ""}
                              onChange={(e) =>
                                handleFormChange(key, e.target.name, e.target.value)
                              }
                              placeholder="Inicio"
                              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                            />
                            <span className="text-sm text-slate-500">a</span>
                            <Form.Control
                              type="date"
                              name="finPrestServicios"
                              value={f.finPrestServicios || ""}
                              onChange={(e) =>
                                handleFormChange(key, e.target.name, e.target.value)
                              }
                              placeholder="Fin"
                              disabled={!f.inicioPrestServicios}
                              min={f.inicioPrestServicios || undefined}
                              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white disabled:opacity-60"
                            />
                          </div>
                          <small className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                            Si ingresa una fecha, complete ambas y asegúrese que el inicio sea menor o igual al fin.
                          </small>
                        </Form.Group>

                        {/* Sesiones autorizadas por mes */}
                        <Form.Group controlId={`formSesiones-${key}`}>
                          <Form.Label className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                            Sesiones autorizadas por mes
                          </Form.Label>
                          <Form.Control
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            name="sesionesAutorizadasMes"
                            value={f.sesionesAutorizadasMes}
                            onChange={(e) => {
                              const onlyDigits = (e.target.value || '').replace(/[^0-9]/g, '');
                              handleFormChange(key, e.target.name, onlyDigits);
                            }}
                            onKeyDown={(e) => {
                              if (["e","E","+","-",".",","," "].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            onWheel={(e) => e.currentTarget.blur()}
                            pattern="\\d*"
                            placeholder="Ingrese cantidad de sesiones"
                            className="w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                          />
                        </Form.Group>
                      </div>

                      {/* Columna derecha: Observaciones ancho completo */}
                      <div className="flex flex-col min-w-0">
                        <Form.Group controlId={`formObs-${key}`} className="flex-1">
                          <div className="flex items-end justify-between">
                            <Form.Label className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                              Observaciones
                            </Form.Label>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {(f.observaciones || "").length}/500
                            </span>
                          </div>
                          <Form.Control
                            as="textarea"
                            rows={8}
                            maxLength={500}
                            name="observaciones"
                            value={f.observaciones || ""}
                            onChange={(e) =>
                              handleFormChange(key, e.target.name, e.target.value)
                            }
                            placeholder="Ingrese observaciones"
                            className="w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none min-h-[220px]"
                          />
                        </Form.Group>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="border-t border-gray-200 dark:border-slate-700 pt-6 px-5 pb-5">
                      <div className="flex flex-col sm:flex-row gap-4 justify-end">
                        <Button
                          type="submit"
                          disabled={!isFormValid(f)}
                          className="!w-full sm:!w-56 !px-8 !py-3 !bg-green-700 hover:!bg-green-800 !text-white !text-lg !font-semibold !rounded-lg shadow-md transition duration-200 focus:!ring-2 focus:!ring-green-600"
                        >
                          Guardar Reingreso
                        </Button>
                        <Button
                          type="button"
                          onClick={handleLimpiarTodo}
                          className="!w-full sm:!w-40 !px-8 !py-3 !bg-red-600 hover:!bg-red-700 !text-white !text-lg !font-semibold !rounded-lg shadow-md transition duration-200 focus:!ring-2 focus:!ring-red-600"
                        >
                          Limpiar
                        </Button>
                      </div>
                    </div>
                  </Form>
                </div>
              </div>
            </React.Fragment>
          );
        })}

      {error && <Alert variant="danger">{error}</Alert>}
    </React.Fragment>
  );
};

export default ReingresoPacientes;
