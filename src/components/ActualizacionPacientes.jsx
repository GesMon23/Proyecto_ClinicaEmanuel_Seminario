import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { Spinner } from 'react-bootstrap';
import CustomModal from '@/components/CustomModal.jsx';
import WebcamFoto from '@/components/WebcamFoto.jsx';
import logoClinica from "@/assets/logoClinica2.png"
import defaultAvatar from "@/assets/img/default-avatar.png";
import { Edit, BrushCleaning, Save, XIcon, Camera, Image } from "lucide-react";

const formatearFechaInput = (fecha) => {
  if (!fecha) return '';
  let soloFecha = fecha.split('T')[0].split(' ')[0];
  return soloFecha;
};

const ActualizacionPacientes = () => {
  // ... (toda la lÃ³gica original permanece igual)
  const handleLimpiarTodo = () => {
    setPaciente(null);
    setFormData({});
    setBusqueda({ no_afiliacion: '', dpi: '' });
    setEditando(false);
    setShowWebcam(false);
    setError(null);
  };
  const [busqueda, setBusqueda] = useState({ no_afiliacion: '', dpi: '' });
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
          api.get('/Adepartamento'),
          api.get('/Aaccesos-vascular'),
          api.get('/Ajornada')
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
    setBusqueda({ no_afiliacion: '', dpi: '' });
  };

  const verificarExistenciaFoto = async (filename) => {
    try {
      const response = await api.get(`/Acheck-photo/${filename}`);
      return response.data.exists;
    } catch (error) {
      return false;
    }
  };

  const buscarPaciente = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let url = '/api/Apacientes/actualizacion?';
      if (busqueda.no_afiliacion.trim() !== '') {
        url += `no_afiliacion=${busqueda.no_afiliacion.trim()}`;
      } else if (busqueda.dpi.trim() !== '') {
        url += `dpi=${busqueda.dpi.trim()}`;
      } else {
        setShowModal(true);
        setModalMessage('Debe ingresar el número de afiliación o el DPI');
        setModalType('error');
        setLoading(false);
        return;
      }

      const response = await api.get(url);

      if (response.data.length > 0) {
        let pacienteData = response.data[0]; // tu backend devuelve un array
        if (pacienteData.id_estado === 3) {
          setPaciente(null);
          setShowModal(true);
          setModalMessage('No se puede actualizar un paciente egresado.');
          setModalType('error');
          return;
        }
        console.log("ðŸ“¸ url_foto crudo desde backend:", pacienteData.url_foto);
        // Procesar foto si existe
        if (pacienteData.url_foto) {
          const filename = pacienteData.url_foto.replace(/^.*[\\\/]/, '');
          pacienteData.url_foto = `/fotos/${filename}`;
        } else {
          pacienteData.url_foto = null;
        }
        console.log("âœ… url_foto procesado:", pacienteData.url_foto);
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
    // Validación de campos críticos obligatorios
    const errores = [];
    const clean = (v) => (v ?? '').toString().trim();
    const isEmpty = (v) => clean(v) === '';

    // DPI: exactamente 13 dígitos
    const dpiStr = clean(formData.dpi);
    if (!/^\d{13}$/.test(dpiStr)) {
      errores.push('DPI debe contener exactamente 13 dígitos numéricos.');
    }

    if (isEmpty(formData.primer_nombre)) errores.push('Primer Nombre es obligatorio.');
    if (isEmpty(formData.primer_apellido)) errores.push('Primer Apellido es obligatorio.');
    if (isEmpty(formData.sexo)) errores.push('Sexo es obligatorio.');
    if (isEmpty(formData.fecha_nacimiento)) errores.push('Fecha de Nacimiento es obligatoria.');
    if (isEmpty(formData.direccion)) errores.push('Dirección es obligatoria.');
    if (!formData.id_departamento) errores.push('Departamento es obligatorio.');
    if (!formData.id_jornada) errores.push('Jornada es obligatoria.');
    if (!formData.id_acceso) errores.push('Acceso Vascular es obligatorio.');

    if (errores.length > 0) {
      setShowModal(true);
      setModalMessage('Corrija los siguientes campos:\n\n- ' + errores.join('\n- '));
      setModalType('error');
      return;
    }

    setLoading(true);

    try {
      let payload = {
        dpi: formData.dpi || '',
        primer_nombre: formData.primer_nombre || '',
        segundo_nombre: formData.segundo_nombre || '',
        otros_nombres: formData.otros_nombres || '',
        primer_apellido: formData.primer_apellido || '',
        segundo_apellido: formData.segundo_apellido || '',
        apellido_casada: formData.apellido_casada || '',
        edad: formData.edad || null,
        fecha_nacimiento: formData.fecha_nacimiento || null,
        sexo: formData.sexo || '',
        direccion: formData.direccion || '',
        fecha_ingreso: formData.fecha_ingreso || null,
        id_departamento: formData.id_departamento || null,
        id_acceso: formData.id_acceso || null,
        numero_formulario_activo: formData.numero_formulario_activo || '',
        id_jornada: formData.id_jornada || null,
        sesiones_autorizadas_mes: formData.sesiones_autorizadas_mes || null
      };

      // Si se tomÃ³ una nueva foto en base64, subirla primero
      if (formData.urlfoto && formData.urlfoto.startsWith('data:image')) {
        const resFoto = await api.post(`/Aupload-foto/${formData.no_afiliacion}`, { imagenBase64: formData.urlfoto });
        if (resFoto.data && resFoto.data.success) {
          payload.url_foto = resFoto.data.url; // url devuelta por backend
          setFormData(f => ({ ...f, url_foto: resFoto.data.url }));
        } else {
          setShowModal(true);
          setModalMessage('Error al subir la foto.');
          setModalType('error');
          setLoading(false);
          return;
        }
      }

      // Hacer update del paciente
      const response = await api.put(`/Apacientes/${formData.no_afiliacion}`, payload);

      if (response.data && response.data.success) {
        setShowModal(true);
        setModalMessage('Paciente actualizado exitosamente.');
        setModalType('success');

        // Refrescar datos del paciente actualizado
        setPaciente(prev => ({ ...prev, ...payload }));
        setEditando(false);
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <CustomModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={modalType === 'success' ? 'Éxito' : 'Error'}
        message={modalMessage}
        type={modalType}
      />

      {/* Header con logo y formulario de bÃºsqueda */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden mb-8">
        <div className="p-6">
          {/* Logo y tÃ­tulo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-6 flex-wrap mb-4">
              <img
                src={logoClinica}
                alt="Logo Clínica"
                className="h-[140px] sm:h-[160px] lg:h-[180px] max-w-[280px] sm:max-w-[320px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
              />
              <h1 className="text-2xl sm:text-3xl font-bold text-green-800 dark:text-white">
                Actualización de Pacientes
              </h1>
            </div>
            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-slate-600 to-transparent"></div>
          </div>

          {/* Formulario de bÃºsqueda */}
          <form onSubmit={buscarPaciente} className="max-w-md mx-auto">
            <div className="space-y-4">
              {/* numero de afiliacion */}
              <div>
                <input
                  type="text"
                  name="no_afiliacion"
                  placeholder="Número de Afiliación"
                  value={busqueda.no_afiliacion}
                  onChange={handleBusquedaChange}
                  disabled={Boolean(busqueda.dpi)} className="w-full text-lg px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-60"
                />
              </div>
              {/* dpi */}
              <div>
                <input
                  type="text"
                  name="dpi"
                  placeholder="DPI"
                  value={busqueda.dpi}
                  onChange={(e) => {
                    const onlyDigits = (e.target.value || '').replace(/\D+/g, '').slice(0, 13);
                    setBusqueda(prev => ({ ...prev, dpi: onlyDigits }));
                  }}
                  disabled={Boolean(busqueda.no_afiliacion)} className="w-full text-lg px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-60"
                  inputMode="numeric"
                  maxLength={13}
                  pattern="\\d{13}"
                  onKeyDown={(e) => {
                    if (["e","E","+","-",".",","," "].includes(e.key)) e.preventDefault();
                  }}
                  onPaste={(e) => {
                    const t = (e.clipboardData.getData('text') || '').trim();
                    if (/[^0-9]/.test(t)) e.preventDefault();
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-700 hover:bg-green-800 disabled:opacity-70 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Spinner animation="border" size="sm" />
                      Buscando...
                    </div>
                  ) : (
                    'Buscar'
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleLimpiarBusqueda}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Formulario del paciente */}
      {paciente && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6">
            {/* TÃ­tulo del formulario */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Información del Paciente
              </h2>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${editando ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {editando ? 'Modo Edición' : 'Solo Lectura'}
                </span>
              </div>
            </div>
            {/* Botones de acciÃ³n */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-0 mb-4">
              {!editando ? (
                <>
                  <button
                    onClick={handleEditClick}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                  >
                    <Edit /> Editar
                  </button>
                  <button
                    onClick={handleLimpiarTodo}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                  >
                    <BrushCleaning /> Limpiar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleGuardar}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Spinner animation="border" size="sm" />
                        Guardando...
                      </div>
                    ) : (
                      <><Save />Guardar Cambios</>
                    )}
                  </button>
                  <button
                    onClick={handleLimpiarTodo}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                  >
                    <XIcon /> Cancelar
                  </button>
                </>
              )}
            </div>
            {/* Grid del formulario */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Primer Nombre */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Primer Nombre *
                </label>
                <input
                  type="text"
                  name="primer_nombre"
                  value={formData.primer_nombre || ''}
                  onChange={handleInputChange}
                  disabled={!editando}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${!editando
                    ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-white'
                    }`}
                />
              </div>

              {/* Segundo Nombre */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Segundo Nombre
                </label>
                <input
                  type="text"
                  name="segundo_nombre"
                  value={formData.segundo_nombre || ''}
                  onChange={handleInputChange}
                  disabled={!editando}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${!editando
                    ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-white'
                    }`}
                />
              </div>

              {/* Primer Apellido */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Primer Apellido
                </label>
                <input
                  type="text"
                  name="primer_apellido"
                  value={formData.primer_apellido || ''}
                  onChange={handleInputChange}
                  disabled={!editando}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${!editando
                    ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-white'
                    }`}
                />
              </div>

              {/* Segundo Apellido */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Segundo Apellido
                </label>
                <input
                  type="text"
                  name="segundo_apellido"
                  value={formData.segundo_apellido || ''}
                  onChange={handleInputChange}
                  disabled={!editando}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${!editando
                    ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-white'
                    }`}
                />
              </div>

              {/* Apellido Casada */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Apellido Casada
                </label>
                <input
                  type="text"
                  name="apellido_casada"
                  value={formData.apellido_casada || ''}
                  onChange={handleInputChange}
                  disabled={!editando || formData.sexo !== 'Femenino'}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${!editando || formData.sexo !== 'Femenino'
                    ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-white'
                    }`}
                />
              </div>

              {/* Otros Nombres */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Otros Nombres
                </label>
                <input
                  type="text"
                  name="otros_nombres"
                  value={formData.otros_nombres || ''}
                  onChange={handleInputChange}
                  disabled={!editando}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${!editando || formData.sexo !== 'Femenino'
                    ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-white'
                    }`}
                />
              </div>

              {/* Sexo */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Sexo
                </label>
                <select
                  name="sexo"
                  value={formData.sexo || ''}
                  onChange={handleInputChange}
                  disabled={!editando}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${!editando
                    ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-white'
                    }`}
                >
                  <option value="">Seleccione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>

              {/* Fecha de Nacimiento */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  name="fecha_nacimiento"
                  value={formatearFechaInput(formData.fecha_nacimiento)}
                  onChange={handleInputChange}
                  disabled={!editando}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${!editando
                    ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-white'
                    }`}
                />
              </div>

              {/* DPI */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  DPI
                </label>
                <input
                  type="text"
                  name="dpi"
                  value={formData.dpi || ''}
                  onChange={(e) => {
                    const onlyDigits = (e.target.value || '').replace(/\D+/g, '').slice(0, 13);
                    setFormData(prev => ({ ...prev, dpi: onlyDigits }));
                  }}
                  disabled={!editando}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${!editando
                    ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-white'
                    }`}
                  inputMode="numeric"
                  maxLength={13}
                  pattern="\\d{13}"
                  onKeyDown={(e) => {
                    if (["e","E","+","-",".",","," "].includes(e.key)) e.preventDefault();
                  }}
                  onPaste={(e) => {
                    const t = (e.clipboardData.getData('text') || '').trim();
                    if (/[^0-9]/.test(t)) e.preventDefault();
                  }}
                />
              </div>

              {/* No. AfiliaciÃ³n */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  No. Afiliación
                </label>
                <input
                  type="text"
                  name="no_afiliacion"
                  value={formData.no_afiliacion || ''}
                  onChange={handleInputChange}
                  disabled
                  className="w-full px-4 py-3 border bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-500 rounded-lg shadow-sm cursor-not-allowed"
                />
              </div>

              {/* DirecciÃ³n */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Dirección
                </label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion || ''}
                  onChange={handleInputChange}
                  disabled={!editando}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${!editando
                    ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-white'
                    }`}
                />
              </div>

              {/* Departamento */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Departamento
                </label>
                <select
                  name="id_departamento"
                  value={formData.id_departamento || ''}
                  onChange={handleInputChange}
                  disabled={!editando}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-greselect focus:border-transparent ${!editando
                    ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-white'
                    }`}
                >
                  <option value="">Seleccione</option>
                  {departamentos.map(dep => (
                    <option key={dep.id_departamento} value={dep.id_departamento}>{dep.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Acceso Vascular */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Acceso Vascular
                </label>
                <select
                  name="id_acceso"
                  value={formData.id_acceso?.toString() || ''}
                  onChange={handleInputChange}
                  disabled={!editando}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${!editando
                    ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-white'
                    }`}
                >
                  <option value="">Seleccione</option>
                  {accesosVasculares.map(acc => (
                    <option key={acc.id_acceso} value={acc.id_acceso}>{acc.descripcion}</option>
                  ))}
                </select>
              </div>

              {/* Jornada */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Jornada
                </label>
                <select
                  name="id_jornada"
                  value={formData.id_jornada?.toString() || ''}
                  onChange={handleInputChange}
                  disabled={!editando}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${!editando
                    ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-white'
                    }`}
                >
                  <option value="">Seleccione</option>
                  {jornadas.map(j => (
                    <option key={j.id_jornada} value={j.id_jornada}>{j.descripcion}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Separador */}
            <div className="border-t border-gray-200 dark:border-slate-700 my-8"></div>

            {/* SecciÃ³n de foto */}
            <div className="flex flex-col items-center space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Fotografía del Paciente
              </h3>

              {/* Contenedor de la foto */}
              <div className="relative">
                <div className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 rounded-2xl overflow-hidden border-4 border-green-600 dark:border-green-400 shadow-xl bg-gray-100 dark:bg-slate-800">
                  {console.log("ðŸ–¼ï¸ URL usada para mostrar foto:", formData.urlfoto || formData.url_foto)}
                  <img
                    alt="Foto del paciente"
                    src={
                      formData.urlfoto
                        ? formData.urlfoto
                        : formData.url_foto
                          ? `${formData.url_foto}`
                          : defaultAvatar
                    }
                    className="w-full h-full object-cover"
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = defaultAvatar;
                    }}
                  />
                </div>
                {editando && (
                  <div className="absolute -bottom-2 -right-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold"></span>
                    </div>
                  </div>
                )}
              </div>

              {/* BotÃ³n para tomar nueva foto */}
              <button
                onClick={() => setShowWebcam(true)}
                disabled={!editando}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${editando
                  ? 'bg-blue-900 hover:bg-blue-700 text-white focus:ring-blue-600 shadow-md'
                  : 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
              >
                <Image /> Tomar Nueva Foto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para la cÃ¡mara */}
      {showWebcam && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
                  <Camera className="w-6 h-6" />
                  Capturar Fotografía
                </h3>
                <button
                  onClick={() => setShowWebcam(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <WebcamFoto
                onCapture={img => {
                  setShowWebcam(false);
                  setFormData(f => ({ ...f, urlfoto: img }));
                }}
                onCancel={() => setShowWebcam(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActualizacionPacientes;
