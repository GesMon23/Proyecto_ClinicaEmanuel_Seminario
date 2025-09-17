import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import logoClinica from "@/assets/logoClinica2.png";

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

import api from "../config/api";
import WebcamFoto from "@/components/WebcamFoto.jsx";

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
    periodoPrestServicios: "",
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
    const cargarDatos = async () => {
      try {
        const [respDep, respAcc, respJor] = await Promise.all([
          api.get("/departamentos"),
          api.get("/accesos-vasculares"),
          api.get("/jornadas"),
        ]);
        setDepartamentos(respDep.data || []);
        setAccesosVasculares(respAcc.data || []);
        setJornadas(respJor.data || []);
      } catch (error) {
        console.error("Error al cargar catálogos:", error);
        setModalType("error");
        setModalMessage("No se pudieron cargar los catálogos. Verifique el backend (puerto 3001).");
        setShowErrorModal(true);
      }
    };
    cargarDatos();
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
      // Validación básica en el frontend
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

      const missingFields = requiredFields.filter((field) => !formData[field]);
      if (missingFields.length > 0) {
        throw new Error("Todos los campos marcados con * son obligatorios");
      }

      if (formData.dpi && formData.dpi.length !== 13) {
        throw new Error("El DPI debe tener exactamente 13 caracteres");
      }

      // Formatear periodo de prestación de servicios (texto)
      const formatFecha = (fecha) => {
        if (!fecha) return "";
        const d = new Date(fecha);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      };
      const periodoPrestServicios = `Del ${formatFecha(formData.periodoInicio)} al ${formatFecha(
        formData.periodoFin
      )}`;

      // Datos para el backend (sin 'observaciones')
      const pacienteData = {
        noafiliacion: Number(formData.noAfiliacion),
        dpi: String(formData.dpi),
        nopacienteproveedor: Number(formData.noPacienteProveedor || 0),

        primernombre: String(formData.primerNombre),
        segundonombre: formData.segundoNombre || null,
        otrosnombres: formData.otrosNombres || null,
        primerapellido: String(formData.primerApellido),
        segundoapellido: formData.segundoApellido || null,
        apellidocasada: formData.apellidoCasada || null,

        // claves en camelCase que tu backend ya acepta
        fechaNacimiento: formData.fechaNacimiento || null,
        sexo: String(formData.sexo),
        direccion: String(formData.direccion),
        fechaIngreso: formData.fechaIngreso,
        idDepartamento: Number(formData.idDepartamento),
        idAcceso: Number(formData.idAcceso),
        numeroFormulario: formData.numeroFormulario || null,

        // periodo
        periodoprestservicios: periodoPrestServicios || null,
        fechainicioperiodo: formData.periodoInicio || null,
        fechafinperiodo: formData.periodoFin || null,

        idJornada: formData.idjornada ? Number(formData.idjornada) : null,
        sesionesAutorizadasMes: formData.sesionesAutorizadasMes
          ? Number(formData.sesionesAutorizadasMes)
          : null,

        usuario_creacion: "web",
      };

      // 1) Registrar paciente
      await api.post("/pacientes", { ...pacienteData, photo: imgSrc });

      // 2) (Opcional) espera pequeña
      await new Promise((resolve) => setTimeout(resolve, 600));

      // 3) Generar/descargar carné PDF
      const carnetResponse = await api.get(`/carnet/forzar/${pacienteData.noafiliacion}`, {
        responseType: "blob",
      });

      const blob = new Blob([carnetResponse.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${formData.noAfiliacion}_carnet.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage("Paciente registrado y carné descargado correctamente.");
      setShowSuccessModal(true);

      // 4) Reset
      setFormData(emptyForm);
      setImgSrc(null);
    } catch (error) {
      console.error("Error al registrar paciente:", error);
      let errorMessage = error.message;
      if (error.response && error.response.data) {
        if (Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.join("\n");
        } else if (typeof error.response.data.error === "string") {
          errorMessage = error.response.data.error;
        } else {
          errorMessage = JSON.stringify(error.response.data);
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
        <p className="mb-4 text-gray-700 dark:text-gray-300">{modalMessage}</p>
        <button
          onClick={() => setShowErrorModal(false)}
          className={`w-full rounded px-4 py-2 font-medium text-white transition-colors ${
            modalType === "success" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
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
                      onChange={handleInputChange}
                      required
                      placeholder="Ingrese el DPI"
                      className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
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
                      className={`w-full rounded-md border px-4 py-2 shadow-sm focus:outline-none focus:ring-2 ${
                        formData.sexo === "Femenino"
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
                      {departamentos.map((depto) => (
                        <option key={depto.iddepartamento} value={depto.iddepartamento}>
                          {depto.nombre}
                        </option>
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
                        <option key={acceso.idacceso} value={acceso.idacceso}>
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
                        className={`min-w-[140px] flex-1 rounded-md border px-4 py-2 shadow-sm focus:outline-none focus:ring-2 ${
                          !formData.periodoInicio
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
                        <option key={jornada.idjornada} value={jornada.idjornada}>
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
                      className="rounded bg-green-500 px-6 py-2 font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-70 dark:text-black"
                    >
                      {loading ? "Registrando..." : "Registrar Paciente"}
                    </button>
                    <button
                      type="button"
                      onClick={handleLimpiarForm}
                      disabled={loading}
                      className="rounded bg-red-500 px-6 py-2 font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-70 dark:text-black"
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
