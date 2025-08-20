import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { Container, Row, Col, Card, Form, Button, Spinner } from 'react-bootstrap';
import CustomModal from '@/components/CustomModal.jsx';
import WebcamFoto from '@/components/WebcamFoto.jsx';
import logoClinica from "@/assets/logoClinica2.png"

const formatearFechaInput = (fecha) => {
  if (!fecha) return '';
  let soloFecha = fecha.split('T')[0].split(' ')[0];
  return soloFecha;
};

const ActualizacionPacientes = () => {
  // ...
  const handleLimpiarTodo = () => {
    setPaciente(null);
    setFormData({});
    setBusqueda({ noafiliacion: '', dpi: '' });
    setEditando(false);
    setShowWebcam(false);
    setError(null);
  };
  const [busqueda, setBusqueda] = useState({ noafiliacion: '', dpi: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paciente, setPaciente] = useState(null);
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('info');
  const [departamentos, setDepartamentos] = useState([]);
  const [accesosVasculares, setAccesosVasculares] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [showWebcam, setShowWebcam] = useState(false);

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [deptosRes, accesosRes, jornadasRes] = await Promise.all([
          api.get('/departamentos'),
          api.get('/accesos-vasculares'),
          api.get('/jornadas')
        ]);
        setDepartamentos(deptosRes.data);
        setAccesosVasculares(accesosRes.data);
        setJornadas(jornadasRes.data);
      } catch (e) {
        setError('Error cargando catálogos');
      }
    };
    cargarCatalogos();
  }, []);

  const handleBusquedaChange = (e) => {
    setBusqueda({ ...busqueda, [e.target.name]: e.target.value });
  };

  const handleLimpiarBusqueda = () => {
    setBusqueda({ noafiliacion: '', dpi: '' });
  };

  const verificarExistenciaFoto = async (filename) => {
    try {
      const response = await api.get(`/check-photo/${filename}`);
      return response.data.exists;
    } catch (error) {
      return false;
    }
  };

  const buscarPaciente = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setBusqueda({ noafiliacion: '', dpi: '' }); // Limpiar campos de búsqueda después de buscar
    try {
      let response;
      if (busqueda.noafiliacion.trim() !== '') {
        response = await api.get(`/pacientes/${busqueda.noafiliacion}`);
      } else if (busqueda.dpi.trim() !== '') {
        response = await api.get(`/pacientes/dpi/${busqueda.dpi}`);
      } else {
        setShowModal(true);
        setModalMessage('Debe ingresar el número de afiliación o el DPI');
        setModalType('error');
        setLoading(false);
        return;
      }
      if (response.data) {
        let pacienteData = { ...response.data };
        // No permitir pacientes egresados (idestado=3)
        if (pacienteData.idestado === 3) {
          setPaciente(null);
          setShowModal(true);
          setModalMessage('No se puede actualizar un paciente egresado.');
          setModalType('error');
          return;
        }
        // Procesar foto como en ConsultaPacientes
        if (pacienteData.urlfoto) {
          const filename = pacienteData.urlfoto.replace(/^.*[\\\/]/, '');
          const fotoExists = await verificarExistenciaFoto(filename);
          pacienteData.urlfoto = fotoExists ? `/fotos/${filename}` : null;
        } else {
          pacienteData.urlfoto = null;
        }
        setPaciente(pacienteData);
        setFormData(pacienteData);
        setEditando(false);
      } else {
        setPaciente(null);
        setShowModal(true);
        setModalMessage('Paciente no encontrado');
        setModalType('error');
      }
    } catch (err) {
      setPaciente(null);
      setShowModal(true);
      setModalMessage('Error al buscar paciente');
      setModalType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setEditando(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGuardar = async () => {
    // Validación frontend: primernombre obligatorio
    if (!formData.primernombre || formData.primernombre.trim() === '') {
      setShowModal(true);
      setModalMessage('El campo "Primer Nombre" es obligatorio.');
      setModalType('error');
      return;
    }
    setLoading(true);
    try {
      // Nunca enviar null, solo string vacía si falta
      // Mapear a camelCase para el backend
      const payload = {
        primerNombre: formData.primernombre || '',
        segundoNombre: formData.segundonombre || '',
        primerApellido: formData.primerapellido || '',
        segundoApellido: formData.segundoapellido || '',
        numeroformulario: formData.numeroformulario || '',
        sesionesautorizadasmes: formData.sesionesautorizadasmes || '',
        fechainicioperiodo: formData.fechainicioperiodo || '',
        fechafinperiodo: formData.fechafinperiodo || '',
        observaciones: formData.observaciones || ''
        // Agrega aquí otros campos requeridos por el endpoint
      };
      // Subir la foto si es base64 (nueva captura)
      if (formData.urlfoto && formData.urlfoto.startsWith('data:image')) {
        try {
          const resFoto = await api.post(`/upload-foto/${formData.noafiliacion}`, { imagenBase64: formData.urlfoto });
          if (resFoto.data && resFoto.data.success) {
            payload.urlfoto = resFoto.data.url;
            setFormData(f => ({ ...f, urlfoto: resFoto.data.url }));
          } else {
            setShowModal(true);
            setModalMessage('Error al subir la foto.');
            setModalType('error');
            setLoading(false);
            return;
          }
        } catch (err) {
          setShowModal(true);
          setModalMessage('Error al subir la foto.');
          setModalType('error');
          setLoading(false);
          return;
        }
      }
      const response = await api.put(`/pacientes/${formData.noafiliacion}`, payload);
      if (response.data && response.data.success) {
        setShowModal(true);
        setModalMessage('Paciente actualizado exitosamente.');
        setModalType('success');
        // Volver a consultar el paciente actualizado y mostrarlo
        setTimeout(async () => {
          try {
            const response = await api.get(`/pacientes/${formData.noafiliacion}`);
            if (response.data) {
              let pacienteData = { ...response.data };
              // Procesar foto si existe
              if (pacienteData.urlfoto) {
                const filename = pacienteData.urlfoto.replace(/^.*[\\\/]/, '');
                const fotoExists = await verificarExistenciaFoto(filename);
                pacienteData.urlfoto = fotoExists ? `/fotos/${filename}` : null;
              } else {
                pacienteData.urlfoto = null;
              }
              setPaciente(pacienteData);
              setFormData(pacienteData);
              setEditando(false);
            }
          } catch (e) {
            setShowModal(true);
            setModalMessage('Error al recargar paciente actualizado.');
            setModalType('error');
          }
        }, 800);
      } else {
        setShowModal(true);
        setModalMessage(response.data?.detail || 'Error al actualizar paciente');
        setModalType('error');
      }
    } catch (err) {
      setShowModal(true);
      setModalMessage(err.response?.data?.detail || err.message || 'Error inesperado');
      setModalType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-4 md:px-8 py-6 max-w-[1000px] mx-auto">
  <CustomModal
    show={showModal}
    onClose={() => setShowModal(false)}
    title={modalType === 'success' ? 'Éxito' : 'Error'}
    message={modalMessage}
    type={modalType}
  />

  <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6 mt-8 mb-6">
    {/* Logo y título */}
    <div className="w-full lg:w-1/2 flex flex-col justify-center items-center lg:items-start mb-6 lg:mb-0">
      <img
        src={logoClinica}
        alt="Logo de la clínica"
        className="max-w-xs sm:max-w-sm mb-2"
      />
      <h2 className="font-extrabold text-[#1b4332] dark:text-white text-xl sm:text-2xl tracking-wide truncate text-center lg:text-left">
        Actualización de Pacientes
      </h2>
    </div>

    {/* Formulario de búsqueda */}
    <div className="w-full lg:w-1/2 min-w-[300px]">
      <form onSubmit={buscarPaciente} className="flex flex-col gap-4">
        <input
          type="text"
          name="noafiliacion"
          placeholder="Número de Afiliación"
          value={busqueda.noafiliacion}
          onChange={handleBusquedaChange}
          className="w-full text-lg px-4 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
        />

        <input
          type="text"
          name="dpi"
          placeholder="DPI"
          value={busqueda.dpi}
          onChange={handleBusquedaChange}
          className="w-full text-lg px-4 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800 dark:text-white"
        />

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="w-1/2 bg-[#2d6a4f] hover:bg-[#24543d] text-white font-semibold py-2 rounded shadow-sm transition"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>

          <button
            type="button"
            onClick={handleLimpiarBusqueda}
            className="w-1/2 bg-[#dc3545] hover:bg-[#b02a37] text-white font-semibold py-2 rounded shadow-sm transition"
          >
            Limpiar
          </button>
        </div>
      </form>


          {loading && <Spinner animation="border" />}
          {paciente && (
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Primer Nombre</Form.Label>
                    <Form.Control type="text" name="primernombre" value={formData.primernombre || ''} onChange={handleInputChange} disabled={!editando} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Segundo Nombre</Form.Label>
                    <Form.Control type="text" name="segundonombre" value={formData.segundonombre || ''} onChange={handleInputChange} disabled={!editando} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Primer Apellido</Form.Label>
                    <Form.Control type="text" name="primerapellido" value={formData.primerapellido || ''} onChange={handleInputChange} disabled={!editando} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Segundo Apellido</Form.Label>
                    <Form.Control type="text" name="segundoapellido" value={formData.segundoapellido || ''} onChange={handleInputChange} disabled={!editando} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Apellido Casada</Form.Label>
                    <Form.Control type="text" name="apellidocasada" value={formData.apellidocasada || ''} onChange={handleInputChange} disabled={!editando || formData.sexo !== 'Femenino'} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Sexo</Form.Label>
                    <Form.Control as="select" name="sexo" value={formData.sexo || ''} onChange={handleInputChange} disabled={!editando}>
                      <option value="">Seleccione</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </Form.Control>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Fecha de Nacimiento</Form.Label>
                    <Form.Control type="date" name="fechanacimiento" value={formatearFechaInput(formData.fechanacimiento)} onChange={handleInputChange} disabled={!editando} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>DPI</Form.Label>
                    <Form.Control type="text" name="dpi" value={formData.dpi || ''} onChange={handleInputChange} disabled={!editando} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>No. Afiliación</Form.Label>
                    <Form.Control type="text" name="noafiliacion" value={formData.noafiliacion || ''} onChange={handleInputChange} disabled />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Dirección</Form.Label>
                    <Form.Control type="text" name="direccion" value={formData.direccion || ''} onChange={handleInputChange} disabled={!editando} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Departamento</Form.Label>
                    <Form.Control as="select" name="iddepartamento" value={formData.iddepartamento || ''} onChange={handleInputChange} disabled={!editando}>
                      <option value="">Seleccione</option>
                      {departamentos.map(dep => (
                        <option key={dep.iddepartamento} value={dep.iddepartamento}>{dep.nombre}</option>
                      ))}
                    </Form.Control>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Acceso Vascular</Form.Label>
                    <Form.Control as="select" name="idacceso" value={formData.idacceso || ''} onChange={handleInputChange} disabled={!editando}>
                      <option value="">Seleccione</option>
                      {accesosVasculares.map(acc => (
                        <option key={acc.idacceso} value={acc.idacceso}>{acc.descripcion}</option>
                      ))}
                    </Form.Control>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Jornada</Form.Label>
                    <Form.Control as="select" name="idjornada" value={formData.idjornada || ''} onChange={handleInputChange} disabled={!editando}>
                      <option value="">Seleccione</option>
                      {jornadas.map(j => (
                        <option key={j.idjornada} value={j.idjornada}>{j.descripcion}</option>
                      ))}
                    </Form.Control>
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          )}
          {/* Foto al final del formulario y opción de tomar nueva foto */}
          {paciente && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 36, marginBottom: 24 }}>
              <div style={{
                width: '200px', height: '200px', borderRadius: '24px', overflow: 'hidden',
                border: '4px solid #2d6a4f', boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
                backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
              }}>
                <img
                  alt="Foto del paciente"
                  src={formData.urlfoto && formData.urlfoto.startsWith('data:')
                    ? formData.urlfoto
                    : (formData.urlfoto
                      ? `http://localhost:3001/fotos/${formData.urlfoto.split(/[\\\/]/).pop()}?${Date.now()}`
                      : require('assets/img/default-avatar.png'))}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => {
                    e.target.onerror = null;
                    e.target.src = require('assets/img/default-avatar.png');
                  }}
                />
              </div>
              <Button variant="info" onClick={() => setShowWebcam(true)} style={{ fontWeight: 600, fontSize: 17, marginBottom: 12, backgroundColor: '#007bff', borderColor: '#007bff', color: '#fff' }} disabled={!editando}>Tomar nueva foto</Button>
              {/* Botón Editar/Guardar debajo de la foto */}
              <div style={{ display: 'flex', gap: 12 }}>
                {!editando ? (
                  <>
                    <Button variant="success" onClick={handleEditClick} style={{ width: 180, backgroundColor: '#2d6a4f', borderColor: '#2d6a4f', color: '#fff' }}>Editar</Button>
                    <Button variant="danger" onClick={handleLimpiarTodo} style={{ width: 120, backgroundColor: '#dc3545', borderColor: '#dc3545', color: '#fff' }}>Limpiar</Button>
                  </>
                ) : (
                  <>
                    <Button variant="success" onClick={handleGuardar} disabled={loading} style={{ width: 220 }}>Guardar Cambios</Button>
                    <Button variant="danger" onClick={handleLimpiarTodo} style={{ width: 120, backgroundColor: '#dc3545', borderColor: '#dc3545', color: '#fff' }}>Limpiar</Button>
                  </>
                )}
              </div>
              {/* Modal flotante para la cámara */}
              {showWebcam && (
                <div style={{
                  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999,
                  background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 4px 32px rgba(0,0,0,0.18)' }}>
                    <WebcamFoto
                      onCapture={img => {
                        setShowWebcam(false);
                        setFormData(f => ({ ...f, urlfoto: img })); // Guarda la imagen base64 temporalmente
                      }}
                      onCancel={() => setShowWebcam(false)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActualizacionPacientes;
