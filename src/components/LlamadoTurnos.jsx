import React, { useEffect, useState } from 'react';
import api from '../config/api';
import logoClinica from "@/assets/logoClinica2.png";
import { formatearFecha } from '@/utils/fechas';
import { 
  RefreshCw,
  Stethoscope,
  HeartPulse,
  Syringe,
  Pill,
  Bone,
  Eye,
  Activity,
  Brain,
  Ear,
  Baby,
  User,
  Hospital,
  Apple
} from "lucide-react";

// Función para obtener el icono de la clínica
const getClinicaIcon = (clinicaNombre) => {
  const iconStyle = 'w-4 h-4 me-2';
  
  // Mapeo de clínicas a sus respectivos iconos
  const iconMap = {
    'Pediatría': <Baby className={iconStyle} />,
    'Ginecología': <User className={iconStyle} />,
    'Oftalmología': <Eye className={iconStyle} />,
    'Ortopedia': <Bone className={iconStyle} />,
    'Cardiología': <HeartPulse className={iconStyle} />,
    'Otorrinolaringología': <Ear className={iconStyle} />,
    'Psicología': <Brain  className={iconStyle} />,
    'Enfermería': <Syringe className={iconStyle} />,
    'Farmacia': <Pill className={iconStyle} />,
    'Laboratorio': <Activity className={iconStyle} />,
    'Rayos X': <Activity className={iconStyle} />,
    'Nutrición': <Apple className={iconStyle} />,
    'Hemodialisis': <Stethoscope className={iconStyle} />,
    'default': <Hospital className={iconStyle} />
  };

  return iconMap[clinicaNombre] || iconMap['default'];
};

