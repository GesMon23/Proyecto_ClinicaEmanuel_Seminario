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


  const handleBuscarAfiliado = async () => {
    setBusquedaError('');
    setPaciente(null);
    if (!form.noafiliacion) {
      setBusquedaError('Ingrese un número de afiliación.');
      return;
    }
    try {
      const response = await api.get(`/pacientes/${form.noafiliacion}`);
      if (response.data && response.data.primernombre) {
        // Verificar si el paciente está egresado (idestado === 3)
        if (response.data.idestado === 3) {
          setBusquedaError('El paciente está egresado y no puede ser referenciado.');
          setPaciente(null);
          return;
        }
        const nombreCompleto = [
          response.data.primernombre,
          response.data.segundonombre,
          response.data.otrosnombres,
          response.data.primerapellido,
          response.data.segundoapellido,
          response.data.apellidocasada
        ].filter(Boolean).join(' ');
        setPaciente(nombreCompleto);
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
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState(false);
  const [paciente, setPaciente] = useState(null);
  const [busquedaError, setBusquedaError] = useState('');

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setMensaje('');
    setError(false);
    try {
      // Validación básica
      if (!form.noafiliacion || !form.FechaReferencia || !form.MotivoTraslado || !form.idMedico || !form.EspecialidadReferencia) {
        setMensaje('Todos los campos son obligatorios.');
        setError(true);
        setLoading(false);
        return;
      }
      // Construir payload con nombres de campos correctos
      const payload = {
        noafiliacion: Number(form.noafiliacion),
        fechareferencia: form.FechaReferencia,
        motivotraslado: form.MotivoTraslado,
        idmedico: Number(form.idMedico),
        especialidadreferencia: form.EspecialidadReferencia
      };
      const response = await api.post('/api/referencias', payload);
      if (response.data && response.data.success) {
        setMensaje('Referencia registrada exitosamente.');
        setError(false);
        setForm({
          noafiliacion: '',
          FechaReferencia: '',
          MotivoTraslado: '',
          idMedico: '',
          EspecialidadReferencia: ''
        });
      } else {
        setMensaje(response.data?.detail || 'Error al registrar la referencia.');
        setError(true);
      }
    } catch (err) {
      setMensaje(err.response?.data?.detail || err.message || 'Error inesperado.');
      setError(true);
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
            <div className="mt-4 text-center text-[22px] font-semibold rounded-xl py-3 px-2 bg-green-100 text-green-900 border-[1.5px] border-green-800">
              {paciente}
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
                    type="number"
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
                  {medicos.map((medico) => (
                    <option key={medico.idmedico} value={medico.idmedico}>
                      {medico.nombrecompleto}
                    </option>
                  ))}
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

            
            {mensaje && (
              <div
                className={`mt-6 px-4 py-3 text-center text-[22px] font-semibold rounded-xl border ${error
                    ? 'bg-red-100 text-red-700 border-red-700'
                    : 'bg-green-100 text-green-900 border-green-800'
                  }`}
              >
                {mensaje}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>

  );
};

export default RegistroReferencias;
