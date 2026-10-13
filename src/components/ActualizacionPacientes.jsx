import React, { useEffect, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { BrushCleaning, Camera, Edit, Image, Save, XIcon } from 'lucide-react';
import CustomModal from '@/components/CustomModal.jsx';
import WebcamFoto from '@/components/WebcamFoto.jsx';
import FotoPaciente from '@/components/pacientes/FotoPaciente';
import defaultAvatar from '@/assets/img/default-avatar.png';
import { BOTON_LIMPIAR, BOTON_PRINCIPAL } from '@/constants/botones';
import { useAviso } from '@/hooks/useAviso';
import { cn } from '@/utils/cn';
import BuscadorPacientes from './pacientes/BuscadorPacientes';
import CampoEditable from './actualizacionPacientes/CampoEditable';
import {
  armarActualizacion, buscarParaActualizar, cargarCatalogos, erroresDelFormulario, fechaParaInput, guardarActualizacion, subirFoto,
} from './actualizacionPacientes/actualizacion';

const BUSQUEDA_VACIA = { noafiliacion: '', dpi: '' };
const BOTON = 'flex-1 flex items-center justify-center gap-2 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900';

const Cargando = ({ texto }) => (
  <div className="flex items-center justify-center gap-2"><Spinner animation="border" size="sm" />{texto}</div>
);

const ActualizacionPacientes = () => {
  const [busqueda, setBusqueda] = useState(BUSQUEDA_VACIA);
  const [loading, setLoading] = useState(false);
  const [paciente, setPaciente] = useState(null);
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState({});
  const [catalogos, setCatalogos] = useState({ departamentos: [], accesos: [], jornadas: [] });
  const [showWebcam, setShowWebcam] = useState(false);
  const { modal, mostrar } = useAviso();

  useEffect(() => {
    cargarCatalogos().then(setCatalogos).catch(() => mostrar('error', 'Error', 'Error cargando catálogos'));
  }, [mostrar]);

  const handleLimpiarTodo = () => {
    setPaciente(null);
    setFormData({});
    setBusqueda(BUSQUEDA_VACIA);
    setEditando(false);
    setShowWebcam(false);
  };

  const buscarPaciente = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const { paciente: encontrado, mensaje } = await buscarParaActualizar(busqueda);
      if (mensaje) {
        setPaciente(null);
        mostrar('error', 'Error', mensaje);
        return;
      }
      setPaciente(encontrado);
      setFormData(encontrado);
      setEditando(false);
    } catch {
      setPaciente(null);
      mostrar('error', 'Error', 'Error al buscar paciente');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async () => {
    const errores = erroresDelFormulario(formData);
    if (errores.length > 0) {
      mostrar('error', 'Error', 'Corrija los siguientes campos:\n\n- ' + errores.join('\n- '));
      return;
    }
    setLoading(true);
    try {
      const payload = armarActualizacion(formData);
      // Una foto nueva (data URL) se sube primero
      if (formData.urlfoto && formData.urlfoto.startsWith('data:image')) {
        try {
          payload.url_foto = await subirFoto(formData.no_afiliacion, formData.urlfoto);
        } catch {
          mostrar('error', 'Error', 'Error al subir la foto.');
          return;
        }
        setFormData((f) => ({ ...f, url_foto: payload.url_foto }));
      }

      const respuesta = await guardarActualizacion(formData.no_afiliacion, payload);
      if (respuesta && respuesta.success) {
        mostrar('success', 'Éxito', 'Paciente actualizado exitosamente.');
        setPaciente((prev) => ({ ...prev, ...payload }));
        setEditando(false);
      } else {
        mostrar('error', 'Error', respuesta?.detail || 'Error al actualizar paciente');
      }
    } catch (err) {
      mostrar('error', 'Error', err.response?.data?.detail || err.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const f = formData;
  const campo = (name, etiqueta, extra = {}) => ({
    name, etiqueta, editable: editando, value: f[name] || '',
    onChange: (e) => setFormData((prev) => ({ ...prev, [name]: e.target.value })), ...extra,
  });
  const opciones = (lista, id, texto) => lista.map((x) => ({ value: String(x[id]), label: x[texto] }));

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <CustomModal {...modal} />

      <BuscadorPacientes
        titulo="Actualización de Pacientes"
        busqueda={busqueda}
        onCambiar={setBusqueda}
        onBuscar={buscarPaciente}
        onLimpiar={() => setBusqueda(BUSQUEDA_VACIA)}
        loading={loading}
      />

      {paciente && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Información del Paciente</h2>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${editando ? 'bg-orange-500' : 'bg-green-500'}`} />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{editando ? 'Modo Edición' : 'Solo Lectura'}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-0 mb-4">
              {!editando ? (
                <>
                  <button onClick={() => setEditando(true)} className={cn(BOTON_PRINCIPAL, 'flex-1')}>
                    <Edit /> Editar
                  </button>
                  <button onClick={handleLimpiarTodo} className={cn(BOTON_LIMPIAR, 'flex-1')}>
                    <BrushCleaning /> Limpiar
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleGuardar} disabled={loading} className={cn(BOTON_PRINCIPAL, 'flex-1')}>
                    {loading ? <Cargando texto="Guardando..." /> : <><Save />Guardar Cambios</>}
                  </button>
                  <button onClick={handleLimpiarTodo} className={`${BOTON} bg-red-600 hover:bg-red-700 focus:ring-gray-600`}>
                    <XIcon /> Cancelar
                  </button>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <CampoEditable {...campo('primer_nombre', 'Primer Nombre *')} />
              <CampoEditable {...campo('segundo_nombre', 'Segundo Nombre')} />
              <CampoEditable {...campo('primer_apellido', 'Primer Apellido')} />
              <CampoEditable {...campo('segundo_apellido', 'Segundo Apellido')} />
              <CampoEditable {...campo('apellido_casada', 'Apellido Casada', { editable: editando && f.sexo === 'Femenino' })} />
              <CampoEditable {...campo('otros_nombres', 'Otros Nombres')} />
              <CampoEditable
                {...campo('sexo', 'Sexo')} opciones={[{ value: 'Masculino', label: 'Masculino' }, { value: 'Femenino', label: 'Femenino' }]}
              />
              <CampoEditable {...campo('fecha_nacimiento', 'Fecha de Nacimiento', { tipo: 'date', value: fechaParaInput(f.fecha_nacimiento) })} />
              <CampoEditable
                {...campo('dpi', 'DPI', {
                  onChange: (e) => setFormData((prev) => ({ ...prev, dpi: (e.target.value || '').replace(/\D+/g, '').slice(0, 13) })),
                })}
                inputMode="numeric" maxLength={13} pattern="[0-9]{13}"
                onKeyDown={(e) => { if (['e', 'E', '+', '-', '.', ',', ' '].includes(e.key)) e.preventDefault(); }}
                onPaste={(e) => { if (/[^0-9]/.test((e.clipboardData.getData('text') || '').trim())) e.preventDefault(); }}
              />
              <CampoEditable {...campo('no_afiliacion', 'No. Afiliación')} bloqueado />
              <CampoEditable {...campo('direccion', 'Dirección')} />
              <CampoEditable
                {...campo('id_departamento', 'Departamento', { value: f.id_departamento?.toString() || '' })}
                opciones={opciones(catalogos.departamentos, 'id_departamento', 'nombre')}
              />
              <CampoEditable
                {...campo('id_acceso', 'Acceso Vascular', { value: f.id_acceso?.toString() || '' })}
                opciones={opciones(catalogos.accesos, 'id_acceso', 'descripcion')}
              />
              <CampoEditable
                {...campo('id_jornada', 'Jornada', { value: f.id_jornada?.toString() || '' })}
                opciones={opciones(catalogos.jornadas, 'id_jornada', 'descripcion')}
              />

              <div className="flex flex-col items-center space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fotografía del Paciente</h3>
                <div className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 rounded-2xl overflow-hidden border-4 border-green-600 dark:border-green-400 shadow-xl bg-gray-100 dark:bg-slate-800">
                  {/* urlfoto: la foto recién tomada (data URL) o la ruta de la API; url_foto: el archivo guardado */}
                  <FotoPaciente
                    rutas={[f.urlfoto || (f.url_foto && (String(f.url_foto).startsWith('/') ? f.url_foto : `/fotos/${f.url_foto}`))]}
                    alternativa={defaultAvatar}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => setShowWebcam(true)}
                  disabled={!editando}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${editando
                    ? 'bg-blue-900 hover:bg-blue-700 text-white focus:ring-blue-600 shadow-md'
                    : 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'}`}
                >
                  <Image /> Tomar Nueva Foto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  aria-label="Cerrar cámara"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <WebcamFoto
                onCapture={(img) => { setShowWebcam(false); setFormData((prev) => ({ ...prev, urlfoto: img })); }}
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
