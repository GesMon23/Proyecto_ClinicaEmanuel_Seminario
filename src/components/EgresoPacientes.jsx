import React, { useState } from 'react';
import api from '../config/api';
import CustomModal from '@/components/CustomModal.jsx';
import logoClinica from "@/assets/logoClinica2.png"
import defaultAvatar from "@/assets/img/default-avatar.png";


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
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

  // Cargar causas de egreso al montar el componente
  React.useEffect(() => {
    api.get('/causas_egreso')
      .then(res => setCausasEgreso(res.data))
      .catch(() => setCausasEgreso([]));
  }, []);
  const showToast = (message, type = 'error', duration = 3000) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ ...toast, show: false });
    }, duration);
  };

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

  const handleInsertEgreso = async (e) => {
    e.preventDefault();
    setError('');

    // Validación manual
    if (!formData.causaegreso) {
      showToast('Debe seleccionar la causa de egreso');
      return;
    }
    if (!esFallecimiento && !formData.fechaegreso) {
      showToast('Debe ingresar la fecha de egreso');
      return;
    }
    if (!esFallecimiento && !formData.descripcion) {
      showToast('Debe ingresar una descripción');
      return;
    }
    if (esFallecimiento) {
      if (!formData.fechafallecimiento || !formData.comorbilidades || !formData.lugarfallecimiento || !formData.causafallecimiento) {
        showToast('Debe completar todos los campos de fallecimiento');
        return;
      }
    }

    try {
      const payload = {
        no_afiliacion: resultados[0]?.no_afiliacion, // paciente seleccionado
        id_causa_egreso: formData.causaegreso,
        descripcion: formData.descripcion,
        fecha_egreso: formData.fechaegreso,
        observaciones: formData.observaciones,
        fechafallecimiento: formData.fechafallecimiento,
        comorbilidades: formData.comorbilidades,
        lugarfallecimiento: formData.lugarfallecimiento,
        causafallecimiento: formData.causafallecimiento
      };

      const response = await api.post('/egresos', payload);

      if (response.data.success) {
        setModalMessage('Egreso insertado correctamente.');
        setModalTitle('Éxito');
        setModalType('success');
        setShowModal(true);
        handleLimpiarEgreso(); // aquí limpias después de insertar
      } else {
        throw new Error('No se pudo insertar el egreso.');
      }
    } catch (err) {
      console.log("==== ERROR AL INSERTAR EGRESO ====" + err);
      setModalMessage('Error al insertar el egreso.');
      setModalTitle('Error');
      setModalType('error');
      setShowModal(true);
    }
  };
  const causaSeleccionada = causasEgreso.find(c => String(c.id_causa) === String(formData.causaegreso));
  const esFallecimiento =
    causaSeleccionada &&
    causaSeleccionada.descripcion &&
    causaSeleccionada.descripcion.toLowerCase().includes("fallecimiento");
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
                {toast.show && (
                  <div className="fixed top-5 right-5 z-50 flex flex-col w-80 rounded-lg shadow-lg overflow-hidden bg-white dark:bg-slate-600">
                    <div className="flex items-center">
                      {/* Franja izquierda */}
                      <div className="w-1 h-full bg-cyan-400"></div>
                      {/* Contenido */}
                      <div className="flex-1 px-4 py-3 flex items-center space-x-3">
                        {/* Icono info */}
                        <svg
                          className="w-6 h-6 text-cyan-500 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
                        </svg>
                        {/* Mensaje */}
                        <div className="flex-1 text-sm dark:text-white">{toast.message}</div>
                      </div>
                    </div>
                    {/* Barra de progreso */}
                    <div
                      className="h-1 bg-cyan-400"
                      style={{
                        animation: `progressBar ${toast.duration}ms linear forwards`
                      }}
                    ></div>
                  </div>
                )}

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
                </div>
                <div className="flex justify-center">
                  <div className="w-full max-w-md mb-4">
                    <input
                      placeholder="Número de Afiliación"
                      type="text"
                      name="noafiliacion"
                      value={busqueda.noafiliacion}
                      onChange={handleBusquedaChange}
                      disabled={Boolean(busqueda.dpi)}
                      className="w-full text-lg px-4 py-2 mb-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:bg-slate-800 dark:text-white disabled:opacity-60"
                    />
                    <input
                      placeholder="DPI"
                      type="text"
                      name="dpi"
                      value={busqueda.dpi}
                      onChange={handleBusquedaChange}
                      disabled={Boolean(busqueda.noafiliacion)}
                      className="w-full text-lg px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:bg-slate-800 dark:text-white disabled:opacity-60"
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
          <div
            key={p.no_afiliacion || p.dpi}
            className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden mb-6 transition-all duration-200 hover:shadow-xl"
          >
            {/* Header con foto y nombre */}
            <div className="flex flex-col lg:flex-row gap-6 p-6">
              {/* Contenedor de la foto */}
              <div className="flex-shrink-0 mx-auto lg:mx-0">
                <div className="w-48 h-48 lg:w-56 lg:h-56 rounded-xl overflow-hidden border-4 border-green-700 dark:border-green-600 shadow-lg bg-gray-100 dark:bg-slate-800">
                  <img
                    alt="Foto del paciente"
                    src={p.url_foto ? `http://localhost:3001/fotos/${p.url_foto}` : defaultAvatar}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = defaultAvatar;
                    }}
                  />
                </div>
              </div>

              {/* Información principal */}
              <div className="flex-1 min-w-0">
                {/* Nombre del paciente */}
                <div className="text-center lg:text-left mb-6">
                  <h2 className="text-2xl lg:text-3xl font-bold text-green-700 dark:text-white uppercase tracking-wide break-words leading-tight">
                    {`${p.primer_nombre || ''} ${p.segundo_nombre || ''} ${p.otros_nombres || ''} ${p.primer_apellido || ''} ${p.segundo_apellido || ''} ${p.apellido_casada || ''}`.replace(
                      / +/g,
                      ' '
                    ).trim()}
                  </h2>
                  <div className="w-24 h-1 bg-green-600 dark:bg-white mx-auto lg:mx-0 mt-2 rounded-full"></div>
                </div>

                {/* Información básica en cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 px-2 sm:px-0">
                  <div className="bg-green-50 dark:bg-slate-800 rounded-lg p-4 sm:p-6 border-l-4 border-green-600 min-w-0 min-h-[155px] flex flex-col justify-center">
                    <div className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-400 mb-2">
                      No. Afiliación
                    </div>
                    <div className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white break-all">
                      {p.no_afiliacion}
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-slate-800 rounded-lg p-4 sm:p-6 border-l-4 border-green-600 min-w-0 min-h-[155px] flex flex-col justify-center">
                    <div className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-400 mb-2">
                      DPI
                    </div>
                    <div className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white break-all">
                      {p.dpi}
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-slate-800 rounded-lg p-4 sm:p-6 border-l-4 border-green-600 min-w-0 min-h-[100px] flex flex-col justify-center sm:col-span-2 xl:col-span-1">
                    <div className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-400 mb-2">
                      Sexo
                    </div>
                    <div className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white break-all">
                      {p.sexo || '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Separador */}
            <div className="border-t border-gray-200 dark:border-slate-700"></div>

            {/* Información detallada */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                Información Detallada
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* Lista de información */}
                {[
                  { label: 'No. Paciente Proveedor', value: p.no_paciente_proveedor },
                  { label: 'Dirección', value: p.direccion },
                  { label: 'Departamento', value: p.departamento_nombre },
                  { label: 'Estado', value: p.estado_descripcion },
                  { label: 'Jornada', value: p.jornada_descripcion },
                  { label: 'Acceso Vascular', value: p.acceso_descripcion }
                ].map((item, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {item.label}
                    </div>
                    <div className="text-base text-gray-900 dark:text-white font-medium break-words">
                      {item.value || '-'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Observaciones en sección separada si existen */}
              {p.observaciones && (
                <div className="mt-6 bg-yellow-50 dark:bg-slate-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-xs text-yellow-900">!</span>
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-1">
                        Observaciones
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 break-words">
                        {p.observaciones}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Formulario de egreso (visible si hay paciente) */}
        {resultados.length > 0 && (
          <div className="w-full max-w-6xl mx-auto mb-10">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 sm:p-6 lg:p-8">
                <form onSubmit={handleInsertEgreso} className="space-y-6">
                  <span className="text-sm text-gray-500">Coloque 0 si no desea llenar los campos</span>
                  {/* Contenedor principal con columnas */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    {/* Columna izquierda */}
                    <div className="space-y-6">
                      {/* Causa del Egreso */}
                      <div className="space-y-2">
                        <label className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                          Causa del Egreso
                        </label>
                        <select
                          name="causaegreso"
                          value={formData.causaegreso}
                          onChange={handleFormChange}
                          required
                          className="w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        >
                          <option value="">Seleccione una causa...</option>
                          {causasEgreso.map(c => (
                            <option key={c.id_causa} value={c.id_causa}>{c.descripcion}</option>
                          ))}
                        </select>
                      </div>



                      {/* Fecha del egreso */}
                      {!esFallecimiento && (
                        <div className="space-y-2">
                          <label className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                            Fecha del egreso
                          </label>
                          <input
                            type="date"
                            name="fechaegreso"
                            value={formData.fechaegreso}
                            onChange={handleFormChange}
                            required={!esFallecimiento}
                            className="w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                          />
                        </div>
                      )}
                    </div>

                    {!esFallecimiento && (
                      <div className="space-y-2">
                        <label className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                          Descripción
                        </label>
                        <input
                          type="text"
                          name="descripcion"
                          value={formData.descripcion}
                          onChange={handleFormChange}
                          required={!esFallecimiento}
                          placeholder="Ingrese una descripción"
                          className="w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        />
                      </div>
                    )}
                  </div>

                  {/* Campos especiales para Fallecimiento */}
                  {esFallecimiento && (
                    <div className="space-y-6 bg-red-50 dark:bg-red-900/20 p-4 sm:p-6 rounded-lg border-l-4 border-red-500">
                      <h3 className="text-lg font-semibold text-red-800 dark:text-red-400">
                        Información de Fallecimiento
                      </h3>
                      {/* Grid de dos columnas */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Fecha de Fallecimiento */}
                        <div className="space-y-2">
                          <label className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                            Fecha de Fallecimiento
                          </label>
                          <input
                            type="date"
                            name="fechafallecimiento"
                            value={formData.fechafallecimiento}
                            onChange={handleFormChange}
                            required={esFallecimiento}
                            className="w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                          />
                        </div>

                        {/* Comorbilidades */}
                        <div className="space-y-2">
                          <label className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                            Comorbilidades
                          </label>
                          <input
                            type="text"
                            name="comorbilidades"
                            value={formData.comorbilidades}
                            onChange={handleFormChange}
                            required={esFallecimiento}
                            placeholder="Ingrese comorbilidades (si aplica)"
                            className="w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                          />
                        </div>

                        {/* Lugar de Fallecimiento */}
                        <div className="space-y-2">
                          <label className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                            Lugar de Fallecimiento
                          </label>
                          <input
                            type="text"
                            name="lugarfallecimiento"
                            value={formData.lugarfallecimiento}
                            onChange={handleFormChange}
                            placeholder="Ingrese el lugar de fallecimiento"
                            required={esFallecimiento}
                            className="w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                          />
                        </div>

                        {/* Causa de Fallecimiento */}
                        <div className="space-y-2">
                          <label className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                            Causa de Fallecimiento
                          </label>
                          <input
                            type="text"
                            name="causafallecimiento"
                            value={formData.causafallecimiento}
                            onChange={handleFormChange}
                            placeholder="Ingrese la causa de fallecimiento"
                            required={esFallecimiento}
                            className="w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}



                  {/* Observaciones - Campo completo */}
                  <div className="space-y-2">
                    <label className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      Observaciones
                    </label>
                    <textarea
                      name="observaciones"
                      value={formData.observaciones}
                      onChange={handleFormChange}
                      required
                      rows={5}
                      placeholder="Ingrese observaciones"
                      className="w-full px-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                    />
                  </div>

                  {/* Separador */}
                  <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                    {/* Botones */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-end">
                      <button
                        type="submit"
                        onClick={handleInsertEgreso}
                        className="w-full sm:w-56 px-8 py-3 bg-green-700 hover:bg-green-800 text-white text-lg font-semibold rounded-lg shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                      >
                        Guardar Egreso
                      </button>
                      <button
                        type="button"
                        onClick={handleLimpiarEgreso}
                        className="w-full sm:w-40 px-8 py-3 bg-red-600 hover:bg-red-700 text-white text-lg font-semibold rounded-lg shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </Container>
  );
};

export default EgresoPacientes;