const CustomModal = ({ show, onClose, title, message, type }) => {
    if (!show) return null;

    return (
        <>
            {/* Overlay */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-50"
                onClick={onClose}
            />
            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl z-50 max-w-md w-full mx-4">
                <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{title}</h4>
                <p className="text-gray-700 dark:text-gray-300 mb-4">{message}</p>
                <button
                    className={`w-full font-semibold py-2 px-4 rounded transition-colors ${
                        type === 'success'
                            ? 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700'
                            : type === 'error'
                            ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
                            : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
                    } text-white`}
                    onClick={onClose}
                >
                    Cerrar
                </button>
            </div>
        </>
    );
};

const LlamadoTurnos = () => {
    const [clinicas, setClinicas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedClinica, setSelectedClinica] = useState(null);
    const [clinicasData, setClinicasData] = useState({});
    const [siguientesTurnos, setSiguientesTurnos] = useState([]);
    const [turnoActivo, setTurnoActivo] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState('info');
    const [fotoCargando, setFotoCargando] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('info');
    
    const [initialized, setInitialized] = useState(false);

    // Efecto para cargar datos iniciales
    useEffect(() => {
        const initializeData = async () => {
            try {
                setLoading(true);
                // El estado de los turnos vive en el servidor; se descarta cualquier copia vieja del navegador
                try {
                    localStorage.removeItem('clinicasData');
                    localStorage.removeItem('turnoLlamado');
                } catch {}
                await fetchClinicas();
            } catch (err) {
                setError(err);
                showErrorModal('Error al cargar los datos iniciales');
            } finally {
                setLoading(false);
                setInitialized(true);
            }
        };

        initializeData();
    }, []);

    // Turno que el usuario actual tiene en atención (estado 4). Un usuario solo puede tener uno.
    // Si el servidor no devuelve ninguno, se limpia el estado local (evita mostrar turnos que ya no existen).
    const cargarTurnoActual = async () => {
        try {
            const response = await api.get('/Gturno-actual-usuario');
            const turno = response.data || null;
            setTurnoActivo(turno);
            setClinicasData(turno ? {
                [turno.nombre_clinica]: { turnoLlamado: turno }
            } : {});
        } catch (error) {
            if (error.response?.status === 404) {
                setTurnoActivo(null);
                setClinicasData({});
            } else {
                console.error('Error al cargar el turno actual:', error);
            }
        }
    };

    // Carga inicial y al cambiar de clínica
    useEffect(() => {
        if (clinicas.length > 0 && !selectedClinica) {
            setSelectedClinica(clinicas[0].descripcion);
            return;
        }
        if (selectedClinica) {
            cargarSiguientesTurnos(selectedClinica);
            cargarTurnoActual();
        }
    }, [selectedClinica, clinicas]);

    // Refresco periódico: los turnos que llaman otros usuarios deben desaparecer de "Próximos Turnos"
    useEffect(() => {
        if (!selectedClinica) return;
        const id = setInterval(() => {
            cargarSiguientesTurnos(selectedClinica);
            cargarTurnoActual();
        }, 5000);
        return () => clearInterval(id);
    }, [selectedClinica]);

    const handleCloseModal = () => setShowModal(false);

    const showSuccessModal = (message) => {
        setModalMessage(message);
        setModalType('success');
        setShowModal(true);
    };

    const showErrorModal = (message) => {
        setModalMessage(message);
        setModalType('error');
        setShowModal(true);
    };

    const fetchClinicas = async () => {
        try {
            const response = await api.get('/GclinicasT');
            if (response.data && response.data.length > 0) {
                setClinicas(response.data);
                // Establecer la primera clínica como seleccionada si no hay ninguna seleccionada
                if (!selectedClinica) {
                    setSelectedClinica(response.data[0].descripcion);
                }
            }
        } catch (error) {
            console.error('Error al cargar las clínicas:', error.response.data);
            console.error('Error al cargar las clínicas:', error.response.status);
            console.error('Error al cargar las clínicas:', error.response.headers);
            showErrorModal('Error al cargar las clínicas');
        }
    };

    // Función para leer texto en voz alta
    const hablar = (texto) => {
        // Verificar si el navegador soporta la síntesis de voz
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            
            const mensaje = new SpeechSynthesisUtterance(texto);
            
            mensaje.rate = 0.8; 
            mensaje.pitch = 1;  
            mensaje.volume = 1;  
            const voces = window.speechSynthesis.getVoices();
            const vozEspanol = voces.find(voice => 
                voice.lang === 'es-ES' || 
                voice.lang === 'es-MX' || 
                voice.lang === 'es-AR' ||
                voice.name.toLowerCase().includes('spanish')
            );
            
            if (vozEspanol) {
                mensaje.voice = vozEspanol;
            }
            
            window.speechSynthesis.speak(mensaje);
        } else {
            console.warn('La síntesis de voz no es compatible con este navegador');
        }
    };

    // Publica el evento para la TV (localStorage + evento del navegador + SSE del backend)
    const notificarTV = async (clinica, accion, turno = null) => {
        try {
            localStorage.setItem('turnoActualizado', JSON.stringify({ clinica, timestamp: Date.now(), accion }));
        } catch {}
        try {
            window.dispatchEvent(new CustomEvent('turnoActualizado', {
                detail: { clinica, timestamp: Date.now(), accion }
            }));
        } catch {}
        try {
            await api.post('/turnos/llamado', {
                clinica,
                accion,
                turnoId: turno?.id_turno_cod || null,
                turno: turno || null,
                ts: Date.now(),
            });
        } catch (_) {}
    };

    const mensajeError = (error, porDefecto) =>
        error.response?.data?.message || error.response?.data?.error || porDefecto;

    const handleLlamar = async (clinica = selectedClinica) => {
        if (!clinica) {
            showErrorModal('No se ha seleccionado una clínica');
            return;
        }
        if (turnoActivo) {
            showErrorModal('Ya tienes un paciente en atención. Finalízalo o márcalo como abandonado antes de llamar a otro.');
            return;
        }

        try {
            setFotoCargando(true);

            // Siguiente turno Asignada de la clínica que nadie ha llamado todavía
            const response = await api.get(`/Gsiguiente-turnoT/${clinica}`);
            const turnos = Array.isArray(response.data) ? response.data : [response.data];
            const turno = turnos[0];
            if (!turno) {
                showErrorModal('No hay turnos pendientes para esta clínica');
                setSiguientesTurnos([]);
                return;
            }

            // El servidor registra al usuario que llama y rechaza el llamado si otro usuario se adelantó
            const llamado = await api.put(`/Gactualizar-estado-llamadoT/${turno.id_turno_cod}`);
            await notificarTV(clinica, 'llamar', llamado.data?.turno || turno);
            await Promise.all([cargarTurnoActual(), cargarSiguientesTurnos(clinica)]);
            showSuccessModal('Turno llamado exitosamente');
        } catch (error) {
            if (error.response?.status === 404) {
                showErrorModal('No hay turnos pendientes para esta clínica');
            } else {
                showErrorModal(mensajeError(error, `No se pudo llamar un turno de la clínica ${clinica}`));
            }
            await Promise.all([cargarTurnoActual(), cargarSiguientesTurnos(clinica)]);
        } finally {
            setFotoCargando(false);
        }
    };

    // Cierra el turno que el usuario tiene en atención (finalizar o abandonar)
    const cerrarTurnoActual = async (clinica, { endpoint, accion, exito, falla }) => {
        const turno = turnoActivo;
        if (!clinica || !turno || turno.nombre_clinica !== clinica) {
            showErrorModal('No hay un turno en atención para esta clínica');
            return;
        }

        try {
            const response = await api.put(`${endpoint}/${turno.id_turno_cod}`);
            if (!(response.data && response.data.success)) {
                throw new Error(response.data?.message || 'Error al actualizar el estado del turno');
            }
            await notificarTV(clinica, accion);
            await Promise.all([cargarTurnoActual(), cargarSiguientesTurnos(clinica)]);
            showSuccessModal(response.data.message || exito);
        } catch (error) {
            console.error(falla, error);
            showErrorModal(`${falla}: ${mensajeError(error, error.message)}`);
            await cargarTurnoActual();
        }
    };

    const handleAbandonar = (clinica = selectedClinica) => cerrarTurnoActual(clinica, {
        endpoint: '/Gabandonar-turnoT',
        accion: 'abandonar',
        exito: 'Turno marcado como abandonado',
        falla: 'Error al marcar el turno como abandonado',
    });

    const handleFinalizar = (clinica = selectedClinica) => cerrarTurnoActual(clinica, {
        endpoint: '/Gfinalizar-turnoT',
        accion: 'finalizar',
        exito: 'Turno finalizado exitosamente',
        falla: 'Error al finalizar el turno',
    });

    // Próximos turnos: Asignada y aún sin llamar (un turno llamado por otro usuario deja de aparecer)
    const cargarSiguientesTurnos = async (clinica) => {
        if (!clinica) return;

        try {
            const response = await api.get(`/Gsiguientes-turnosT/${encodeURIComponent(clinica)}`);
            setSiguientesTurnos(Array.isArray(response.data?.turnos) ? response.data.turnos : []);
        } catch (error) {
            console.error('Error al cargar los siguientes turnos:', error);
            setSiguientesTurnos([]);
        }
    };

    const handleClinicaSelect = (clinica) => {
        if (!clinica) {
            showErrorModal('Clínica no válida');
            return;
        }

        setSelectedClinica(clinica);
        setToastMessage(`Clínica seleccionada: ${clinica}`);
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <RefreshCw className="animate-spin h-12 w-12 mx-auto text-blue-600" />
                    <p className="mt-4 text-lg dark:text-white">Cargando datos...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-100 text-red-700 rounded-md">
                <p>Error al cargar los datos. Por favor, recarga la página o contacta al administrador.</p>
                <p className="text-sm mt-2">{error.message}</p>
            </div>
        );
    }

    if (!initialized) {
        return null; // O muestra un loader
    }

    return (
        <div className="w-full">
            {/* Toast superior derecho */}
            {showToast && (
                <div className={`fixed top-4 right-4 z-50 min-w-[260px] max-w-sm px-4 py-3 rounded-lg shadow-lg border text-white ${
                    toastType === 'success'
                        ? 'bg-green-600 border-green-700'
                        : toastType === 'error'
                        ? 'bg-red-600 border-red-700'
                        : 'bg-blue-600 border-blue-700'
                }`}
                >
                    <div className="font-semibold mb-1">{toastType === 'success' ? 'Éxito' : toastType === 'error' ? 'Error' : 'Aviso'}</div>
                    <div className="text-sm opacity-95">{toastMessage}</div>
                </div>
            )}
            <CustomModal
                show={showModal}
                onClose={handleCloseModal}
                title={modalType === 'success' ? 'Éxito' : 'Error'}
                message={modalMessage}
                type={modalType}
            />
            {/* Header (similar a AsignarTurno) */}
            <div className="w-full text-center mb-6">
                <div className="flex items-center justify-center gap-6 flex-wrap">
                    <img
                        src={logoClinica}
                        alt="Logo Clínica"
                        className="h-[140px] sm:h-[160px] lg:h-[180px] max-w-[280px] sm:max-w-[320px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                    />
                    <h1 className="text-2xl sm:text-3xl font-bold text-green-800 dark:text-white">
                        Llamado de Turnos
                    </h1>
                </div>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-slate-600 to-transparent mt-4" />
            </div>

            {/* Card principal */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
                {/* Navegación por pestañas de clínicas */}
                <div className="mb-6">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500 dark:text-gray-400">
                            {Array.isArray(clinicas) && clinicas.map((clinica) => (
                                <li key={clinica.idsala} className="me-2">
                                    <button
                                        onClick={() => handleClinicaSelect(clinica.descripcion)}
                                        className={`inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg group ${
                                            selectedClinica === clinica.descripcion
                                                ? 'text-green-600 border-green-600 dark:text-green-500 dark:border-green-500'
                                                : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                                        }`}
                                        // Siempre permitir cambiar de clínica
                                        disabled={false}
                                    >
                                        {getClinicaIcon(clinica.descripcion)}
                                        {clinica.descripcion}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex justify-end mt-4">
                        {/* <button
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors dark:bg-blue-500 dark:hover:bg-blue-600 flex items-center gap-2"
                            onClick={obtenerSiguienteTurno}
                            aria-label="Recargar búsqueda de turno"
                        >
                            <RefreshCw size={16} />
                            <span>Actualizar</span>
                        </button> */}
                    </div>
                </div>

                {/* Tarjeta de turno actual */}
                {selectedClinica && (
                    <div className="mb-6">
                        <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                            Turno Actual - {selectedClinica}
                        </h4>

                        {clinicasData[selectedClinica]?.turnoLlamado ? (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden border border-green-100 dark:border-slate-700 transition-all duration-300 hover:shadow-xl">
                                <div className="bg-gradient-to-r from-green-800 to-green-700 p-4 text-white">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xl font-bold">Paciente Actual</h3>
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                                            {selectedClinica}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row gap-8 items-center">
                                        {/* Foto del paciente */}
                                        <div className="relative group">
                                            <div className="w-36 h-36 rounded-xl overflow-hidden border-4 border-green-100 dark:border-green-900 bg-gray-100 dark:bg-slate-700 flex-shrink-0 relative transition-transform duration-300 group-hover:scale-105">
                                                {(() => {
                                                    const t = clinicasData[selectedClinica].turnoLlamado;
                                                    const noaf = t?.no_afiliacion || t?.noafiliacion || '';
                                                    let src = null;
                                                    if (noaf) {
                                                        const v = encodeURIComponent(t?.id_turno_cod || '1');
                                                        src = `/api/foto/${encodeURIComponent(noaf)}?v=${v}`;
                                                    } else {
                                                        const raw = t?.url_foto;
                                                        if (raw) {
                                                            const s = String(raw);
                                                            if (s.startsWith('http')) src = s;
                                                            else if (s.startsWith('/api/foto')) src = s;
                                                            else if (s.startsWith('/api/fotos/')) src = s;
                                                            else if (s.startsWith('/fotos/')) src = `/api${s}`;
                                                            else src = `/api/fotos/${encodeURIComponent(s)}`;
                                                        }
                                                    }
                                                    return src ? (
                                                    <img 
                                                        src={src} 
                                                        alt="Foto del paciente" 
                                                        className="w-full h-full object-cover"

                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = 'https://ui-avatars.com/api/?name=' + 
                                                                encodeURIComponent(clinicasData[selectedClinica].turnoLlamado.nombrepaciente) + 
                                                                '&background=3B82F6&color=fff';
                                                        }}
                                                    />
                                                    ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 text-5xl">
                                                        {clinicasData[selectedClinica].turnoLlamado.nombrepaciente.charAt(0).toUpperCase()}
                                                    </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Información del turno */}
                                        <div className="flex-1 w-full mt-4 md:mt-0">
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                                {clinicasData[selectedClinica].turnoLlamado.nombrepaciente}
                                            </h2>
                                            <p className="text-green-600 dark:text-green-400 mb-6">
                                                <span className="font-medium">Código:</span> {clinicasData[selectedClinica].turnoLlamado.id_turno_cod}
                                            </p>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg">
                                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-300 mb-1">No. Afiliación</p>
                                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                        {clinicasData[selectedClinica].turnoLlamado.no_afiliacion}
                                                    </p>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg">
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha y Hora</p>
                                                    <p className="text-gray-700 dark:text-gray-300">
                                                        {formatearFecha(clinicasData[selectedClinica].turnoLlamado.fecha_turno)}
                                                    </p>
                                                </div>
                                                
                                            </div>
                                            
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-3 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                            <span>En atención</span>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                try {
                                                    localStorage.setItem('turnoActualizado', JSON.stringify({
                                                        clinica: selectedClinica,
                                                        timestamp: Date.now(),
                                                        accion: 're-llamar'
                                                    }));
                                                } catch {}
                                                try {
                                                    window.dispatchEvent(new CustomEvent('turnoActualizado', {
                                                        detail: { clinica: selectedClinica, timestamp: Date.now(), accion: 're-llamar' }
                                                    }));
                                                } catch {}
                                            }}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                            </svg>
                                            Llamar Nuevamente
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
                                <div className="text-gray-400 dark:text-gray-500">
                                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">No hay turno en atención</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Elija un turno para comenzar la atención.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Próximos turnos */}
                {selectedClinica && (
                    <div className="mb-6">
                        <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                            Próximos Turnos - {selectedClinica}
                        </h4>
                        <div className="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-lg">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-slate-700">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Código
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Paciente
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                No. Afiliación
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Fecha
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {siguientesTurnos.length > 0 ? (
                                            siguientesTurnos.map((turno, index) => (
                                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                                                        {turno.id_turno_cod}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                                        {turno.nombrepaciente}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {turno.no_afiliacion}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {formatearFecha(turno.fecha_turno)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                                    No hay turnos programados
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Botones de acción */}
                {selectedClinica && turnoActivo && turnoActivo.nombre_clinica !== selectedClinica && (
                    <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">
                        Tienes un paciente en atención en {turnoActivo.nombre_clinica}. Debes finalizarlo o marcarlo como abandonado antes de llamar a otro.
                    </p>
                )}
                {selectedClinica && (
                    <div className="flex flex-wrap gap-3 justify-between">
                        <button
                            className="px-5 py-2 rounded-lg bg-green-700 hover:bg-green-800 text-white font-semibold transition-colors dark:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleLlamar(selectedClinica)}
                            disabled={!!turnoActivo || siguientesTurnos.length === 0 || fotoCargando}
                        >
                            Llamar
                        </button>

                        <button
                            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors dark:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleAbandonar(selectedClinica)}
                            disabled={!clinicasData[selectedClinica]?.turnoLlamado}
                        >
                            Abandonado
                        </button>

                        <button
                            className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors dark:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleFinalizar(selectedClinica)}
                            disabled={!clinicasData[selectedClinica]?.turnoLlamado}
                        >
                            Finalizar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LlamadoTurnos;