import React, { useState } from 'react';
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

// Calcula la estancia en el programa desde fechaingreso hasta hoy
function calcularEstancia(fechaIngreso) {
  if (!fechaIngreso) return '';
  const partes = fechaIngreso.split('-');
  if (partes.length < 3) return '';
  const anio = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
  const dia = parseInt(partes[2], 10);
  const inicio = new Date(anio, mes, dia);
  const hoy = new Date();
  let años = hoy.getFullYear() - inicio.getFullYear();
  let meses = hoy.getMonth() - inicio.getMonth();
  let dias = hoy.getDate() - inicio.getDate();
  if (dias < 0) {
    meses--;
    dias += new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
  }
  if (meses < 0) {
    años--;
    meses += 12;
  }
  let partesStr = [];
  if (años > 0) partesStr.push(años + (años === 1 ? ' año' : ' años'));
  if (meses > 0) partesStr.push(meses + (meses === 1 ? ' mes' : ' meses'));
  if (dias > 0) partesStr.push(dias + (dias === 1 ? ' día' : ' días'));
  if (partesStr.length === 0) return 'Menos de un día';
  return partesStr.join(', ');
}



import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button
} from 'react-bootstrap';

const EgresoPacientes = () => {
  // Copia de los mismos estados y lógica de ReingresoPacientes
  const [busqueda, setBusqueda] = useState({ dpi: '', noafiliacion: '' });
  const [resultados, setResultados] = useState([]);
  const [formData, setFormData] = useState({
    causaegreso: '',
    descripcion: '',
    fechaegreso: '',
    numerocasoconcluido: '',
    observaciones: '',
    fechafallecimiento: '',
    comorbilidades: '',
    lugarfallecimiento: '',
    causafallecimiento: ''
  });
  const [causasEgreso, setCausasEgreso] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('info');

  // Cargar causas de egreso al montar el componente
  React.useEffect(() => {
    api.get('/causas-egreso')
      .then(res => setCausasEgreso(res.data))
      .catch(() => setCausasEgreso([]));
  }, []);

  const handleBusquedaChange = (e) => {
    setBusqueda({ ...busqueda, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResultados([]);
    try {
      let params = {};
      if (busqueda.dpi) params.dpi = busqueda.dpi;
      if (busqueda.noafiliacion) params.noafiliacion = busqueda.noafiliacion;
      if (!params.dpi && !params.noafiliacion) {
        setError('Debe ingresar el número de afiliación o el DPI');
        setLoading(false);
        return;
      }
      const { data } = await api.get('/api/pacientes/egreso', { params });
      if (data && data.length > 0) {
        const noActivo = data.filter(p => p.idestado === 3);
        if (noActivo.length > 0) {
          setModalMessage('El paciente no está activo');
          setModalTitle('Paciente no activo');
          setModalType('error');
          setShowModal(true);
          setResultados([]);
        } else {
          setResultados(data);
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
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLimpiarBusqueda = () => {
    setBusqueda({ dpi: '', noafiliacion: '' });
    setResultados([]);
    setError('');
  };

  const handleLimpiarEgreso = () => {
    setFormData({
      causaegreso: '',
      descripcion: '',
      fechaegreso: '',
      numerocasoconcluido: '',
      observaciones: '',
      fechafallecimiento: '',
      comorbilidades: '',
      lugarfallecimiento: '',
      causafallecimiento: ''
    });
    setResultados([]);
    setError('');
  };

  const handleEgresoSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.causaegreso || !formData.fechaegreso || !formData.numerocasoconcluido) {
      setModalMessage('Por favor, completa todos los campos obligatorios.');
      setModalTitle('Campos requeridos');
      setModalType('error');
      setShowModal(true);
      return;
    }
    try {
      // Buscar la causa seleccionada
      const causaSeleccionada = causasEgreso.find(c => String(c.idcausa) === String(formData.causaegreso));
      const esFallecimiento = causaSeleccionada && causaSeleccionada.descripcion && causaSeleccionada.descripcion.toLowerCase().includes('fallecimiento');
      const payload = {
        idestado: 3,
        idcausa: formData.causaegreso,
        causaegreso: causaSeleccionada ? causaSeleccionada.descripcion : '',
        fechaegreso: formData.fechaegreso,
        nocasoconcluido: formData.numerocasoconcluido,
        observaciones: formData.observaciones,
        desdeEgreso: true,
        // Solo enviar datos de fallecimiento si es fallecimiento
        comorbilidades: esFallecimiento ? formData.comorbilidades : null,
        fechafallecimiento: esFallecimiento ? formData.fechafallecimiento : null,
        lugarfallecimiento: esFallecimiento ? formData.lugarfallecimiento : null,
        causafallecimiento: esFallecimiento ? formData.causafallecimiento : null
      };
      const response = await api.put(`/pacientes/${resultados[0].noafiliacion}`, payload);
      if (response.data.success) {
        setModalMessage('Egreso guardado exitosamente.');
        setModalTitle('Éxito');
        setModalType('success');
        setShowModal(true);
        setResultados([]);
        setFormData({
          causaegreso: '',
          descripcion: '',
          fechaegreso: '',
          numerocasoconcluido: '',
          observaciones: '',
          fechafallecimiento: '',
          comorbilidades: '',
          lugarfallecimiento: '',
          causafallecimiento: ''
        });
      } else {
        setModalMessage('No se pudo guardar el egreso.');
        setModalTitle('Error');
        setModalType('error');
        setShowModal(true);
      }
    } catch (err) {
      setModalMessage('Error al guardar el egreso.');
      setModalTitle('Error');
      setModalType('error');
      setShowModal(true);
    }
  };

  return (
    <Container fluid>
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
              {/* Formulario de búsqueda */}
              <form onSubmit={handleSubmit} className="mb-6">
                <div className="w-full text-center mb-6">
                  <div className="flex items-center justify-center gap-6 flex-wrap">
                    <img
                      src={logoClinica}
                      alt="Logo Clínica"
                      className="h-[180px] max-w-[320px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                    />
                    <span className="text-3xl font-bold text-green-800 dark:text-white mb-4">
                      Egreso Pacientes
                    </span>
                  </div>
                  <hr className="border-t border-slate-500 dark:border-white my-4" />
                </div>
                <div className="flex justify-center">
                  <div className="w-full max-w-md mb-4">
                    <input
                      placeholder="Número de Afiliación"
                      type="text"
                      name="noafiliacion"
                      value={busqueda.noafiliacion}
                      onChange={handleBusquedaChange}
                      className="w-full text-lg px-4 py-2 mb-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:bg-slate-800 dark:text-white"
                    />
                    <input
                      placeholder="DPI"
                      type="text"
                      name="dpi"
                      value={busqueda.dpi}
                      onChange={handleBusquedaChange}
                      className="w-full text-lg px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:bg-slate-800 dark:text-white"
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
                    onClick={handleLimpiarBusqueda}
                    className="w-36 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-base font-semibold rounded-md shadow transition duration-200"
                  >
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>



        {/* Bloque de datos del paciente (idéntico a ReingresoPacientes) */}
        {resultados.length > 0 && resultados.map((p) => (
          <div key={p.noafiliacion || p.dpi}
            style={{
              display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: '3rem', marginBottom: '2.5rem', border: '1px solid #eee', borderRadius: 16, padding: 32,
              boxShadow: '0 4px 16px rgba(0,0,0,0.07)', background: '#fff', width: '100%', marginLeft: 0, marginRight: 0, maxWidth: 'none', minHeight: 380
            }}
          >
            {/* Foto a la izquierda */}
            <div style={{
              width: '340px', height: '340px', borderRadius: '16px', overflow: 'hidden',
              border: '2px solid #bdbdbd', boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
              backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <img
                alt="Foto del paciente"
                src={p.urlfoto ? `http://localhost:3001/fotos/${p.urlfoto.split(/[\\\/]/).pop()}?${Date.now()}` : require("../assets/img/default-avatar.png")}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => {
                  e.target.onerror = null;
                  e.target.src = require("../assets/img/default-avatar.png");
                }}
              />
            </div>
            {/* Datos a la derecha, estilo anterior con dos columnas */}
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
                  <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Fecha de Ingreso:</b> {p.fechaingreso ? new Date(p.fechaingreso).toLocaleDateString() : ''}</div>
                  <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Estancia en el programa:</b> {calcularEstancia && p.fechaingreso ? calcularEstancia(p.fechaingreso) : ''}</div>
                  <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Último Periodo Autorizado:</b> {p.fechainicioperiodo && p.fechafinperiodo ? `Del ${new Date(p.fechainicioperiodo).toLocaleDateString()} al ${new Date(p.fechafinperiodo).toLocaleDateString()}` : 'No registrado'}</div>
                </div>
                {/* Columna 2 */}
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Sexo:</b> {p.sexo || ''}</div>
                  <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Dirección:</b> {p.direccion || ''}</div>
                  <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Departamento:</b> {p.departamento_nombre || '-'}</div>
                  <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Estado:</b> {p.estado_descripcion || '-'}</div>
                  <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Jornada:</b> {p.jornada_descripcion || '-'}</div>
                  <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Acceso Vascular:</b> {p.acceso_descripcion || '-'}</div>
                  <div style={{ marginBottom: 10 }}><b style={{ color: '#2d6a4f' }}>Observaciones:</b> {p.observaciones || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Formulario de egreso (visible si hay paciente) */}
        {resultados.length > 0 && (
          <Card style={{ maxWidth: 1100, margin: '0 auto', marginBottom: 40, boxShadow: '0 4px 16px rgba(44,106,79,0.12)' }}>
            <Card.Body>
              <Form onSubmit={handleEgresoSubmit} className="mb-3">
                <div style={{ display: 'flex', gap: 32 }}>
                  {/* Columna izquierda */}
                  <div style={{ flex: 1 }}>
                    <Form.Group style={{ marginBottom: 24 }}>
                      <Form.Label style={{ fontSize: 18 }}>Causa del Egreso</Form.Label>
                      <Form.Control
                        as="select"
                        name="causaegreso"
                        value={formData.causaegreso}
                        onChange={handleFormChange}
                        required
                      >
                        <option value="">Seleccione una causa...</option>
                        {causasEgreso.map(c => (
                          <option key={c.idcausa} value={c.idcausa}>{c.descripcion}</option>
                        ))}
                      </Form.Control>
                      {/* Mostrar campos especiales si la causa seleccionada es Fallecimiento */}
                      {(() => {
                        const causaSeleccionada = causasEgreso.find(c => String(c.idcausa) === String(formData.causaegreso));
                        if (causaSeleccionada && causaSeleccionada.descripcion && causaSeleccionada.descripcion.toLowerCase().includes('fallecimiento')) {
                          return (
                            <>
                              <Form.Group style={{ marginTop: 16 }}>
                                <Form.Label style={{ fontSize: 18 }}>Fecha de Fallecimiento</Form.Label>
                                <Form.Control
                                  type="date"
                                  name="fechafallecimiento"
                                  value={formData.fechafallecimiento}
                                  onChange={handleFormChange}
                                  required
                                />
                              </Form.Group>
                              <Form.Group style={{ marginTop: 16 }}>
                                <Form.Label style={{ fontSize: 18 }}>Comorbilidades (opcional)</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="comorbilidades"
                                  value={formData.comorbilidades}
                                  onChange={handleFormChange}
                                  placeholder="Ingrese comorbilidades (si aplica)"
                                />
                              </Form.Group>
                              <Form.Group style={{ marginTop: 16 }}>
                                <Form.Label style={{ fontSize: 18 }}>Lugar de Fallecimiento</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="lugarfallecimiento"
                                  value={formData.lugarfallecimiento}
                                  onChange={handleFormChange}
                                  placeholder="Ingrese el lugar de fallecimiento"
                                  required
                                />
                              </Form.Group>
                              <Form.Group style={{ marginTop: 16 }}>
                                <Form.Label style={{ fontSize: 18 }}>Causa de Fallecimiento</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="causafallecimiento"
                                  value={formData.causafallecimiento}
                                  onChange={handleFormChange}
                                  placeholder="Ingrese la causa de fallecimiento"
                                  required
                                />
                              </Form.Group>
                            </>
                          );
                        }
                        return null;
                      })()}
                    </Form.Group>
                    <Form.Group style={{ marginBottom: 24 }}>
                      <Form.Label style={{ fontSize: 18 }}>Fecha del egreso</Form.Label>
                      <Form.Control
                        type="date"
                        name="fechaegreso"
                        value={formData.fechaegreso}
                        onChange={handleFormChange}
                        required
                      />
                    </Form.Group>
                  </div>
                  {/* Columna derecha */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'stretch' }}>
                    <Form.Group style={{ marginBottom: 24 }}>
                      <Form.Label style={{ fontSize: 18 }}>Descripción</Form.Label>
                      <Form.Control
                        type="text"
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={handleFormChange}
                        placeholder="Ingrese una descripción"
                      />
                    </Form.Group>
                    <Form.Group style={{ marginBottom: 24 }}>
                      <Form.Label style={{ fontSize: 18 }}>Número de caso concluido</Form.Label>
                      <Form.Control
                        type="text"
                        name="numerocasoconcluido"
                        value={formData.numerocasoconcluido}
                        onChange={handleFormChange}
                        placeholder="Ingrese el número de caso concluido"
                      />
                    </Form.Group>
                  </div>
                </div>
                <Form.Group style={{ marginBottom: 24 }}>
                  <Form.Label style={{ fontSize: 18 }}>Observaciones</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleFormChange}
                    rows={5}
                    placeholder="Ingrese observaciones"
                  />
                </Form.Group>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
                      width: 220
                    }}
                  >
                    Guardar Egreso
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
                      color: '#fff',
                      marginLeft: 16
                    }}
                    onClick={handleLimpiarEgreso}
                  >
                    Limpiar
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        )}

      </div>
    </Container>
  );
};

export default EgresoPacientes;
