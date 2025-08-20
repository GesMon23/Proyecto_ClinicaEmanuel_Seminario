import React, { useState, useEffect } from "react";
import logoClinica from "@/assets/logoClinica2.png"
import { Card, Form, Button, Alert, Table, Spinner, Row, Col } from 'react-bootstrap';
import api from '../config/api';
import CustomModal from '@/components/CustomModal.jsx';

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

const ReingresoPacientes = (props) => {
  const [busqueda, setBusqueda] = useState({ dpi: '', noafiliacion: '' });
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState('info');

  // Estados para el formulario de reingreso
  const [formData, setFormData] = useState({
    numeroformulario: '',
    sesionesautorizadasmes: '',
    periodoDel: '',
    periodoHasta: '',
    observaciones: ''
  });

  const handleReingresoInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Limpia el formulario de reingreso y los datos del paciente
  const handleLimpiarReingreso = () => {
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

  const handleReingresoSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!resultados.length) {
      setError("Debe buscar y seleccionar un paciente");
      return;
    }
    const paciente = resultados[0];
    try {
      // Validaciones básicas
      if (!formData.numeroformulario || !formData.sesionesautorizadasmes || !formData.periodoDel || !formData.periodoHasta) {
        setError("Todos los campos son obligatorios");
        return;
      }
      // Preparar datos para el backend
      const payload = {
        primerNombre: paciente.primernombre || '',
        segundoNombre: paciente.segundonombre || '',
        primerApellido: paciente.primerapellido || '',
        segundoApellido: paciente.segundoapellido || '',
        numeroformulario: formData.numeroformulario,
        sesionesautorizadasmes: formData.sesionesautorizadasmes,
        fechainicioperiodo: formData.periodoDel,
        fechafinperiodo: formData.periodoHasta,
        observaciones: formData.observaciones || '',
        desdeReingreso: true
      };
      const response = await api.put(`/pacientes/${paciente.noafiliacion}`, payload);
      if (response.data && response.data.success) {
        setModalMessage("Reingreso guardado exitosamente.");
        setModalTitle("Éxito");
        setModalType("success");
        setShowModal(true);
        handleLimpiarReingreso();
      } else {
        setModalMessage(response.data?.detail || "Error al guardar el reingreso.");
        setModalTitle("Error");
        setModalType("error");
        setShowModal(true);
      }
    } catch (err) {
      setModalMessage(err.response?.data?.detail || err.message || "Error inesperado.");
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
      let params = {};
      if (busqueda.dpi) params.dpi = busqueda.dpi;
      if (busqueda.noafiliacion) params.noafiliacion = busqueda.noafiliacion;
      if (!params.dpi && !params.noafiliacion) {
        setError('Debe ingresar DPI o No. Afiliación');
        setLoading(false);
        return;
      }
      const { data } = await api.get('/api/pacientes/reingreso', { params });

      // Procesar fotos como en ConsultaPacientes
      const resultadosConFoto = await Promise.all(
        data.map(async (p) => {
          if (p.urlfoto) {
            const filename = p.urlfoto.replace(/^.*[\\\/]/, '');
            const fotoExists = await verificarExistenciaFoto(filename);
            if (fotoExists) {
              return { ...p, urlfoto: `/fotos/${filename}` };
            }
          }
          return { ...p, urlfoto: null };
        })
      );
      const soloReingreso = resultadosConFoto.filter(p => p.idestado === 3 && p.idcausa !== 1);
      setResultados(soloReingreso);
      if (resultadosConFoto.some(p => p.idestado === 3 && p.idcausa === 1)) {
        setModalMessage('El paciente está fallecido.');
        setModalTitle('Paciente fallecido');
        setModalType('error');
        setShowModal(true);
      } else if (resultadosConFoto.length > 0 && soloReingreso.length === 0) {
        setModalMessage('El paciente ya está activo y no es elegible para reingreso.');
        setModalTitle('Paciente activo');
        setModalType('error');
        setShowModal(true);
      }
      if (resultadosConFoto.length === 0) {
        // Si no hay resultados, buscar si existe el paciente aunque no cumpla los filtros
        let responseAlt = null;
        try {
          if (params.dpi) {
            responseAlt = await api.get(`/pacientes/dpi/${params.dpi}`);
          } else if (params.noafiliacion) {
            responseAlt = await api.get(`/pacientes/${params.noafiliacion}`);
          }
          if (responseAlt && responseAlt.data) {
            // Verificar si está fallecido
            const paciente = Array.isArray(responseAlt.data) ? responseAlt.data[0] : responseAlt.data;
            if (paciente.idestado === 3 && paciente.idcausa === 1) {
              setModalMessage('El paciente está fallecido.');
              setModalTitle('Paciente fallecido');
              setModalType('error');
              setShowModal(true);
            } else {
              // El paciente existe pero no cumple el filtro de reingreso
              setModalMessage('El paciente está activo y no es elegible para reingreso.');
              setModalTitle('Paciente activo');
              setModalType('error');
              setShowModal(true);
            }
          } else {
            setModalMessage('Paciente no encontrado');
            setModalTitle('Paciente no encontrado');
            setModalType('error');
            setShowModal(true);
          }
        } catch (error) {
          setModalMessage('Paciente no encontrado');
          setModalTitle('Paciente no encontrado');
          setModalType('error');
          setShowModal(true);
        }
      }
    } catch (err) {
      setError('Error al buscar paciente.');
    } finally {
      setLoading(false);
      setBusqueda({ dpi: '', noafiliacion: '' });
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
              <form onSubmit={handleSubmit} className="mb-6">
                <div className="w-full text-center mb-6">
                  <div className="flex items-center justify-center gap-6 flex-wrap">
                    <img
                      src={logoClinica}
                      alt="Logo Clínica"
                      className="h-[180px] max-w-[320px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                    />
                    <span className="text-3xl font-bold text-green-800 dark:text-white mb-4">
                      {props.customTitle || 'Reingreso Pacientes'}
                    </span>
                  </div>
                  <hr className="mt-4 border-gray-300 dark:border-gray-600" />
                </div>

                <div className="flex justify-center">
                  <div className="w-full max-w-md mb-4">
                    <input
                      placeholder="Número de Afiliación"
                      type="text"
                      name="noafiliacion"
                      value={busqueda.noafiliacion}
                      onChange={handleChange}
                      className="w-full text-lg px-4 py-2 mb-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:bg-slate-800 dark:text-white"
                    />
                    <input
                      placeholder="DPI"
                      type="text"
                      name="dpi"
                      value={busqueda.dpi}
                      onChange={handleChange}
                      className="w-full text-lg px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-36 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-base font-semibold rounded-md shadow transition duration-200 disabled:opacity-70"
                  >
                    {loading ? 'Buscando...' : 'Buscar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBusqueda({ dpi: '', noafiliacion: '' });
                      setResultados([]);
                      setError('');
                    }}
                    className="w-36 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-base font-semibold rounded-md shadow transition duration-200"
                  >
                    Limpiar
                  </button>

                </div>
              </form>
            </div>
          </div>
        </div>
      </div>


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
                  <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Causa:</b> {p.causaegreso_descripcion || p.descripcionEgreso || ''}</div>
                </div>
              </div>
            </div>
          </div>
          {/* Formulario de reingreso abajo, ocupando todo el ancho */}
          <div style={{ maxWidth: 1100, margin: '0 auto', marginBottom: 40 }}>
            <Form onSubmit={handleReingresoSubmit} className="mb-3">
              <div style={{ display: 'flex', gap: 32 }}>
                {/* Columna izquierda */}
                <div style={{ flex: 1 }}>
                  <Form.Group controlId="formNumeroFormulario">
                    <Form.Label style={{ fontSize: 18 }}>Número de Formulario</Form.Label>
                    <Form.Control
                      type="text"
                      name="numeroformulario"
                      value={formData.numeroformulario}
                      onChange={handleReingresoInputChange}
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
                        onChange={handleReingresoInputChange}
                        required
                      />
                      <span style={{ alignSelf: 'center' }}>a</span>
                      <Form.Control
                        type="date"
                        name="periodoHasta"
                        value={formData.periodoHasta || ''}
                        min={formData.periodoDel || undefined}
                        onChange={handleReingresoInputChange}
                        required
                        disabled={!formData.periodoDel}
                      />
                      {formData.periodoDel && formData.periodoHasta && formData.periodoHasta < formData.periodoDel && (
                        <div style={{ color: 'red', fontSize: 14, marginTop: 4 }}>
                          La fecha fin no puede ser anterior a la fecha inicio.
                        </div>
                      )}
                    </div>
                  </Form.Group>
                  <Form.Group controlId="formSesionesAutorizadasMes" style={{ marginTop: 16 }}>
                    <Form.Label style={{ fontSize: 18 }}>Sesiones Autorizadas por Mes</Form.Label>
                    <Form.Control
                      type="number"
                      name="sesionesautorizadasmes"
                      value={formData.sesionesautorizadasmes}
                      onChange={handleReingresoInputChange}
                      placeholder="Ingrese cantidad de sesiones"
                      min="0"
                      required
                    />
                  </Form.Group>
                </div>
                {/* Columna derecha */}
                <div style={{ flex: 1 }}>
                  <Form.Group controlId="formObservaciones" style={{ flex: 1, marginBottom: 24 }}>
                    <Form.Label style={{ fontSize: 18 }}>Observaciones</Form.Label>
                    <Form.Control
                      as="textarea"
                      name="observaciones"
                      value={formData.observaciones || ''}
                      onChange={handleReingresoInputChange}
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
                      Guardar Reingreso
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
                      onClick={handleLimpiarReingreso}
                    >
                      Limpiar
                    </Button>
                  </div>
                </div>
              </div>
            </Form>
          </div>
        </React.Fragment>
      ))}
      {error && <Alert variant="danger">{error}</Alert>}


    </React.Fragment>
  );
}
export default ReingresoPacientes;
