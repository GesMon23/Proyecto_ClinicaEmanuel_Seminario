// RegistroPacientes.jsx
import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import logoClinica from "@/assets/logoClinica2.png";
import api from "../config/api";
import WebcamFoto from "@/components/WebcamFoto.jsx";

// Modal sencillo
const CustomModal = ({ show, onClose, title, children }) => {
  if (!show) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        onClick={onClose}
      >
        <div
          className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-slate-900"
          onClick={(e) => e.stopPropagation()}
        >
          <h4 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white">{title}</h4>
          {children}
        </div>
      </div>
    </>
  );
};

const parseDepartamentoRecord = (d) => {
  const idDirect =
    d?.iddepartamento ?? d?.id_departamento ?? d?.idDepartamento ?? d?.id;

  // 👇 agrega estas dos claves
  const nombreDirect =
    d?.nombre ??
    d?.descripcion ??
    d?.nombredepartamento ??
    d?.nombreDepartamento ??
    d?.nombre_departamento;

  if (idDirect && nombreDirect) {
    return { id: String(idDirect).trim(), nombre: String(nombreDirect).trim() };
  }

  // Soporte cuando viene como "(01,Guatemala)"
  const rec = d?.fn_mostrar_departamentos ?? d?.record ?? d;
  if (rec) {
    const s = String(rec).replace(/[()"]/g, "");
    const [idPart, ...rest] = s.split(",");
    const id = (idPart ?? "").trim();
    const nombre = (rest.join(",") ?? "").trim();
    if (id && nombre) return { id, nombre };
  }

  return null;
};


// ------ Helpers de fecha y carné (sin tocar backend) ------
const formatFechaYMDToDMY = (ymd) => {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Reintento corto para descargar carné (por si el server aún está generando)
const fetchCarnetWithRetry = async (id, maxTries = 3) => {
  let lastErr;
  for (let i = 0; i < maxTries; i++) {
    try {
      const res = await api.get(`/carnet/forzar/${encodeURIComponent(String(id))}`, {
        responseType: "blob",
      });
      return res;
    } catch (e) {
      lastErr = e;
      // Pequeña espera entre intentos, incremental
      await sleep(600 + i * 300);
    }
  }
  throw lastErr;
};

// ------ Componente principal ------
const RegistroPacientes = () => {
  const [formData, setFormData] = useState({
    noAfiliacion: "",
    dpi: "",
    noPacienteProveedor: "",
    primerNombre: "",
    segundoNombre: "",
    otrosNombres: "",
    primerApellido: "",
    segundoApellido: "",
    apellidoCasada: "",
    fechaNacimiento: "",
    sexo: "",
    direccion: "",
    fechaIngreso: "",
    idDepartamento: "",
    idAcceso: "",
    numeroFormulario: "",
    periodoPrestServicios: "", // no se usa en inputs, pero lo mantenemos por compatibilidad
    periodoInicio: "",
    periodoFin: "",
    idjornada: "",
    sesionesAutorizadasMes: "",
  });

  const [loading, setLoading] = useState(false);
  const [departamentos, setDepartamentos] = useState([]);
  const [accesosVasculares, setAccesosVasculares] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [imgSrc, setImgSrc] = useState(null);
  const [showCamModal, setShowCamModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");

  useEffect(() => {
    (async () => {
      const toArray = (x) => (Array.isArray(x) ? x : x?.data ?? []);
      const [depRes, accRes, jorRes] = await Promise.allSettled([
        api.get("/departamentos"),
        api.get("/accesos-vasculares"),
        api.get("/jornadas"),
      ]);

      if (depRes.status === "fulfilled") {
        const deps = toArray(depRes.value.data)
          .map(parseDepartamentoRecord)
          .filter(Boolean)
          .map(({ id, nombre }) => ({ id: String(id), nombre: String(nombre) }));
        setDepartamentos(deps);
      } else {
        console.error("Departamentos falló:", depRes.reason);
      }

      if (accRes.status === "fulfilled") {
        const accs = toArray(accRes.value.data)
          .map((a) => ({
            id: a.idacceso ?? a.id_acceso ?? a.idAcceso ?? a.id,
            descripcion: a.descripcion ?? "",
          }))
          .filter((a) => a.id != null);
        setAccesosVasculares(accs);
      } else {
        console.error("Accesos falló:", accRes.reason);
      }

      if (jorRes.status === "fulfilled") {
        const jors = toArray(jorRes.value.data).map((j) => ({
          id: j.idjornada ?? j.id_jornada ?? j.idJornada ?? j.id,
          descripcion: j.descripcion ?? "",
        }));
        setJornadas(jors);
      } else {
        console.error("Jornadas falló:", jorRes.reason);
      }

      if ([depRes, accRes, jorRes].some(r => r.status === "rejected")) {
        setModalType("error");
        setModalMessage("Uno o más catálogos no se pudieron cargar. Puedes continuar con los disponibles.");
        setShowErrorModal(true);
      }
    })();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => {
      if (name === "sexo" && value !== "Femenino") {
        return { ...prevState, sexo: value, apellidoCasada: "" };
      }
      return { ...prevState, [name]: value };
    });
  };

  const openCamModal = () => setShowCamModal(true);
  const closeCamModal = () => setShowCamModal(false);

  const handleCapturePhoto = (imageSrc) => {
    setImgSrc(imageSrc);
    setShowCamModal(false);
  };

  const emptyForm = {
    noAfiliacion: "",
    dpi: "",
    noPacienteProveedor: "",
    primerNombre: "",
    segundoNombre: "",
    otrosNombres: "",
    primerApellido: "",
    segundoApellido: "",
    apellidoCasada: "",
    fechaNacimiento: "",
    sexo: "",
    direccion: "",
    fechaIngreso: "",
    idDepartamento: "",
    idAcceso: "",
    numeroFormulario: "",
    periodoPrestServicios: "",
    periodoInicio: "",
    periodoFin: "",
    idjornada: "",
    sesionesAutorizadasMes: "",
  };

  const handleLimpiarForm = () => {
    setFormData(emptyForm);
    setImgSrc(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Reglas mínimas: iguales a tu versión, pero con validaciones extra
      const requiredFields = [
        "noAfiliacion",
        "dpi",
        "noPacienteProveedor",
        "primerNombre",
        "primerApellido",
        "sexo",
        "direccion",
        "fechaIngreso",
        "idDepartamento",
        "idAcceso",
        "numeroFormulario",
        "periodoInicio",
        "periodoFin",
        "idjornada",
        "sesionesAutorizadasMes",
      ];

      const missingFields = requiredFields.filter((field) => !String(formData[field] ?? "").trim());
      if (missingFields.length > 0) {
        throw new Error("Todos los campos marcados con * son obligatorios");
      }

      const dpiTrim = String(formData.dpi).trim();
      if (!/^\d{13}$/.test(dpiTrim)) {
        throw new Error("El DPI debe tener 13 dígitos (solo números).");
      }

      if (formData.periodoFin < formData.periodoInicio) {
        throw new Error("La fecha 'Hasta' del período no puede ser anterior a 'Del'.");
      }

      // Verificación previa de unicidad: DPI
      try {
        await api.get(`/pacientes/dpi/${dpiTrim}`);
        // Si no lanzó error, el DPI ya existe
        setModalType("error");
        setModalMessage("El DPI ya está registrado para otro paciente.");
        setShowErrorModal(true);
        setLoading(false);
        return;
      } catch (chkErr) {
        if (!(chkErr?.response?.status === 404)) {
          // Si no es 404 (no encontrado), es un error real del servidor
          setModalType("error");
          setModalMessage("No se pudo validar el DPI. Inténtelo de nuevo.");
          setShowErrorModal(true);
          setLoading(false);
          return;
        }
      }

      // Verificación previa de unicidad: No. Afiliación
      try {
        const noAfTrim = String(formData.noAfiliacion || '').trim();
        await api.get(`/pacientes/${encodeURIComponent(noAfTrim)}`);
        // Si no lanzó error, el No. Afiliación ya existe
        setModalType("error");
        setModalMessage("El Número de Afiliación ya está registrado.");
        setShowErrorModal(true);
        setLoading(false);
        return;
      } catch (chkErr) {
        if (!(chkErr?.response?.status === 404)) {
          setModalType("error");
          setModalMessage("No se pudo validar el Número de Afiliación. Inténtelo de nuevo.");
          setShowErrorModal(true);
          setLoading(false);
          return;
        }
      }

      // Periodo de prestación de servicios (texto), sin usar Date()
      const periodoPrestServicios = `Del ${formatFechaYMDToDMY(formData.periodoInicio)} al ${formatFechaYMDToDMY(
        formData.periodoFin
      )}`;

      // Payload: mantenemos tus claves originales para no depender del backend
      const pacienteData = {
        noafiliacion: String(formData.noAfiliacion).trim(), // string para no perder ceros
        dpi: dpiTrim,
        nopacienteproveedor: String(formData.noPacienteProveedor).trim(),

        primernombre: String(formData.primerNombre).trim(),
        segundonombre: formData.segundoNombre?.trim() || null,
        otrosnombres: formData.otrosNombres?.trim() || null,
        primerapellido: String(formData.primerApellido).trim(),
        segundoapellido: formData.segundoApellido?.trim() || null,
        apellidocasada:
          formData.sexo === "Femenino" ? formData.apellidoCasada?.trim() || null : null,

        // claves camelCase que ya usabas en tu versión
        fechaNacimiento: formData.fechaNacimiento || null, // YYYY-MM-DD
        sexo: String(formData.sexo),
        direccion: String(formData.direccion).trim(),
        fechaIngreso: formData.fechaIngreso, // YYYY-MM-DD
        idDepartamento: formData.idDepartamento ? String(formData.idDepartamento) : null,
        idAcceso: formData.idAcceso ? Number(formData.idAcceso) : null,
        numeroFormulario: formData.numeroFormulario?.trim() || null,

        periodoprestservicios: periodoPrestServicios || null,
        fechainicioperiodo: formData.periodoInicio || null,
        fechafinperiodo: formData.periodoFin || null,

        idJornada: formData.idjornada ? Number(formData.idjornada) : null,
        sesionesAutorizadasMes: formData.sesionesAutorizadasMes
          ? Number(formData.sesionesAutorizadasMes)
          : null,

        usuario_creacion: "web",
        photo: imgSrc || null,
      };

      // 1) Registrar paciente
      await api.post("/pacientes", pacienteData);

      // 2) Descargar carné con reintentos cortos (sin setTimeout fijo)
      const carnetRes = await fetchCarnetWithRetry(String(formData.noAfiliacion).trim(), 3);
      const blob = new Blob([carnetRes.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${String(formData.noAfiliacion).trim()}_carnet.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage("Paciente registrado y carné descargado correctamente.");
      setShowSuccessModal(true);

      // 3) Reset
      setFormData(emptyForm);
      setImgSrc(null);
    } catch (error) {
      console.error("Error al registrar paciente:", error);
      let errorMessage = error?.message ?? "Error desconocido";

      // Si backend retornó detalles
      if (error.response && error.response.data) {
        if (Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.join("\n");
        } else if (typeof error.response.data.error === "string") {
          errorMessage = error.response.data.error;
        } else {
          try {
            errorMessage = JSON.stringify(error.response.data);
          } catch {
            /* ignore */
          }
        }
      }

      setSuccessMessage("");
      setModalType("error");
      setModalMessage(`Error al registrar paciente:\n${errorMessage}`);
      setShowSuccessModal(false);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Modal Cámara */}
      <CustomModal show={showCamModal} onClose={closeCamModal} title="Captura de Fotografía">
        <WebcamFoto onCapture={handleCapturePhoto} onCancel={closeCamModal} />
      </CustomModal>

      {/* Modal Error */}
      <CustomModal
        show={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={modalType === "error" ? "Error" : "Alerta"}
      >
        <p className="mb-4 text-gray-700 dark:text-gray-300" style={{ whiteSpace: "pre-line" }}>
          {modalMessage}
        </p>
        <button
          onClick={() => setShowErrorModal(false)}
          className={`w-full rounded px-4 py-2 font-medium text-white transition-colors ${modalType === "success"
            ? "bg-green-600 hover:bg-green-700"
            : "bg-red-600 hover:bg-red-700"
            }`}
        >
          Cerrar
        </button>
      </CustomModal>

      {/* Modal Éxito */}
      <CustomModal
        show={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Registro Exitoso"
      >
        <div style={{ textAlign: "center", padding: 10 }}>
          <p style={{ fontSize: 18, color: "#2ecc71", margin: 0 }}>{successMessage}</p>
          <Button variant="success" style={{ marginTop: 12 }} onClick={() => setShowSuccessModal(false)}>
            Cerrar
          </Button>
        </div>
      </CustomModal>

      <div className="w-full px-4 py-6 md:px-8">
        <div className="w-full">
          <div className="rounded-lg bg-white shadow-md dark:bg-slate-900">
            <div className="p-6">
              <form onSubmit={handleSubmit}>
                <div className="mb-6 w-full text-center">
                  <div className="flex flex-wrap items-center justify-center gap-6">
                    <img
                      alt="Logo Clínica"
                      src={logoClinica}
                      className="h-[180px] max-w-[320px] rounded-xl bg-white object-contain p-2 shadow-md dark:bg-slate-800"
                    />
                    <h2 className="mb-4 text-3xl font-bold text-green-800 dark:text-white">
                      Registro de Pacientes
                    </h2>
                  </div>
                  <hr className="mt-4 border-gray-300 dark:border-gray-600" />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="noAfiliacion"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      No. Afiliación *
                    </label>
                    <input
                      type="text"
                      id="noAfiliacion"
                      name="noAfiliacion"
                      value={formData.noAfiliacion}
                      onChange={handleInputChange}
                      inputMode="numeric"
                      pattern="\d*"
                      required
                      placeholder="Ingrese el número de afiliación"
                      className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="dpi"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      DPI *
                    </label>
                    <input
                      type="text"
                      id="dpi"
                      name="dpi"
                      value={formData.dpi}
                      onChange={(e) => {
                        const onlyDigits = (e.target.value || '').replace(/\D+/g, '').slice(0, 13);
                        setFormData(prev => ({ ...prev, dpi: onlyDigits }));
                      }}
                      inputMode="numeric"
                      pattern="\d{13}"
                      maxLength={13}
                      required
                      placeholder="Ingrese el DPI (13 dígitos)"
                      className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                      title="Debe contener 13 dígitos"
                      onKeyDown={(e) => {
                        if (["e", "E", "+", "-", ".", ",", " "].includes(e.key)) e.preventDefault();
                      }}
                      onPaste={(e) => {
                        const t = (e.clipboardData.getData('text') || '').trim();
                        if (/[^0-9]/.test(t)) e.preventDefault();
                      }}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="noPacienteProveedor"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      No. Paciente Proveedor *
                    </label>
                    <input
                      type="text"
                      id="noPacienteProveedor"
                      name="noPacienteProveedor"
                      value={formData.noPacienteProveedor}
                      onChange={handleInputChange}
                      inputMode="numeric"
                      pattern="\d*"
                      required
                      placeholder="Ingrese el número de paciente proveedor"
                      className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="primerNombre"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Primer Nombre *
                    </label>
                    <input
                      type="text"
                      id="primerNombre"
                      name="primerNombre"
                      value={formData.primerNombre}
                      onChange={handleInputChange}
                      required
                      placeholder="Ingrese el primer nombre"
                      className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="segundoNombre"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Segundo Nombre
                    </label>
                    <input
                      type="text"
                      id="segundoNombre"
                      name="segundoNombre"
                      value={formData.segundoNombre}
                      onChange={handleInputChange}
                      placeholder="Ingrese el segundo nombre"
                      className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="otrosNombres"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Otros Nombres
                    </label>
                    <input
                      type="text"
                      id="otrosNombres"
                      name="otrosNombres"
                      value={formData.otrosNombres}
                      onChange={handleInputChange}
                      placeholder="Ingrese otros nombres"
                      className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="primerApellido"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Primer Apellido *
                    </label>
                    <input
                      type="text"
                      id="primerApellido"
                      name="primerApellido"
                      value={formData.primerApellido}
                      onChange={handleInputChange}
                      required
                      placeholder="Ingrese el primer apellido"
                      className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="segundoApellido"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Segundo Apellido
                    </label>
                    <input
                      type="text"
                      id="segundoApellido"
                      name="segundoApellido"
                      value={formData.segundoApellido}
                      onChange={handleInputChange}
                      placeholder="Ingrese el segundo apellido"
                      className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="apellidoCasada"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Apellido Casada
                    </label>
                    <input
                      type="text"
                      id="apellidoCasada"
                      name="apellidoCasada"
                      value={formData.sexo === "Femenino" ? formData.apellidoCasada : ""}
                      onChange={handleInputChange}
                      placeholder="Ingrese el apellido casada"
                      disabled={formData.sexo !== "Femenino"}
                      className={`w-full rounded-md border px-4 py-2 shadow-sm focus:outline-none focus:ring-2 ${formData.sexo === "Femenino"
                        ? "border-gray-300 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                        : "cursor-not-allowed bg-gray-200 text-gray-500"
                        }`}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="fechaNacimiento"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Fecha de Nacimiento
                    </label>
                    <input
                      type="date"
                      id="fechaNacimiento"
                      name="fechaNacimiento"
                      value={formData.fechaNacimiento}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="sexo"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Género *
                    </label>
                    <select
                      id="sexo"
                      name="sexo"
                      value={formData.sexo}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Seleccione el género</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="direccion"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Dirección *
                    </label>
                    <input
                      type="text"
                      id="direccion"
                      name="direccion"
                      value={formData.direccion}
                      onChange={handleInputChange}
                      required
                      placeholder="Ingrese la dirección"
                      className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="fechaIngreso"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Fecha de Ingreso *
                    </label>
                    <input
                      type="date"
                      id="fechaIngreso"
                      name="fechaIngreso"
                      value={formData.fechaIngreso}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="idDepartamento"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Departamento *
                    </label>
                    <select
                      id="idDepartamento"
                      name="idDepartamento"
                      value={formData.idDepartamento}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Seleccione el departamento</option>
                      
                      
                  {departamentos.map(dep => (
                    <option key={dep.nombre} value={dep.nombre}>{dep.nombre}</option>
                  ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="idAcceso"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Acceso Vascular *
                    </label>
                    <select
                      id="idAcceso"
                      name="idAcceso"
                      value={formData.idAcceso}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Seleccione el acceso vascular</option>
                      {accesosVasculares.map((acceso) => (
                        <option key={acceso.id} value={acceso.id}>
                          {acceso.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="numeroFormulario"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Número de Formulario *
                    </label>
                    <input
                      type="text"
                      id="numeroFormulario"
                      name="numeroFormulario"
                      value={formData.numeroFormulario}
                      onChange={handleInputChange}
                      required
                      placeholder="Ingrese el número de formulario"
                      className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Periodo Prestación Servicios *
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Del</span>
                      <input
                        type="date"
                        name="periodoInicio"
                        value={formData.periodoInicio}
                        onChange={handleInputChange}
                        required
                        className="min-w-[140px] flex-1 rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                      />
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Hasta</span>
                      <input
                        type="date"
                        name="periodoFin"
                        value={formData.periodoFin}
                        onChange={handleInputChange}
                        required
                        disabled={!formData.periodoInicio}
                        min={formData.periodoInicio || undefined}
                        className={`min-w-[140px] flex-1 rounded-md border px-4 py-2 shadow-sm focus:outline-none focus:ring-2 ${!formData.periodoInicio
                          ? "cursor-not-allowed bg-gray-200 text-gray-500"
                          : "border-gray-300 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                          }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="sesionesAutorizadasMes"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Sesiones Autorizadas por Mes *
                    </label>
                    <input
                      type="number"
                      id="sesionesAutorizadasMes"
                      name="sesionesAutorizadasMes"
                      value={formData.sesionesAutorizadasMes}
                      onChange={handleInputChange}
                      min={1}
                      required
                      placeholder="Ingrese el número de sesiones autorizadas"
                      className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="idjornada"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Jornada *
                    </label>
                    <select
                      id="idjornada"
                      name="idjornada"
                      value={formData.idjornada}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Seleccione la jornada</option>
                      {jornadas.map((jornada) => (
                        <option key={jornada.id} value={jornada.id}>
                          {jornada.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-6 md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Fotografía del Paciente
                    </label>

                    <div className="text-center">
                      {!imgSrc ? (
                        <button
                          type="button"
                          onClick={openCamModal}
                          className="mt-2 rounded-lg bg-blue-400 px-6 py-2 font-semibold text-white shadow-md transition duration-200 hover:bg-blue-700 dark:text-black"
                        >
                          Capturar Foto
                        </button>
                      ) : (
                        <>
                          <img
                            src={imgSrc}
                            alt="Foto del paciente"
                            className="mx-auto mb-3 h-52 w-52 rounded-xl border-4 border-green-800 object-cover shadow"
                          />
                          <button
                            type="button"
                            onClick={openCamModal}
                            className="rounded-lg bg-gray-600 px-6 py-2 font-medium text-white shadow-md transition duration-200 hover:bg-gray-700"
                          >
                            Tomar otra foto
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-5 md:col-span-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded bg-green-500 px-6 py-2 font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-70"
                    >
                      {loading ? "Registrando..." : "Registrar Paciente"}
                    </button>
                    <button
                      type="button"
                      onClick={handleLimpiarForm}
                      disabled={loading}
                      className="rounded bg-red-500 px-6 py-2 font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-70"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegistroPacientes;
