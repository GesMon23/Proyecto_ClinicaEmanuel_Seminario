import React, { useState } from "react";
import { Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import api from '../config/api';
import CustomModal from '@/components/CustomModal.jsx';
import logoClinica from "@/assets/logoClinica2.png"

// Calcula la edad a partir de la fecha de nacimiento (YYYY-MM-DD)
function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return '';
  const partes = fechaNacimiento.split('-');
  if (partes.length < 3) return '';
  const anio = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
  const dia = parseInt(partes[2], 10);
  const hoy = new Date();
  const nacimiento = new Date(anio, mes, dia);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

import { useEffect } from "react";

const RegistroFormularios = () => {
  const [busqueda, setBusqueda] = useState({ dpi: '', noafiliacion: '' });
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState('info');

  // Estados para la tabla de pacientes cargados manualmente
  const [pacientesCargados, setPacientesCargados] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [nuevoPaciente, setNuevoPaciente] = useState({ noafiliacion: '' });

  // Cargar jornadas al montar el componente
  useEffect(() => {
    const fetchJornadas = async () => {
      try {
        const response = await api.get('/jornadas');
        setJornadas(response.data);
      } catch (error) {
        setJornadas([]);
      }
    };
    fetchJornadas();
  }, []);

  // Estados para el formulario de registro de formulario
  const [formData, setFormData] = useState({
    numeroformulario: '',
    sesionesautorizadasmes: '',
    periodoDel: '',
    periodoHasta: '',
    observaciones: ''
  });

  const handleRegistroFormularioInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Limpia el formulario de registro y los datos del paciente
  const handleLimpiarRegistroFormulario = () => {
    setFormData({
      numeroformulario: '',
      sesionesautorizadasmes: '',
      periodoDel: '',
      periodoHasta: '',
      observaciones: ''
    });
    setResultados([]);
    setError('');
  };

  const handleRegistroFormularioSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!pacientesCargados.length) {
      setError("Debe agregar al menos un paciente a la tabla");
      return;
    }
    try {
      // Validaciones básicas
      if (!formData.numeroformulario || !formData.sesionesautorizadasmes || !formData.periodoDel || !formData.periodoHasta) {
        setError("Todos los campos son obligatorios");
        return;
      }
      // Preparar datos para el backend
      const pacientesPayload = pacientesCargados.map(p => ({
        noafiliacion: p.noafiliacion,
        numeroformulario: formData.numeroformulario,
        fechainicioperiodo: formData.periodoDel,
        fechafinperiodo: formData.periodoHasta,
        sesionesautorizadasmes: formData.sesionesautorizadasmes
      }));
      const usuario = localStorage.getItem('usuario') || 'sistema';
      const response = await api.put('/api/pacientes/masivo', { pacientes: pacientesPayload, usuario });
      if (response.data && response.data.success) {
        setModalMessage("Formulario guardado exitosamente.");
        setModalTitle("Éxito");
        setModalType("success");
        setShowModal(true);
        handleLimpiarRegistroFormulario();
        setPacientesCargados([]);
      } else {
        setModalMessage(response.data?.detalle || response.data?.error || "Error al guardar el formulario.");
        setModalTitle("Error");
        setModalType("error");
        setShowModal(true);
      }
    } catch (err) {
      setModalMessage(err.response?.data?.detalle || err.response?.data?.error || err.message || "Error inesperado.");
      setModalTitle("Error");
      setModalType("error");
      setShowModal(true);
    }
  };

  const handleChange = (e) => {
    setBusqueda({ ...busqueda, [e.target.name]: e.target.value });
  };

  // Verifica si la foto existe en el servidor
  const verificarExistenciaFoto = async (filename) => {
    try {
      const response = await api.get(`/check-photo/${filename}`);
      return response.data.exists;
    } catch (error) {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResultados([]);
    setLoading(true);
    try {
      // Buscar solo por No. Afiliación
      const noaf = (busqueda.noafiliacion || '').trim();
      if (!noaf && (busqueda.dpi || '').trim()) {
        setError('La búsqueda por DPI no está soportada en esta pantalla. Use No. Afiliación.');
        setLoading(false);
        return;
      }
      if (!noaf) {
        setError('Debe ingresar No. Afiliación');
        setLoading(false);
        return;
      }
      try {
        const response = await api.get(`/consulta_pacientes_formularios/${noaf}`);
        if (response.data) {
          const idEstado = Number(response.data.idestado ?? response.data.id_estado);
          const estadoTexto = (response.data.estado_descripcion || response.data.estado || '').toString().toLowerCase();
          const esEgresado = idEstado === 3 || estadoTexto.includes('egres');
          const esFallecido = estadoTexto.includes('falle') || estadoTexto.includes('defunc');
          // Reingreso (id 4) debe ser permitido
          if (esEgresado || esFallecido) {
            setModalMessage('El paciente no está activo');
            setModalTitle('Paciente no activo');
            setModalType('error');
            setShowModal(true);
            setResultados([]);
            setNuevoPaciente({ ...nuevoPaciente, noafiliacion: '' });
          } else {
            // Procesar foto
            let paciente = response.data;
            if (paciente.urlfoto) {
              const filename = paciente.urlfoto.replace(/^.*[\\\/]/, '');
              const fotoExists = await verificarExistenciaFoto(filename);
              paciente.urlfoto = fotoExists ? `/fotos/${filename}` : null;
            } else {
              paciente.urlfoto = null;
            }
            setResultados([paciente]);
          }
        } else {
          setResultados([]);
          setModalMessage('Paciente no encontrado');
          setModalTitle('Sin resultados');
          setModalType('error');
          setShowModal(true);
        }
      } catch (err) {
        setResultados([]);
        setModalMessage('No se encontraron coincidencias');
        setModalTitle('Sin resultados');
        setModalType('error');
        setShowModal(true);
      } finally {
        setLoading(false);
        setBusqueda({ dpi: '', noafiliacion: '' });
      }
    } catch (err) {
      setError(err.message || "Error inesperado");
    }
  };

  // Handler para agregar paciente por número de afiliación
  const handleAgregarPaciente = async () => {
    if (!nuevoPaciente.noafiliacion) return;
    try {
      // Lógica de búsqueda de paciente (AJAX)
      const response = await api.get(`/consulta_pacientes_formularios/${nuevoPaciente.noafiliacion}`);
      const paciente = response.data;
      if (!paciente) {
        setModalTitle('No encontrado');
        setModalMessage('No se encontró ningún paciente con ese número de afiliación.');
        setModalType('error');
        setShowModal(true);
        return;
      }
      // Bloquear pacientes Egresados o Fallecidos (por id, descripción textual o datos de egreso)
      {
        const estadoTexto = (paciente.estado_descripcion || paciente.estado || paciente.estadoPaciente || '').toString().toLowerCase();
        const idEstadoRaw = paciente.idestado ?? paciente.id_estado ?? paciente.estado_id;
        const idEstado = Number(idEstadoRaw);
        const esEgresado = idEstado === 3 || estadoTexto.includes('egres');
        const esFallecido = estadoTexto.includes('falle') || estadoTexto.includes('defunc');
        // Importante: permitir Reingreso (id 4) y no bloquear por egreso histórico
        if (esEgresado || esFallecido) {
          setModalTitle('Paciente no disponible');
          setModalMessage('El paciente está Egresado o Fallecido y no puede agregarse.');
          setModalType('error');
          setShowModal(true);
          setNuevoPaciente({ ...nuevoPaciente, noafiliacion: '' });
          return;
        }
      }
      if (pacientesCargados.some(p => p.noafiliacion === paciente.noafiliacion)) {
        setModalTitle('Ya agregado');
        setNuevoPaciente({ ...nuevoPaciente, noafiliacion: '' });
        return;
      }
      // Buscar la descripción de la jornada
      let jornadaDescripcion = '';
      if (paciente.idjornada && jornadas && Array.isArray(jornadas)) {
        const jor = jornadas.find(j => j.idjornada === paciente.idjornada);
        if (jor) jornadaDescripcion = jor.descripcion;
      }
      setPacientesCargados([
        ...pacientesCargados,
        {
          noafiliacion: paciente.noafiliacion,
          dpi: paciente.dpi,
          nombre: `${paciente.primernombre || ''} ${paciente.segundonombre || ''} ${paciente.otrosnombres || ''} ${paciente.primerapellido || ''} ${paciente.segundoapellido || ''} ${paciente.apellidocasada || ''}`.replace(/ +/g, ' ').trim(),
          sexo: paciente.sexo,
          jornada: jornadaDescripcion
        }
      ]);
      setNuevoPaciente({ ...nuevoPaciente, noafiliacion: '' });
    } catch (err) {
      setModalTitle('Error');
      setModalMessage('No se pudo buscar el paciente.');
      setModalType('error');
      setShowModal(true);
    }
  };

  return (
    <React.Fragment>
      <CustomModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
      />

      <div className="w-full px-4 md:px-8 py-6">
        <div className="w-full">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md">
            <div className="p-6">
              <div className="w-full text-center mb-6">
                <div className="flex items-center justify-center gap-6 flex-wrap">
                  <img
                    src={logoClinica}
                    alt="Logo Clínica"
                    className="h-[180px] max-w-[320px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                  />
                  <span className="text-3xl font-bold text-green-800 dark:text-white mb-4">
                    Registro de Formularios
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>



        <div className="bg-white dark:bg-slate-900 p-6 rounded-b-xl">
          {/* --- Formulario de registro de formulario (arriba) --- */}
          <Form onSubmit={handleRegistroFormularioSubmit} className="mb-6">
            <div className="mb-6">
              {/* --- Tabla de pacientes cargados --- */}
              <div className="flex items-center gap-2 flex-wrap">
                <Form.Control
                  placeholder="Número de Afiliación"
                  type="text"
                  name="noafiliacion"
                  value={nuevoPaciente.noafiliacion}
                  onChange={e => setNuevoPaciente({ ...nuevoPaciente, noafiliacion: e.target.value })}
                  className="text-lg px-4 py-2 w-56 rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAgregarPaciente}
                  className="bg-green-700 hover:bg-green-800 text-white text-base font-semibold py-2 px-5 rounded"
                >
                  Agregar Paciente
                </button>
                <button
                  type="button"
                  onClick={() => setPacientesCargados([])}
                  className="bg-red-600 hover:bg-red-700 text-white text-base font-semibold py-2 px-5 rounded"
                >
                  Limpiar Tabla
                </button>
              </div>

              <table className="w-full mt-4 table-auto border border-gray-300 dark:border-gray-600 text-sm text-center bg-white dark:bg-slate-800">
                <thead className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">
                  <tr>
                    <th className="p-2 border dark:border-gray-600">No. Afiliación</th>
                    <th className="p-2 border dark:border-gray-600">DPI</th>
                    <th className="p-2 border dark:border-gray-600">Nombre</th>
                    <th className="p-2 border dark:border-gray-600">Sexo</th>
                    <th className="p-2 border dark:border-gray-600">Jornada</th>
                    <th className="p-2 border dark:border-gray-600">Eliminar</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientesCargados.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-gray-500 py-3">No hay pacientes cargados</td>
                    </tr>
                  ) : (
                    pacientesCargados.map((p, idx) => (
                      <tr key={p.noafiliacion + '-' + p.dpi + '-' + idx} className="border-t dark:border-gray-600">
                        <td className="p-2 border dark:border-gray-600">{p.noafiliacion}</td>
                        <td className="p-2 border dark:border-gray-600">{p.dpi}</td>
                        <td className="p-2 border dark:border-gray-600">{p.nombre}</td>
                        <td className="p-2 border dark:border-gray-600">{p.sexo}</td>
                        <td className="p-2 border dark:border-gray-600">{p.jornada}</td>
                        <td className="p-2 border dark:border-gray-600">
                          <button
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

            <div className="flex flex-col gap-6">
              {/* Primera fila: Número de Formulario + Sesiones Autorizadas */}
              <div className="flex flex-col md:flex-row md:gap-6">
                {/* Número de Formulario */}
                <div className="w-full md:w-1/2">
                  <Form.Group controlId="formNumeroFormulario">
                    <Form.Label className="text-lg dark:text-white">Número de Formulario</Form.Label>
                    <Form.Control
                      type="text"
                      name="numeroformulario"
                      value={formData.numeroformulario}
                      onChange={handleRegistroFormularioInputChange}
                      placeholder="Ingrese el número de formulario"
                      required
                      className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800 dark:text-white px-4 py-2"
                    />
                  </Form.Group>
                </div>

                {/* Sesiones autorizadas */}
                <div className="w-full md:w-1/2 mt-6 md:mt-0">
                  <Form.Group controlId="formSesionesAutorizadasMes">
                    <Form.Label className="text-lg dark:text-white">Sesiones autorizadas por mes</Form.Label>
                    <Form.Control
                      type="number"
                      name="sesionesautorizadasmes"
                      value={formData.sesionesautorizadasmes}
                      onChange={(e) => {
                        const digits = (e.target.value ?? '').replace(/\D+/g, '');
                        setFormData(prev => ({ ...prev, sesionesautorizadasmes: digits }));
                      }}
                      placeholder="Ingrese cantidad de sesiones"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      onKeyDown={(e) => {
                        // Bloquear signos, notación científica y separadores decimales
                        if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E' || e.key === '.' || e.key === ',') {
                          e.preventDefault();
                        }
                      }}
                      onPaste={(e) => {
                        const t = (e.clipboardData.getData('text') || '').trim();
                        if (/[^0-9]/.test(t)) e.preventDefault();
                      }}
                      required
                      className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800 dark:text-white px-4 py-2"
                    />
                  </Form.Group>
                </div>
              </div>

              {/* Segunda fila: Período de prestación */}
              <div className="w-full">
                <Form.Group controlId="formPeriodoPrestServicios">
                  <Form.Label className="text-lg dark:text-white">Período de prestación de servicios</Form.Label>
                  <div className="flex flex-col sm:flex-row gap-2 mt-1">
                    <Form.Control
                      type="date"
                      name="periodoDel"
                      value={formData.periodoDel || ''}
                      onChange={handleRegistroFormularioInputChange}
                      required
                      className="w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800 dark:text-white px-3 py-2"
                    />
                    <span className="self-center font-semibold dark:text-white">al</span>
                    <Form.Control
                      type="date"
                      name="periodoHasta"
                      value={formData.periodoHasta || ''}
                      min={formData.periodoDel || undefined}
                      onChange={handleRegistroFormularioInputChange}
                      required
                      disabled={!formData.periodoDel}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800 dark:text-white px-3 py-2"
                    />
                  </div>
                </Form.Group>
              </div>
            </div>




            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-700 hover:bg-green-800 text-white text-lg font-semibold px-8 py-2 rounded mr-4"
              >
                {loading ? 'Guardando...' : 'Guardar Formulario'}
              </button>
              <button
                type="button"
                onClick={handleLimpiarRegistroFormulario}
                className="bg-red-600 hover:bg-red-700 text-white text-lg font-semibold px-8 py-2 rounded"
              >
                Limpiar
              </button>
            </div>
          </Form>

          {/* --- Fin formulario búsqueda paciente --- */}
          {/* Mostrar datos del paciente primero y luego el formulario, solo si hay resultados */}
          {resultados.length > 0 && resultados.map((p) => (
            <React.Fragment key={p.idpaciente || p.dpi}>
              {/* Bloque superior: foto y datos grandes y centrados */}
              <div style={{
                display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: '3rem', marginBottom: '2.5rem', border: '1px solid #eee', borderRadius: 16, padding: 32,
                boxShadow: '0 4px 16px rgba(0,0,0,0.07)', background: '#fff', width: '100%', marginLeft: 0, marginRight: 0, maxWidth: 'none', minHeight: 380
              }}>
                {/* Foto a la izquierda */}
                <div style={{
                  width: '340px', height: '340px', borderRadius: '16px', overflow: 'hidden',
                  border: '2px solid #bdbdbd', boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                  backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <img
                    alt="Foto del paciente"
                    src={p.urlfoto ? `http://localhost:3001/fotos/${p.urlfoto.split(/[\\\/]/).pop()}?${Date.now()}` : require("assets/img/default-avatar.png")}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = require("assets/img/default-avatar.png");
                    }}
                  />
                </div>
                {/* Datos a la derecha */}
                <div style={{ textAlign: 'left', flex: 1, paddingLeft: 32 }}>
                  <h2 style={{ marginBottom: 18, fontWeight: 700, fontSize: 32, color: '#2d6a4f', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {`${p.primernombre || ''} ${p.segundonombre || ''} ${p.otrosnombres || ''} ${p.primerapellido || ''} ${p.segundoapellido || ''} ${p.apellidocasada || ''}`.replace(/ +/g, ' ').trim()}
                  </h2>
                  <div style={{ display: 'flex', gap: 32, fontSize: 22 }}>
                    {/* Columna 1 */}
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>No. Afiliación:</b> {p.noafiliacion}</div>
                      <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>DPI:</b> {p.dpi}</div>
                      <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>No. Paciente Proveedor:</b> {p.nopacienteproveedor || ''}</div>
                      <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Fecha de Nacimiento:</b> {p.fechanacimiento ? new Date(p.fechanacimiento).toLocaleDateString() : ''}</div>
                      <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Edad:</b> {calcularEdad(p.fechanacimiento)}</div>
                    </div>
                    {/* Columna 2 */}
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Sexo:</b> {p.sexo || ''}</div>
                      <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Dirección:</b> {p.direccion || ''}</div>
                      <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Fecha Egreso:</b> {p.fechaegreso ? new Date(p.fechaegreso).toLocaleDateString() : ''}</div>
                      <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Causa:</b> {p.descripcionEgreso}</div>
                      <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Causa Egreso:</b> {p.descripcionEgreso || ''}</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Formulario de registro abajo, ocupando todo el ancho */}
              <div style={{ maxWidth: 1100, margin: '0 auto', marginBottom: 40 }}>
                <Form onSubmit={handleRegistroFormularioSubmit} className="mb-3">
                  <div style={{ display: 'flex', gap: 32 }}>
                    {/* Columna izquierda */}
                    <div style={{ flex: 1 }}>
                      <Form.Group controlId="formNumeroFormulario">
                        <Form.Label style={{ fontSize: 18 }}>Número de Formulario</Form.Label>
                        <Form.Control
                          type="text"
                          name="numeroformulario"
                          value={formData.numeroformulario}
                          onChange={handleRegistroFormularioInputChange}
                          placeholder="Ingrese el número de formulario"
                          required
                        />
                      </Form.Group>
                      <Form.Group controlId="formPeriodoPrestServicios" style={{ marginTop: 16 }}>
                        <Form.Label style={{ fontSize: 18 }}>Período Prestación de Servicios</Form.Label>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <Form.Control
                            type="date"
                            name="periodoDel"
                            value={formData.periodoDel || ''}
                            onChange={handleRegistroFormularioInputChange}
                            required
                          />
                          <span style={{ alignSelf: 'center' }}>a</span>
                          <Form.Control
                            type="date"
                            name="periodoHasta"
                            value={formData.periodoHasta || ''}
                            onChange={handleRegistroFormularioInputChange}
                            required
                          />
                        </div>
                      </Form.Group>
                      <Form.Group controlId="formSesionesAutorizadasMes" style={{ marginTop: 16 }}>
                        <Form.Label style={{ fontSize: 18 }}>Sesiones Autorizadas por Mes</Form.Label>
                        <Form.Control
                          type="number"
                          name="sesionesautorizadasmes"
                          value={formData.sesionesautorizadasmes}
                          onChange={handleRegistroFormularioInputChange}
                          placeholder="Ingrese cantidad de sesiones"
                          min="0"
                          required
                        />
                      </Form.Group>
                    </div>
                    {/* Columna derecha */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'stretch' }}>
                      <Form.Group controlId="formObservaciones" style={{ flex: 1, marginBottom: 24 }}>
                        <Form.Label style={{ fontSize: 18 }}>Observaciones</Form.Label>
                        <Form.Control
                          as="textarea"
                          name="observaciones"
                          value={formData.observaciones || ''}
                          onChange={handleRegistroFormularioInputChange}
                          rows={7}
                          placeholder="Ingrese observaciones"
                        />
                      </Form.Group>
                      <div style={{ alignSelf: 'flex-end' }}>
                        <Button
                          type="submit"
                          style={{
                            backgroundColor: '#2d6a4f',
                            borderColor: '#2d6a4f',
                            color: '#fff',
                            fontSize: 20,
                            padding: '10px 32px',
                            fontWeight: 600,
                            boxShadow: '0 2px 8px rgba(44, 106, 79, 0.10)',
                            marginRight: 16
                          }}
                        >
                          Guardar Formulario
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          style={{
                            fontSize: 20,
                            padding: '10px 32px',
                            fontWeight: 600,
                            backgroundColor: '#dc3545',
                            borderColor: '#dc3545',
                            color: '#fff'
                          }}
                          onClick={handleLimpiarRegistroFormulario}
                        >
                          Limpiar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Form>
              </div>
              <Row>
                <Col md={12}>
                  <Form.Label style={{ fontSize: 18, marginTop: 10 }}>Pacientes</Form.Label>
                  <table className="table table-bordered" style={{ background: '#fff', marginBottom: 20 }}>
                    <thead>
                      <tr>
                        <th>No. Afiliación</th>
                        <th>DPI</th>
                        <th>Nombre</th>
                        <th>Sexo</th>
                        <th>Jornada</th>
                        <th>Eliminar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: '#888' }}>No hay pacientes agregados</td>
                        </tr>
                      ) : (
                        resultados.map((p, idx) => (
                          <tr key={p.idpaciente || p.dpi || idx}>
                            <td>{p.noafiliacion}</td>
                            <td>{p.dpi}</td>
                            <td>{`${p.primernombre || ''} ${p.segundonombre || ''} ${p.otrosnombres || ''} ${p.primerapellido || ''} ${p.segundoapellido || ''} ${p.apellidocasada || ''}`.replace(/ +/g, ' ').trim()}</td>
                            <td>{p.sexo}</td>
                            <td>{p.jornada || ''}</td>
                            <td>
                              <Button variant="danger" size="sm" onClick={() => {
                                setResultados(resultados.filter((_, i) => i !== idx));
                              }}>
                                Eliminar
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </Col>
              </Row>
            </React.Fragment>
          ))}
          {error && <Alert variant="danger">{error}</Alert>}


        </div>
      </div>

    </React.Fragment>
  );
};

export default RegistroFormularios;
