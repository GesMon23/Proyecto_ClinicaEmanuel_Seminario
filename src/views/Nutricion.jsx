import React, { useState } from 'react';
import { Row, Col, Form, Button } from "react-bootstrap";
import api from '../config/api';
import logoClinica from '@/assets/logoClinica2.png';

const Nutricion = () => {
  const [paciente, setPaciente] = useState(null);
  const [busquedaError, setBusquedaError] = useState("");
  const [noafiliacion, setNoAfiliacion] = useState("");
  const [alturaCm, setAlturaCm] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [motivoConsulta, setMotivoConsulta] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showModal = (title, message, type = 'info') => {
    setModal({ isOpen: true, title, message, type });
  };

  // Guardar resultados (validación + POST backend)
  const guardarResultados = async (e) => {
    e.preventDefault();
    if (!paciente) {
      return showModal('Campos requeridos', 'Primero busque y seleccione un paciente.', 'error');
    }
    if (!motivoConsulta) {
      return showModal('Campos requeridos', 'Seleccione el motivo de la consulta.', 'error');
    }
    const h = parseFloat(alturaCm);
    const p = parseFloat(pesoKg);
    if (!h || h <= 0 || !p || p <= 0) {
      return showModal('Campos requeridos', 'Altura y Peso deben ser mayores a 0.', 'error');
    }
    try {
      const payload = {
        no_afiliacion: noafiliacion,
        motivo_consulta: motivoConsulta,
        altura_cm: h,
        peso_kg: p,
        observaciones: observaciones || null,
        usuario_creacion: 'sistema'
      };
      const resp = await api.post('/api/nutricion/evaluacion', payload);
      if (resp.data && resp.data.informe) {
        const idInf = resp?.data?.informe?.id_informe;
        const msg = idInf
          ? `Informe de nutrición guardado exitosamente. ID: ${idInf}`
          : 'Informe de nutrición guardado exitosamente.';
        showModal('Éxito', msg, 'success');
        limpiarFormulario();
      } else {
        showModal('Información', 'Se recibió una respuesta sin detalles del informe.', 'info');
      }
    } catch (error) {
      console.error('Error al guardar nutrición:', error);
      const msg = error?.response?.data?.error || 'Error al guardar el informe de nutrición.';
      showModal('Error', msg, 'error');
    }
  };

  const closeModal = () => {
    setModal({ isOpen: false, title: '', message: '', type: 'info' });
  };

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    if (isNaN(nacimiento.getTime())) return 0;
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return Math.max(0, edad);
  };

  const buscarPaciente = async () => {
    setBusquedaError("");
    setPaciente(null);

    if (!noafiliacion) {
      showModal('Campo requerido', 'Ingrese un número de afiliación.', 'error');
      return;
    }

    try {
      const response = await api.get(`/pacientes/${noafiliacion}`);
      if (response.data && response.data.primer_nombre) {
        if (response.data.id_estado === 3) {
          showModal('Paciente no disponible', 'El paciente está egresado y no puede ser consultado.', 'error');
          setPaciente(null);
          return;
        }

        const nombreCompleto = [
          response.data.primer_nombre,
          response.data.segundo_nombre,
          response.data.otros_nombres,
          response.data.primer_apellido,
          response.data.segundo_apellido,
          response.data.apellido_casada
        ].filter(Boolean).join(' ');

        setPaciente({
          nombre: nombreCompleto,
          edad: calcularEdad(response.data.fecha_nacimiento),
          sexo: response.data.sexo
        });
      } else {
        showModal('Paciente no encontrado', 'No se encontró el paciente con ese número de afiliación.', 'error');
      }
    } catch (error) {
      showModal('Error de búsqueda', 'No se encontró el paciente con ese número de afiliación.', 'error');
    }
  };

  const limpiarFormulario = () => {
    setNoAfiliacion("");
    setPaciente(null);
    setBusquedaError("");
    setAlturaCm('');
    setPesoKg('');
    setMotivoConsulta('');
    setObservaciones('');
  };

  // Cálculo IMC y clasificación
  const calcularIMC = (alturaEnCm, pesoEnKg) => {
    const h = parseFloat(alturaEnCm);
    const p = parseFloat(pesoEnKg);
    if (!h || !p || h <= 0 || p <= 0) return null;
    const metros = h / 100;
    const imc = p / (metros * metros);
    return Math.round(imc * 100) / 100;
  };

  const clasificarIMC = (imc) => {
    if (imc == null) return '';
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidad';
  };

  return (
    <div className="w-full px-4 md:px-8">
      <div className="w-full">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md mt-8 w-full">
          <div className="p-6 min-w-[280px]">
            {/* Encabezado */}
            <div className="w-full text-center mb-6">
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <img
                  src={logoClinica}
                  alt="Logo Clínica"
                  className="h-[160px] max-w-[260px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                />
                <span className="text-3xl font-bold text-green-800 dark:text-white mb-4">
                  Nutrición
                </span>
              </div>
              <hr className="mt-4 border-gray-300 dark:border-gray-600" />
            </div>
            
            {/* Búsqueda de Paciente */}
            <Form className="space-y-6">
              {paciente && (
                <div className="bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-200 border border-green-700 dark:border-green-400 rounded-xl py-4 mb-6 text-center">
                  <div className="text-lg font-semibold">
                    <strong>Paciente:</strong> {paciente.nombre}
                  </div>
                  <div className="text-md mt-2">
                    <strong>Edad:</strong> {paciente.edad} años | <strong>Sexo:</strong> {paciente.sexo}
                  </div>
                </div>
              )}

              <Row className="mb-4">
                <Col md={12}>
                  <Form.Group>
                    <Form.Label className="font-medium dark:text-gray-300 text-lg">Búsqueda de Paciente</Form.Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Form.Control
                        type="text"
                        value={noafiliacion}
                        onChange={e => setNoAfiliacion(e.target.value)}
                        placeholder="Ingrese número de afiliación"
                        className="flex-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-gray-100"
                        style={{ flex: 2 }}
                      />
                      <Button
                        type="button"
                        className="bg-green-700 hover:bg-green-800 text-white font-semibold py-2 px-16 rounded"
                        onClick={buscarPaciente}
                      >
                        Buscar
                      </Button>
                      <Button
                        type="button"
                        className="bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-16 rounded"
                        onClick={limpiarFormulario}
                      >
                        Limpiar
                      </Button>
                    </div>
                    {busquedaError && (
                      <div className="text-red-600 dark:text-red-400 font-medium mt-2">{busquedaError}</div>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              {/* Datos Antropométricos */}
              {paciente && (
                <>
                  <hr className="my-6 border-gray-300 dark:border-gray-600" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Altura (CM)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={alturaCm}
                        onChange={e => setAlturaCm(e.target.value)}
                        placeholder="Ingrese la altura en centímetros"
                        required
                        className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Peso (KG)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={pesoKg}
                        onChange={e => setPesoKg(e.target.value)}
                        placeholder="Ingrese el peso en kilogramos"
                        required
                        className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Estado Nutricional</label>
                      <input
                        type="text"
                        readOnly
                        value={(function(){
                          const imc = calcularIMC(alturaCm, pesoKg);
                          if (imc == null) return '';
                          return `${imc} (${clasificarIMC(imc)})`;
                        })()}
                        placeholder="IMC y clasificación"
                        className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Datos de la consulta */}
                  <hr className="my-6 border-gray-300 dark:border-gray-600" />
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Motivo de Consulta</label>
                      <select
                        value={motivoConsulta}
                        onChange={e => setMotivoConsulta(e.target.value)}
                        required
                        className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Nuevo">Nuevo</option>
                        <option value="Reconsulta">Reconsulta</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Observaciones (opcional)</label>
                      <textarea
                        value={observaciones}
                        onChange={e => setObservaciones(e.target.value)}
                        rows="3"
                        placeholder="Ingrese observaciones relevantes (opcional)"
                        className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </>
              )}
              {paciente && (
                <div className="flex justify-end mt-6">
                  <Button
                    type="button"
                    className="bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 px-6 rounded shadow-md transition-colors duration-200"
                    onClick={guardarResultados}
                  >
                    Guardar Resultados
                  </Button>
                </div>
              )}
            </Form>

            {/* Modal simple */}
            {modal.isOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-semibold ${
                        modal.type === 'success' ? 'text-green-600 dark:text-green-400' :
                        modal.type === 'error' ? 'text-red-600 dark:text-red-400' :
                        'text-blue-600 dark:text-blue-400'
                      }`}>
                        {modal.title}
                      </h3>
                      <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
                    </div>
                    <div className="mb-6">
                      <p className="text-slate-700 dark:text-slate-300">{modal.message}</p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={closeModal}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${
                          modal.type === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                          modal.type === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' :
                          'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        Aceptar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Nutricion;
