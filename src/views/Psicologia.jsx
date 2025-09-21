import React, { useState } from 'react';
import { Row, Col, Form, Button, Tabs, Tab } from "react-bootstrap";
import api from '../config/api';
import logoClinica from '@/assets/logoClinica2.png';
import ConsultaPsicologia from '../components/ConsultaPsicologia';

const Psicologia = () => {
  const [tab, setTab] = useState('registro'); // 'registro' | 'consulta'
  const [paciente, setPaciente] = useState(null);
  const [busquedaError, setBusquedaError] = useState("");
  const [noafiliacion, setNoAfiliacion] = useState("");
  const [evaluacion, setEvaluacion] = useState({
    motivo_consulta: '',
    tipo_consulta: 'Consulta',
    tipo_atencion: 'Resiliente',
    pronostico_paciente: 'Intermedio',
    aplicacion_kdqol: '',
    fisico_mental: '',
    enfermedad_renal: '',
    sintomas_problemas: '',
    efectos_enfermedad: '',
    vida_diaria: '',
    observaciones: ''
  });

  // Estados para modales
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' // 'success', 'error', 'info'
  });

  // Función para mostrar modal
  const showModal = (title, message, type = 'info') => {
    setModal({
      isOpen: true,
      title,
      message,
      type
    });
  };

  // Función para cerrar modal
  const closeModal = () => {
    setModal({
      isOpen: false,
      title: '',
      message: '',
      type: 'info'
    });
  };

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return 0;
    
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    
    // Verificar que la fecha sea válida
    if (isNaN(nacimiento.getTime())) return 0;
    
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mesActual = hoy.getMonth();
    const mesNacimiento = nacimiento.getMonth();
    const diaActual = hoy.getDate();
    const diaNacimiento = nacimiento.getDate();
    
    // Si aún no ha llegado el mes de cumpleaños o si es el mes pero no el día
    if (mesActual < mesNacimiento || (mesActual === mesNacimiento && diaActual < diaNacimiento)) {
      edad--;
    }
    
    return edad >= 0 ? edad : 0;
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
    setEvaluacion({
      motivo_consulta: '',
      tipo_consulta: 'Consulta',
      tipo_atencion: 'Resiliente',
      pronostico_paciente: 'Intermedio',
      aplicacion_kdqol: '',
      fisico_mental: '',
      enfermedad_renal: '',
      sintomas_problemas: '',
      efectos_enfermedad: '',
      vida_diaria: '',
      observaciones: ''
    });
  };

  const handleEvaluacionChange = (campo, valor) => {
    setEvaluacion(prev => ({ ...prev, [campo]: valor }));
  };

  // Función para validar formato de campos KDQOL (máximo 3 enteros y 2 decimales)
  const handleKdqolChange = (campo, valor) => {
    // Permitir valor vacío
    if (valor === '') {
      setEvaluacion(prev => ({ ...prev, [campo]: '' }));
      return;
    }

    // Regex para validar máximo 3 dígitos enteros y 2 decimales
    const regex = /^\d{1,3}(\.\d{0,2})?$/;
    
    // Validar que el valor no exceda 999.99
    const numericValue = parseFloat(valor);
    
    if (regex.test(valor) && numericValue <= 999.99) {
      setEvaluacion(prev => ({ ...prev, [campo]: valor }));
    }
  };

  // Promedio KDQOL cuando las 5 áreas están presentes
  const calcularPromedioKdqol = () => {
    const valores = [
      evaluacion.fisico_mental,
      evaluacion.enfermedad_renal,
      evaluacion.sintomas_problemas,
      evaluacion.efectos_enfermedad,
      evaluacion.vida_diaria
    ].map(v => (v === '' || v == null ? NaN : parseFloat(v)));

    if (valores.some(isNaN)) return '';
    const suma = valores.reduce((acc, n) => acc + n, 0);
    const promedio = suma / 5;
    return (Math.round(promedio * 100) / 100).toFixed(2);
  };

  const guardarEvaluacion = async (e) => {
    e.preventDefault();
    
    if (!paciente || !evaluacion.motivo_consulta) {
      showModal('Campos requeridos', 'Por favor complete todos los campos obligatorios.', 'error');
      return;
    }
    
    try {
      const response = await api.post('/api/psicologia/evaluacion', {
        no_afiliacion: noafiliacion,
        ...evaluacion
      });
      
      if (response.data && response.data.message) {
        const idInf = response?.data?.informe?.id_informe;
        const msg = idInf
          ? `Evaluación psicológica guardada exitosamente. ID: ${idInf}`
          : 'Evaluación psicológica guardada exitosamente.';
        showModal('Éxito', msg, 'success');
        limpiarFormulario();
      }
    } catch (error) {
      console.error('Error al guardar evaluación:', error);
      showModal('Error', 'Error al guardar la evaluación psicológica.', 'error');
    }
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
                  Psicología
                </span>
              </div>
              <hr className="mt-4 border-gray-300 dark:border-gray-600" />
            </div>
            
            {/* Tabs */}
            <div className="flex gap-3 mb-6">
              <button
                type="button"
                onClick={() => setTab('registro')}
                className={`px-4 py-2 rounded-md font-semibold border transition-colors ${
                  tab === 'registro'
                    ? 'bg-green-800 text-white border-green-900'
                    : 'bg-white dark:bg-slate-800 text-green-800 dark:text-white border-green-800 hover:bg-green-50 dark:hover:bg-slate-700'
                }`}
              >
                Registro
              </button>
              <button
                type="button"
                onClick={() => setTab('consulta')}
                className={`px-4 py-2 rounded-md font-semibold border transition-colors ${
                  tab === 'consulta'
                    ? 'bg-green-800 text-white border-green-900'
                    : 'bg-white dark:bg-slate-800 text-green-800 dark:text-white border-green-800 hover:bg-green-50 dark:hover:bg-slate-700'
                }`}
              >
                Consulta
              </button>
            </div>

            {/* Formulario de búsqueda de pacientes */}
            {tab === 'registro' && (
            <Form onSubmit={guardarEvaluacion} className="space-y-6">
              {/* Información del paciente encontrado */}
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
              
              {/* Campo de búsqueda */}
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

              {/* Formulario de evaluación psicológica */}
              {paciente && (
                <>
                  <hr className="my-6 border-gray-300 dark:border-gray-600" />
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
                    Evaluación Psicológica
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Tipo de Consulta *</label>
                      <select
                        value={evaluacion.tipo_consulta}
                        onChange={e => handleEvaluacionChange('tipo_consulta', e.target.value)}
                        required
                        className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                      >
                        <option value="Consulta">Consulta</option>
                        <option value="Reconsulta">Reconsulta</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Motivo de Consulta *</label>
                      <input
                        type="text"
                        value={evaluacion.motivo_consulta}
                        onChange={e => handleEvaluacionChange('motivo_consulta', e.target.value)}
                        placeholder="Describa el motivo de la consulta psicológica"
                        required
                        className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Tipo de Atención *</label>
                      <select
                        value={evaluacion.tipo_atencion}
                        onChange={e => handleEvaluacionChange('tipo_atencion', e.target.value)}
                        required
                        className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                      >
                        <option value="Resiliente">Resiliente</option>
                        <option value="Inmediata">Inmediata</option>
                        <option value="Media">Media</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Aplicación de KDQOL *</label>
                      <div className="flex gap-6">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="kdqol_si"
                            name="aplicacion_kdqol"
                            value="Si"
                            checked={evaluacion.aplicacion_kdqol === 'Si'}
                            onChange={e => handleEvaluacionChange('aplicacion_kdqol', e.target.value)}
                            required
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600"
                          />
                          <label htmlFor="kdqol_si" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            Si
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="kdqol_no"
                            name="aplicacion_kdqol"
                            value="No"
                            checked={evaluacion.aplicacion_kdqol === 'No'}
                            onChange={e => handleEvaluacionChange('aplicacion_kdqol', e.target.value)}
                            required
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600"
                          />
                          <label htmlFor="kdqol_no" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            No
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Campos condicionales KDQOL */}
                  {evaluacion.aplicacion_kdqol === 'Si' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Físico y mental *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="999.99"
                          value={evaluacion.fisico_mental}
                          onChange={e => handleKdqolChange('fisico_mental', e.target.value)}
                          required={evaluacion.aplicacion_kdqol === 'Si'}
                          className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Enfermedad renal *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="999.99"
                          value={evaluacion.enfermedad_renal}
                          onChange={e => handleKdqolChange('enfermedad_renal', e.target.value)}
                          required={evaluacion.aplicacion_kdqol === 'Si' && evaluacion.fisico_mental}
                          disabled={!evaluacion.fisico_mental}
                          className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Síntomas y problemas *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="999.99"
                          value={evaluacion.sintomas_problemas}
                          onChange={e => handleKdqolChange('sintomas_problemas', e.target.value)}
                          required={evaluacion.aplicacion_kdqol === 'Si' && evaluacion.enfermedad_renal}
                          disabled={!evaluacion.enfermedad_renal}
                          className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Efectos de la enfermedad *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="999.99"
                          value={evaluacion.efectos_enfermedad}
                          onChange={e => handleKdqolChange('efectos_enfermedad', e.target.value)}
                          required={evaluacion.aplicacion_kdqol === 'Si' && evaluacion.sintomas_problemas}
                          disabled={!evaluacion.sintomas_problemas}
                          className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Vida Diaria *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="999.99"
                              value={evaluacion.vida_diaria}
                              onChange={e => handleKdqolChange('vida_diaria', e.target.value)}
                              required={evaluacion.aplicacion_kdqol === 'Si' && evaluacion.efectos_enfermedad}
                              disabled={!evaluacion.efectos_enfermedad}
                              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                            />
                          </div>
                          {/* Promedio KDQOL al lado */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Promedio KDQOL</label>
                            <input
                              type="text"
                              readOnly
                              value={calcularPromedioKdqol()}
                              placeholder="Se calcula automáticamente cuando las 5 áreas están completas"
                              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campo Pronóstico del Paciente */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Pronóstico del Paciente</label>
                    <select
                      value={evaluacion.pronostico_paciente}
                      onChange={e => handleEvaluacionChange('pronostico_paciente', e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Desfavorable">Desfavorable</option>
                      <option value="Intermedio">Intermedio</option>
                      <option value="Favorable">Favorable</option>
                    </select>
                  </div>

                  {/* Campo Observaciones opcional y último del formulario, visible en los mismos casos */}
                  {(evaluacion.aplicacion_kdqol === 'No' || (evaluacion.aplicacion_kdqol === 'Si' && evaluacion.vida_diaria)) && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Observaciones (opcional)</label>
                      <textarea
                        value={evaluacion.observaciones}
                        onChange={e => handleEvaluacionChange('observaciones', e.target.value)}
                        rows="4"
                        placeholder="Ingrese las observaciones de la evaluación psicológica (opcional)"
                        className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600"
                      />
                    </div>
                  )}


                  <div className="flex justify-end mt-6">
                    <Button
                      type="submit"
                      className="bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 px-6 rounded shadow-md transition-colors duration-200"
                    >
                      Guardar Evaluación
                    </Button>
                  </div>
                </>
              )}
            </Form>
            )}

            {tab === 'consulta' && (
              <ConsultaPsicologia />
            )}
          </div>
        </div>
      </div>

      {/* Modal personalizado */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              {/* Header del modal */}
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${
                  modal.type === 'success' ? 'text-green-600 dark:text-green-400' :
                  modal.type === 'error' ? 'text-red-600 dark:text-red-400' :
                  'text-blue-600 dark:text-blue-400'
                }`}>
                  {modal.type === 'success' && (
                    <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                  {modal.type === 'error' && (
                    <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  )}
                  {modal.type === 'info' && (
                    <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  )}
                  {modal.title}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              {/* Contenido del modal */}
              <div className="mb-6">
                <p className="text-slate-700 dark:text-slate-300">{modal.message}</p>
              </div>

              {/* Footer del modal */}
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
  );
};

export default Psicologia;
