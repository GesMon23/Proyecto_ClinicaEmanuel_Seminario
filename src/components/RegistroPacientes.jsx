// RegistroPacientes.jsx
import React, { useEffect, useState } from "react";
import logoClinica from "@/assets/logoClinica2.png";
import api from "../config/api";
import WebcamFoto from "@/components/WebcamFoto.jsx";
import CustomModal from '@/components/CustomModal';
import { BOTON_LIMPIAR, BOTON_PRINCIPAL } from '@/constants/botones';
import Campo, { Etiqueta } from "./registroPacientes/Campo";
import { cargarCatalogos } from "./registroPacientes/catalogos";
import {
  FORM_VACIO, aplicarCambio, armarPaciente, descargarCarnetConReintento, mensajeDeError, validarFormulario, verificarUnicidad,
} from "./registroPacientes/registro";

const AVISO_CERRADO = { show: false, type: "info", title: "", message: "" };

const RegistroPacientes = () => {
  const [formData, setFormData] = useState(FORM_VACIO);
  const [loading, setLoading] = useState(false);
  const [catalogos, setCatalogos] = useState({ departamentos: [], accesos: [], jornadas: [] });
  const [imgSrc, setImgSrc] = useState(null);
  const [showCamModal, setShowCamModal] = useState(false);
  const [aviso, setAviso] = useState(AVISO_CERRADO);

  const mostrarError = (message) => setAviso({ show: true, type: "error", title: "Error", message });

  useEffect(() => {
    cargarCatalogos().then((c) => {
      setCatalogos(c);
      if (c.falloAlguno) mostrarError("Uno o más catálogos no se pudieron cargar. Puedes continuar con los disponibles.");
    });
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((form) => aplicarCambio(form, name, value));
  };

  const handleLimpiarForm = () => {
    setFormData(FORM_VACIO);
    setImgSrc(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      validarFormulario(formData);
      const dpi = String(formData.dpi).trim();
      const noAfiliacion = String(formData.noAfiliacion || "").trim();

      const problema = await verificarUnicidad({ dpi, noAfiliacion });
      if (problema) {
        mostrarError(problema);
        return;
      }

      await api.post("/pacientes", armarPaciente(formData, imgSrc));
      await descargarCarnetConReintento(noAfiliacion);

      setAviso({ show: true, type: "success", title: "Registro Exitoso", message: "Paciente registrado y carné descargado correctamente." });
      handleLimpiarForm();
    } catch (error) {
      console.error("Error al registrar paciente:", error);
      mostrarError(`Error al registrar paciente:\n${mensajeDeError(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const f = formData;
  const esFemenino = f.sexo === "Femenino";
  const cambio = { onChange: handleInputChange };
  const opciones = (lista, texto) => lista.map((x) => ({ value: String(x.id), label: x[texto] }));

  return (
    <>
      <CustomModal show={showCamModal} onClose={() => setShowCamModal(false)} title="Captura de Fotografía">
        <WebcamFoto onCapture={(foto) => { setImgSrc(foto); setShowCamModal(false); }} onCancel={() => setShowCamModal(false)} />
      </CustomModal>

      <CustomModal
        show={aviso.show}
        onClose={() => setAviso(AVISO_CERRADO)}
        title={aviso.title}
        message={aviso.message}
        type={aviso.type}
      />

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
                    <h2 className="mb-4 text-3xl font-bold text-green-800 dark:text-white">Registro de Pacientes</h2>
                  </div>
                  <hr className="mt-4 border-gray-300 dark:border-gray-600" />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Campo id="noAfiliacion" etiqueta="No. Afiliación" requerido value={f.noAfiliacion} {...cambio} placeholder="Ingrese el número de afiliación" />
                  <Campo
                    id="dpi" etiqueta="DPI" requerido value={f.dpi}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dpi: (e.target.value || "").replace(/\D+/g, "").slice(0, 13) }))}
                    inputMode="numeric" pattern="\d{13}" maxLength={13} title="Debe contener 13 dígitos"
                    placeholder="Ingrese el DPI (13 dígitos)"
                    onKeyDown={(e) => { if (["e", "E", "+", "-", ".", ",", " "].includes(e.key)) e.preventDefault(); }}
                    onPaste={(e) => { if (/[^0-9]/.test((e.clipboardData.getData("text") || "").trim())) e.preventDefault(); }}
                  />
                  <Campo id="noPacienteProveedor" etiqueta="No. Paciente Proveedor" requerido value={f.noPacienteProveedor} {...cambio} placeholder="Ingrese el número de paciente proveedor" />
                  <Campo id="primerNombre" etiqueta="Primer Nombre" requerido value={f.primerNombre} {...cambio} placeholder="Ingrese el primer nombre" />
                  <Campo id="segundoNombre" etiqueta="Segundo Nombre" value={f.segundoNombre} {...cambio} placeholder="Ingrese el segundo nombre" />
                  <Campo id="otrosNombres" etiqueta="Otros Nombres" value={f.otrosNombres} {...cambio} placeholder="Ingrese otros nombres" />
                  <Campo id="primerApellido" etiqueta="Primer Apellido" requerido value={f.primerApellido} {...cambio} placeholder="Ingrese el primer apellido" />
                  <Campo id="segundoApellido" etiqueta="Segundo Apellido" value={f.segundoApellido} {...cambio} placeholder="Ingrese el segundo apellido" />
                  <Campo
                    id="apellidoCasada" etiqueta="Apellido Casada" value={esFemenino ? f.apellidoCasada : ""} {...cambio}
                    placeholder="Ingrese el apellido casada" deshabilitado={!esFemenino}
                  />
                  <Campo id="fechaNacimiento" etiqueta="Fecha de Nacimiento" tipo="date" value={f.fechaNacimiento} {...cambio} />
                  <Campo
                    id="sexo" etiqueta="Género" requerido value={f.sexo} {...cambio} vacio="Seleccione el género"
                    opciones={[{ value: "Masculino", label: "Masculino" }, { value: "Femenino", label: "Femenino" }]}
                  />
                  <Campo id="direccion" etiqueta="Dirección" requerido ancho value={f.direccion} {...cambio} placeholder="Ingrese la dirección" />
                  <Campo id="fechaIngreso" etiqueta="Fecha de Ingreso" tipo="date" requerido value={f.fechaIngreso} {...cambio} />
                  <Campo
                    id="idDepartamento" etiqueta="Departamento" requerido value={f.idDepartamento} {...cambio}
                    vacio="Seleccione el departamento" opciones={opciones(catalogos.departamentos, "nombre")}
                  />
                  <Campo
                    id="idAcceso" etiqueta="Acceso Vascular" requerido value={f.idAcceso} {...cambio}
                    vacio="Seleccione el acceso vascular" opciones={opciones(catalogos.accesos, "descripcion")}
                  />
                  <Campo id="numeroFormulario" etiqueta="Número de Formulario" requerido value={f.numeroFormulario} {...cambio} placeholder="Ingrese el número de formulario" />

                  <div>
                    <Etiqueta requerido>Periodo Prestación Servicios</Etiqueta>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Del</span>
                      <input
                        type="date" name="periodoInicio" value={f.periodoInicio} {...cambio} required
                        className="min-w-[140px] flex-1 rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                      />
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Hasta</span>
                      <input
                        type="date" name="periodoFin" value={f.periodoFin} {...cambio} required
                        disabled={!f.periodoInicio} min={f.periodoInicio || undefined}
                        className={`min-w-[140px] flex-1 rounded-md border px-4 py-2 shadow-sm focus:outline-none focus:ring-2 ${!f.periodoInicio
                          ? "cursor-not-allowed bg-gray-200 text-gray-500"
                          : "border-gray-300 focus:ring-green-500 dark:border-gray-600 dark:bg-slate-800 dark:text-white"}`}
                      />
                    </div>
                  </div>

                  <Campo
                    id="sesionesAutorizadasMes" etiqueta="Sesiones Autorizadas por Mes" tipo="number" requerido min={1}
                    value={f.sesionesAutorizadasMes} {...cambio} placeholder="Ingrese el número de sesiones autorizadas"
                  />
                  <Campo
                    id="idjornada" etiqueta="Jornada" requerido value={f.idjornada} {...cambio}
                    vacio="Seleccione la jornada" opciones={opciones(catalogos.jornadas, "descripcion")}
                  />

                  <div className="mb-6 md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Fotografía del Paciente</label>
                    <div className="text-center">
                      {!imgSrc ? (
                        <button
                          type="button"
                          onClick={() => setShowCamModal(true)}
                          className="mt-2 rounded-lg bg-blue-400 px-6 py-2 font-semibold text-white shadow-md transition duration-200 hover:bg-blue-700 dark:text-black"
                        >
                          Capturar Foto
                        </button>
                      ) : (
                        <>
                          <img src={imgSrc} alt="Foto del paciente" className="mx-auto mb-3 h-52 w-52 rounded-xl border-4 border-green-800 object-cover shadow" />
                          <button
                            type="button"
                            onClick={() => setShowCamModal(true)}
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
                      className={BOTON_PRINCIPAL}
                    >
                      {loading ? "Registrando..." : "Registrar Paciente"}
                    </button>
                    <button
                      type="button"
                      onClick={handleLimpiarForm}
                      disabled={loading}
                      className={BOTON_LIMPIAR}
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
