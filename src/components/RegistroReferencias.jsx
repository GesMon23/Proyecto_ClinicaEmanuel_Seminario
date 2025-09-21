import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import api from '../config/api';
import logoClinica from "@/assets/logoClinica2.png"

const RegistroReferencias = () => {

  const handleLimpiarFormulario = () => {
    setForm({
      noafiliacion: '',
      FechaReferencia: '',
      MotivoTraslado: '',
      idMedico: '',
      EspecialidadReferencia: ''
    });
    setPaciente(null);
    setMensaje('');
    setError(false);
    setBusquedaError('');
  };


  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    if (isNaN(nacimiento.getTime())) return 0;
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mesActual = hoy.getMonth();
    const mesNacimiento = nacimiento.getMonth();
    const diaActual = hoy.getDate();
    const diaNacimiento = nacimiento.getDate();
    if (mesActual < mesNacimiento || (mesActual === mesNacimiento && diaActual < diaNacimiento)) {
      edad--;
    }
    return edad >= 0 ? edad : 0;
  };

  const handleBuscarAfiliado = async () => {
    setBusquedaError('');
    setPaciente(null);
    if (!form.noafiliacion) {
      setBusquedaError('Ingrese un número de afiliación.');
      return;
    }
    try {
      const response = await api.get(`/pacientes/${form.noafiliacion}`);
      if (response.data && response.data.primer_nombre) {
        if (response.data.id_estado === 3) {
          setBusquedaError('El paciente está egresado y no puede ser referenciado.');
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
        setBusquedaError('No se encontró el paciente con ese número de afiliación.');
      }
    } catch (err) {
      setBusquedaError('No se encontró el paciente con ese número de afiliación.');
    }
  };

  const [form, setForm] = useState({
    noafiliacion: '',
    FechaReferencia: '',
    MotivoTraslado: '',
    idMedico: '',
    EspecialidadReferencia: ''
  });
  const [medicos, setMedicos] = useState([]);

  useEffect(() => {
    async function fetchMedicos() {
      try {
        const response = await api.get('/medicos');
        setMedicos(response.data);
      } catch (error) {
        setMedicos([]);
      }
    }
    fetchMedicos();
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [paciente, setPaciente] = useState(null);
  const [busquedaError, setBusquedaError] = useState('');

  // Estado de modal (similar a Psicologia.jsx)
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showModal = (title, message, type = 'info') => {
    setModal({ isOpen: true, title, message, type });
  };

  const closeModal = () => {
    setModal({ isOpen: false, title: '', message: '', type: 'info' });
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      // Validación básica
      if (!form.noafiliacion || !form.FechaReferencia || !form.MotivoTraslado || !form.idMedico || !form.EspecialidadReferencia) {
        setError(true);
        showModal('Campos requeridos', 'Todos los campos son obligatorios.', 'error');
        setLoading(false);
        return;
      }
      // Construir payload con nombres de campos correctos
      const payload = {
        noafiliacion: String(form.noafiliacion).trim(),
        fechareferencia: form.FechaReferencia,
        motivotraslado: form.MotivoTraslado,
        idmedico: Number(form.idMedico),
        especialidadreferencia: form.EspecialidadReferencia
      };
      const response = await api.post('/api/referencias', payload);
      if (response.data && response.data.success) {
        const idRef = response?.data?.referencia?.id_referencia || '';
        showModal('Éxito', idRef ? `Referencia registrada exitosamente. ID: ${idRef}` : 'Referencia registrada exitosamente.', 'success');
        setError(false);
        setForm({
          noafiliacion: '',
          FechaReferencia: '',
          MotivoTraslado: '',
          idMedico: '',
          EspecialidadReferencia: ''
        });
        setPaciente(null);
      } else {
        setError(true);
        showModal('Error', response.data?.detail || 'Error al registrar la referencia.', 'error');
      }
    } catch (err) {
      setError(true);
      showModal('Error', err.response?.data?.detail || err.message || 'Error inesperado.', 'error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-full px-4 md:px-8 mt-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md w-full">
        <div className="p-6">
          {/* Encabezado */}
          <div className="flex flex-wrap justify-center items-center gap-6 mb-4">
            <img
              src={logoClinica}
              alt="Logo Clínica"
              className="h-[160px] max-w-[260px] object-contain rounded-xl shadow-md p-2"
            />
            <span className="text-2xl sm:text-3xl font-semibold tracking-wide text-green-800 dark:text-white">
              Registro de Referencias
            </span>
          </div>

          {/* Paciente */}
          {paciente && (
            <div className="bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-200 border border-green-700 dark:border-green-400 rounded-xl py-4 mb-2 text-center">
              <div className="text-lg font-semibold">
                <strong>Paciente:</strong> {paciente.nombre}
              </div>
              <div className="text-md mt-2">
                <strong>Edad:</strong> {paciente.edad} años | <strong>Sexo:</strong> {paciente.sexo}
              </div>
            </div>
          )}

          {busquedaError && (
            <div className="mt-4 text-red-700 bg-red-100 border border-red-400 px-4 py-2 rounded text-lg">
              {busquedaError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[18px] font-medium text-gray-800 dark:text-white mb-1">
                  No. Afiliación*
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="noafiliacion"
                    className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 dark:bg-slate-800 dark:text-white dark:border-slate-600"
                    value={form.noafiliacion}
                    onChange={handleChange}
                    required
                    placeholder="Ingrese el número de afiliación"
                    disabled={!!paciente}
                  />
                  <button
                    type="button"
                    onClick={handleBuscarAfiliado}
                    disabled={!!paciente}
                    className="bg-green-800 hover:bg-green-900 text-white font-semibold text-base px-4 py-2 rounded-md border border-green-900"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[18px] font-medium text-gray-800 dark:text-white mb-1">
                  Fecha de Referencia*
                </label>
                <input
                  type="date"
                  name="FechaReferencia"
                  className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 dark:bg-slate-800 dark:text-white dark:border-slate-600"
                  value={form.FechaReferencia}
                  onChange={handleChange}
                  required
                  disabled={!paciente}
                />
              </div>

              <div>
                <label className="block text-[18px] font-medium text-gray-800 dark:text-white mb-1">
                  ID Médico*
                </label>
                <select
                  name="idMedico"
                  className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 dark:bg-slate-800 dark:text-white dark:border-slate-600"
                  value={form.idMedico}
                  onChange={handleChange}
                  required
                  disabled={!paciente}
                >
                  <option value="">Seleccione un médico</option>
                  {medicos.map((medico) => {
                    const value = medico.idmedico ?? medico.id_medico ?? medico.id;
                    const label = medico.nombrecompleto ?? medico.nombre_completo ?? medico.nombre ?? `${value}`;
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-[18px] font-medium text-gray-800 dark:text-white mb-1">
                  Motivo de Traslado *
                </label>
                <input
                  type="text"
                  name="MotivoTraslado"
                  className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 dark:bg-slate-800 dark:text-white dark:border-slate-600"
                  value={form.MotivoTraslado}
                  onChange={handleChange}
                  required
                  maxLength={255}
                  placeholder="Ingrese el motivo de traslado"
                  disabled={!paciente}
                />
              </div>

              <div>
                <label className="block text-[18px] font-medium text-gray-800 dark:text-white mb-1">
                  Especialidad de Referencia *
                </label>
                <input
                  type="text"
                  name="EspecialidadReferencia"
                  className="focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full border rounded-md px-4 py-2 dark:bg-slate-800 dark:text-white dark:border-slate-600"
                  value={form.EspecialidadReferencia}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="Ingrese la especialidad de referencia"
                  disabled={!paciente}
                />
              </div>
            </div>


            
            <div className="flex justify-end flex-wrap gap-4">
              <button
                type="submit"
                disabled={loading || !paciente}
                className={`px-6 py-3 text-lg font-semibold rounded-md transition-colors ${loading || !paciente
                    ? 'bg-green-700 cursor-not-allowed text-white'
                    : 'bg-green-800 hover:bg-green-900 text-white border-green-900'
                  }`}
              >
                {loading ? 'Guardando...' : 'Registrar Referencia'}
              </button>
              <button
                type="button"
                disabled={!paciente}
                onClick={handleLimpiarFormulario}
                className="px-6 py-3 text-lg font-semibold rounded-md bg-red-700 hover:bg-red-800 text-white border border-red-800"
              >
                Limpiar
              </button>
            </div>

            
            {/* Modal de resultado */}
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
                      <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>
                    <div className="mb-6">
                      <p className="text-slate-700 dark:text-slate-300">{modal.message}</p>
                    </div>
                    <div className="flex justify-end">
                      <button onClick={closeModal} className={`px-4 py-2 rounded-md font-medium transition-colors ${
                        modal.type === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                        modal.type === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' :
                        'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}>
                        Aceptar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>

  );
};

export default RegistroReferencias;
