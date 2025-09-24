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
  urlfoto: r.urlfoto ?? r.url_foto ?? null,
});

const ReingresoPacientes = (props) => {
  const [selectedFilter, setSelectedFilter] = useState("noafiliacion");
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
  const handleFilterChange = (e) => {
    setSelectedFilter(e.target.value);
    setError("");
  };

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
      return !!response.data?.exists && !!response.data?.filename;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResultados([]);
    setLoading(true);
    try {
      const val = (busqueda[selectedFilter] || "").trim();
      if (!val) {
        setError(
          selectedFilter === "noafiliacion"
            ? "Debe ingresar el Número de Afiliación."
            : "Debe ingresar el DPI."
        );
        return;
      }
      const params =
        selectedFilter === "noafiliacion" ? { noafiliacion: val } : { dpi: val };

      const { data } = await api.get("/api/reingreso/pacientes/reingreso", {
        params,
      });

      const enriquecidos = await Promise.all(
        (Array.isArray(data) ? data : []).map(async (raw) => {
          const p = normalizePaciente(raw);
          const fotoOK = p.noafiliacion ? await verificarExistenciaFoto(p.noafiliacion) : false;
          return {
            ...p,
            fotoFilename: fotoOK ? `${p.noafiliacion}.jpg` : null,
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
                  <hr className="mt-4 border-gray-300 dark:border-gray-600" />
                </div>

                {/* Selector de filtro */}
                <div className="flex justify-center mb-4">
                  <div className="inline-flex gap-6 items-center text-base text-gray-800 dark:text-gray-200">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="filtro"
                        value="noafiliacion"
                        checked={selectedFilter === "noafiliacion"}
                        onChange={handleFilterChange}
                      />
                      <span>No. Afiliación</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="filtro"
                        value="dpi"
                        checked={selectedFilter === "dpi"}
                        onChange={handleFilterChange}
                      />
                      <span>DPI</span>
                    </label>
                  </div>
                </div>

                {/* Input según filtro */}
                <div className="flex justify-center">
                  <div className="w-full max-w-md mb-4">
                    {selectedFilter === "noafiliacion" ? (
                      <input
                        placeholder="Número de Afiliación"
                        type="text"
                        name="noafiliacion"
                        value={busqueda.noafiliacion}
                        onChange={handleChange}
                        className="w-full text-lg px-4 py-2 border border-gray-300 rounded-md shadow-sm
                                   focus:outline-none focus:ring-2 focus:ring-green-600
                                   bg-white text-gray-900 placeholder-gray-500
                                   dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-300 dark:border-slate-600"
                        required
                      />
                    ) : (
                      <input
                        placeholder="DPI"
                        type="text"
                        name="dpi"
                        value={busqueda.dpi}
                        onChange={handleChange}
                        className="w-full text-lg px-4 py-2 border border-gray-300 rounded-md shadow-sm
                                   focus:outline-none focus:ring-2 focus:ring-green-600
                                   bg-white text-gray-900 placeholder-gray-500
                                   dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-300 dark:border-slate-600"
                        required
                      />
                    )}
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
          const fotoSrc = p.fotoFilename
            ? `${baseURL}/fotos/${p.noafiliacion}.jpg?v=${p._cacheBuster}`
            : defaultAvatar;

          const nombre = `${p.primernombre || ""} ${p.segundonombre || ""} ${
            p.otrosnombres || ""
          } ${p.primerapellido || ""} ${p.segundoapellido || ""} ${p.apellidacasada || ""}`
            .replace(/ +/g, " ")
            .trim();

          return (
            <React.Fragment key={key}>
              {/* Tarjeta del paciente (responsive mejorado) */}
              <div className="mx-auto mb-8 w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white/70 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
                {/* Foto arriba en móviles; lado a lado solo desde lg */}
                <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
                  {/* Foto */}
                  <div className="flex items-center justify-center bg-slate-50 p-6 dark:bg-slate-800/40">
                    <div className="h-[200px] w-[200px] sm:h-[240px] sm:w-[240px] overflow-hidden rounded-2xl ring-1 ring-slate-200 shadow-lg dark:ring-slate-700">
                      <img
                        src={fotoSrc}
                        alt="Foto del paciente"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = defaultAvatar;
                        }}
                      />
                    </div>
                  </div>

                  {/* Datos */}
                  <div className="p-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <h2 className="text-2xl font-extrabold tracking-wide text-emerald-800 dark:text-emerald-300 break-words">
                        {nombre || "—"}
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          Afiliación: {p.noafiliacion || "—"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                          DPI: {p.dpi || "—"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                          {p.sexo || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Cards básicas (responsivas) */}
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {[
                        { label: "NO. PACIENTE PROVEEDOR", value: p.nopacienteproveedor },
                        {
                          label: "FECHA DE NACIMIENTO",
                          value: p.fechanacimiento
                            ? new Date(p.fechanacimiento).toLocaleDateString()
                            : "—",
                          extra: ` (${calcularEdad(p.fechanacimiento) || "—"} años)`,
                        },
                        { label: "DIRECCIÓN", value: p.direccion },
                        { label: "CAUSA DE EGRESO", value: p.causaegreso_descripcion },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="min-w-0 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                        >
                          <div className="text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                            {item.label}
                          </div>
                          <div className="text-base font-semibold text-slate-800 dark:text-slate-100 break-words">
                            {item.value || "—"}
                            {item.extra && (
                              <span className="ml-1 text-sm font-normal text-slate-500 dark:text-slate-400">
                                {item.extra}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Datos para Reingreso (responsivo y ordenado) */}
              <div className="mx-auto mb-10 w-full max-w-6xl">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/70 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
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
                          <Form.Label className={labelClasses}>
                            Número de Formulario <span className="text-rose-500">*</span>
                          </Form.Label>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400">
                              #
                            </span>
                            <Form.Control
                              type="text"
                              name="numeroformulario"
                              value={f.numeroformulario}
                              onChange={(e) =>
                                handleFormChange(key, e.target.name, e.target.value)
                              }
                              placeholder="Ingrese el número de formulario"
                              required
                              className={`${controlClasses} !w-full pl-9 text-base py-3`}
                              inputMode="numeric"
                              pattern="[0-9A-Za-z-]+"
                              aria-required="true"
                            />
                          </div>
                          <small className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                            Acepta números y guiones.
                          </small>
                        </Form.Group>

                        <Form.Group controlId={`formFechaReingreso-${key}`}>
                          <Form.Label className={labelClasses}>
                            Fecha de Reingreso <span className="text-rose-500">*</span>
                          </Form.Label>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400">
                              📅
                            </span>
                            <Form.Control
                              type="date"
                              name="fechaReingreso"
                              value={f.fechaReingreso || ""}
                              onChange={(e) =>
                                handleFormChange(key, e.target.name, e.target.value)
                              }
                              required
                              className={`${controlClasses} !w-full pl-10 text-base py-3`}
                              aria-required="true"
                            />
                          </div>
                        </Form.Group>
                      </div>

                      {/* Columna derecha: Observaciones ancho completo */}
                      <div className="flex flex-col min-w-0">
                        <Form.Group controlId={`formObs-${key}`} className="flex-1">
                          <div className="flex items-end justify-between">
                            <Form.Label className={labelClasses}>Observaciones</Form.Label>
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
                            className={`${controlClasses} !w-full resize-none text-base py-3 min-h-[220px]`}
                          />
                        </Form.Group>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-top border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <Button
                        type="button"
                        variant="danger"
                        onClick={handleLimpiarTodo}
                        className="!w-full sm:!w-auto !rounded-xl !bg-rose-600 !px-5 !py-2.5 !text-white hover:!bg-rose-700"
                      >
                        Limpiar
                      </Button>
                      <Button
                        type="submit"
                        disabled={!isFormValid(f)}
                        className="!w-full sm:!w-auto !rounded-xl !bg-emerald-600 !px-5 !py-2.5 !text-white hover:!bg-emerald-700 disabled:opacity-60"
                      >
                        Guardar Reingreso
                      </Button>
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
