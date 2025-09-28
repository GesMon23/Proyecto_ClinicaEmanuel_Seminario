import React, { useEffect, useState } from 'react';
import api from '../config/api';
import logoClinica from "@/assets/logoClinica2.png";
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
                const savedData = localStorage.getItem('clinicasData');
                if (savedData) {
                    setClinicasData(JSON.parse(savedData));
                }
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

    // Función para cargar el turno actual en estado 4 (llamado)
    const cargarTurnoActual = async (clinica) => {
        if (!clinica) return;
        
        try {
            const response = await api.get(`/Gturno-actual/${clinica}`);
            if (response.data) {
                // Verificar y normalizar la URL de la foto
                let turnoConFoto = { ...response.data };
                if (turnoConFoto?.url_foto) {
                    const filename = turnoConFoto.url_foto.replace(/^.*[\\\/]/, '');
                    const fotoExists = await verificarExistenciaFoto(filename);
                    turnoConFoto.url_foto = fotoExists ? `/fotos/${filename}` : null;
                }
                
                setClinicasData(prev => ({
                    ...prev,
                    [clinica]: {
                        ...(prev[clinica] || {}),
                        turnoLlamado: turnoConFoto,
                        turnoMasAntiguo: prev[clinica]?.turnoMasAntiguo || null,
                        botonLlamarHabilitado: true
                    }
                }));
            }
        } catch (error) {
            if (error.response?.status !== 404) {
                console.error('Error al cargar el turno actual:', error);
            }
        }
    };

    // Efecto para cargar los siguientes turnos cuando se selecciona una clínica
    useEffect(() => {
        if (selectedClinica) {
            cargarSiguientesTurnos(selectedClinica);
            cargarTurnoActual(selectedClinica);
        }
        
        // Cargar los siguientes turnos al montar el componente
        const loadInitialData = async () => {
            if (clinicas.length > 0 && !selectedClinica) {
                const primeraClinica = clinicas[0].descripcion;
                setSelectedClinica(primeraClinica);
                await Promise.all([
                    cargarSiguientesTurnos(primeraClinica),
                    cargarTurnoActual(primeraClinica)
                ]);
            }
        };
        
        loadInitialData();
    }, [selectedClinica, clinicas]);

    // Función para verificar existencia de foto
    const verificarExistenciaFoto = async (filename) => {
        try {
            const response = await api.get(`/check-photo/${filename}`);
            return response.data.exists;
        } catch (error) {
            console.error('Error al verificar la foto:', error);
            return false;
        }
    };

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
            const response = await api.get('/clinicas');
            if (response.data && response.data.length > 0) {
                setClinicas(response.data);
                // Establecer la primera clínica como seleccionada si no hay ninguna seleccionada
                if (!selectedClinica) {
                    setSelectedClinica(response.data[0].descripcion);
                }
            }
        } catch (error) {
            console.error('Error al cargar las clínicas:', error);
            showErrorModal('Error al cargar las clínicas');
        }
    };

    // Función para leer texto en voz alta
    const hablar = (texto) => {
        // Verificar si el navegador soporta la síntesis de voz
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            
            const mensaje = new SpeechSynthesisUtterance(texto);
            
            mensaje.rate = 1; 
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

    const handleLlamar = async (clinica = selectedClinica) => {
        if (!clinica) {
            showErrorModal('No se ha seleccionado una clínica');
            return;
        }

        try {
            setFotoCargando(true);
            
            // Obtener el siguiente turno para la clínica seleccionada
            const response = await api.get(`/Gsiguiente-turnoT/${clinica}`);
            
            if (response.status === 404) {
                showErrorModal('No hay turnos pendientes para esta clínica');
                setSiguientesTurnos([]); // Limpiar la lista de próximos turnos
                return;
            }
            
            // Tomar el primer turno de la lista para el llamado actual
            const turnos = Array.isArray(response.data) ? response.data : [response.data];
            const turno = turnos[0]; // Tomamos el primer turno para el llamado actual
            
            // Actualizar el estado del turno a Llamado (4)
            await api.put(`/Gactualizar-estado-llamadoT/${turno.id_turno_cod}`);
            
            // Verificar y normalizar la URL de la foto
            let turnoConFoto = { ...turno };
            if (turnoConFoto?.url_foto) {
                const filename = turnoConFoto.url_foto.replace(/^.*[\\\/]/, '');
                const fotoExists = await verificarExistenciaFoto(filename);
                turnoConFoto.url_foto = fotoExists ? `/fotos/${filename}` : null;
            }
            
            // Actualizar el estado con el turno llamado
            setClinicasData(prev => ({
                ...prev,
                [clinica]: {
                    ...prev[clinica],
                    turnoLlamado: turnoConFoto,
                    turnoMasAntiguo: turnoConFoto, 
                    botonLlamarHabilitado: true
                }
            }));
            
            // Crear el mensaje de voz
            const mensajeVoz = `Paciente con el número de afiliación ${turnoConFoto.no_afiliacion}, código de turno ${turnoConFoto.id_turno_cod}, presentarse a la recepción para la clínica ${clinica}.`;
            hablar(mensajeVoz);
            
            localStorage.setItem('clinicasData', JSON.stringify({
                ...clinicasData,
                [clinica]: {
                    ...(clinicasData[clinica] || {}),
                    turnoLlamado: turnoConFoto,
                    turnoMasAntiguo: turnoConFoto,
                    botonLlamarHabilitado: true
                }
            }));
            
            // Obtener el siguiente turno para la lista de espera
            await obtenerSiguienteTurno(clinica);
            
            // Actualizar la lista de próximos turnos con un pequeño retraso
            // para asegurar que los datos se hayan actualizado en el servidor
            setTimeout(() => cargarSiguientesTurnos(clinica), 500);
            
            // Actualizar la lista de próximos turnos inmediatamente
            // para reflejar los cambios sin esperar la recarga completa
            const nuevosTurnos = [...siguientesTurnos];
            if (nuevosTurnos.length > 0) {
                nuevosTurnos.shift(); // Eliminar el turno que se acaba de llamar
                setSiguientesTurnos(nuevosTurnos);
            }
            showSuccessModal('Turno llamado exitosamente');
        } catch (error) {
            showErrorModal(`Error al llamar el turno: ${error.message}`);
        } finally {
            setFotoCargando(false);
        }
    };

    const handleAbandonar = async (clinica = selectedClinica) => {
        if (!clinica || !clinicasData[clinica]?.turnoLlamado) {
            showErrorModal('No hay turno para marcar como abandonado');
            return;
        }
        
        // Cargar los siguientes turnos después de marcar como abandonado
        await cargarSiguientesTurnos(clinica);

        try {
            // Usar id_turno_cod en lugar de idturno para la petición
            const response = await api.put(`/Gabandonar-turnoT/${clinicasData[clinica].turnoLlamado.id_turno_cod}`);
            
            if (response.data && response.data.success) {
                // Actualizar el estado local
                setClinicasData(prev => ({
                    ...prev,
                    [clinica]: {
                        ...prev[clinica],
                        turnoLlamado: null,
                        turnoMasAntiguo: null,
                        botonLlamarHabilitado: true
                    }
                }));
                
                // Actualizar localStorage
                const updatedData = {
                    ...clinicasData,
                    [clinica]: {
                        ...clinicasData[clinica],
                        turnoLlamado: null,
                        turnoMasAntiguo: null,
                        botonLlamarHabilitado: true
                    }
                };
                localStorage.setItem('clinicasData', JSON.stringify(updatedData));
                
                showSuccessModal(response.data.message || 'Turno marcado como abandonado');
            } else {
                throw new Error(response.data?.message || 'Error al actualizar el estado del turno');
            }
        } catch (error) {
            console.error('Error en handleAbandonar:', error);
            showErrorModal(`Error al marcar el turno como abandonado: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleLlamarNuevamente = async () => {
        if (!selectedClinica || !clinicasData[selectedClinica]?.turnoLlamado) {
            showErrorModal('No hay un turno llamado para volver a llamar');
            return;
        }
        
        const turno = clinicasData[selectedClinica].turnoLlamado;
        
        try {
            await api.put(`/turnoLlamado/${turno.idturno}`, { idturnoestado: 3 });
            showSuccessModal('Turno llamado nuevamente');
            
            // Crear el mensaje de voz para el llamado nuevamente
            const mensajeVoz = `Atención por favor, paciente con número de afiliación ${turno.no_afiliacion}, código de turno ${turno.id_turno_cod}, favor presentarse en la recepción de la clínica ${selectedClinica}.`;
            hablar(mensajeVoz);
            
            await obtenerSiguienteTurno(selectedClinica);
        } catch (error) {
            showErrorModal(`Error al volver a llamar el turno: ${error.message}`);
        }
    };

    const obtenerSiguienteTurno = async (clinica = selectedClinica) => {
        if (!clinica) return;
        
        try {
            const response = await api.get(`/Gsiguiente-turnoT/${clinica}`);
            
            // Si no hay turno, establecer valores por defecto
            if (response.status === 404 || !response.data) {
                setClinicasData(prev => ({
                    ...prev,
                    [clinica]: {
                        ...prev[clinica],
                        turnoMasAntiguo: null,
                        botonLlamarHabilitado: false
                    }
                }));
                return;
            }
            
            const turno = response.data;
            
            // Verificar y normalizar la URL de la foto
            let turnoConFoto = { ...turno };
            if (turnoConFoto?.url_foto) {
                const filename = turnoConFoto.url_foto.replace(/^.*[\\\/]/, '');
                const fotoExists = await verificarExistenciaFoto(filename);
                turnoConFoto.url_foto = fotoExists ? `/fotos/${filename}` : null;
            }
            
            setClinicasData(prev => ({
                ...prev,
                [clinica]: {
                    ...prev[clinica],
                    turnoMasAntiguo: turnoConFoto,
                    botonLlamarHabilitado: true
                }
            }));
            
            // Guardar en localStorage
            localStorage.setItem('clinicasData', JSON.stringify({
                ...clinicasData,
                [clinica]: {
                    ...(clinicasData[clinica] || {}),
                    turnoMasAntiguo: turnoConFoto,
                    botonLlamarHabilitado: true
                }
            }));
        } catch (error) {
            console.error('Error al obtener siguiente turno:', error);
            // Si hay un error, deshabilitar el botón de llamar
            setClinicasData(prev => ({
                ...prev,
                [clinica]: {
                    ...prev[clinica],
                    botonLlamarHabilitado: false
                }
            }));
        }
    };

    const handleFinalizar = async (clinica = selectedClinica) => {
        if (!clinica || !clinicasData[clinica]?.turnoLlamado) {
            showErrorModal('No hay un turno activo para finalizar');
            return;
        }
        
        // Cargar los siguientes turnos después de finalizar uno
        await cargarSiguientesTurnos(clinica);

        try {
            // Usar id_turno_cod en lugar de idturno para la petición
            const response = await api.put(`/Gfinalizar-turnoT/${clinicasData[clinica].turnoLlamado.id_turno_cod}`);
            
            if (response.data && response.data.success) {
                // Actualizar el estado local
                setClinicasData(prev => ({
                    ...prev,
                    [clinica]: {
                        ...prev[clinica],
                        turnoLlamado: null,
                        turnoMasAntiguo: null,
                        botonLlamarHabilitado: true
                    }
                }));
                
                // Actualizar localStorage
                const updatedData = {
                    ...clinicasData,
                    [clinica]: {
                        ...clinicasData[clinica],
                        turnoLlamado: null,
                        turnoMasAntiguo: null,
                        botonLlamarHabilitado: true
                    }
                };
                localStorage.setItem('clinicasData', JSON.stringify(updatedData));
                
                showSuccessModal(response.data.message || 'Turno finalizado exitosamente');
            } else {
                throw new Error(response.data?.message || 'Error al actualizar el estado del turno');
            }
            
            showSuccessModal(response.data.message);
        } catch (error) {
            showErrorModal(`Error al finalizar el turno: ${error.message}`);
        }
    };

    const cargarSiguientesTurnos = async (clinica) => {
        if (!clinica) return;
        
        try {
            console.log(`Cargando próximos turnos para clínica: ${clinica}`);
            const response = await api.get(`/Gsiguiente-turnoT/${clinica}`);
            
            if (response.data) {
                // Asegurarnos de que siempre sea un array
                let turnos = [];
                
                // Manejar tanto array como objeto simple
                if (Array.isArray(response.data)) {
                    turnos = response.data;
                } else if (typeof response.data === 'object' && response.data !== null) {
                    // Si es un solo objeto, lo convertimos a array
                    turnos = [response.data];
                }
                
                console.log('Turnos cargados:', turnos);
                setSiguientesTurnos(turnos);
            } else {
                console.log('No se encontraron turnos');
                setSiguientesTurnos([]);
            }
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('No hay turnos pendientes para esta clínica');
                setSiguientesTurnos([]);
            } else {
                console.error('Error al cargar los siguientes turnos:', error);
                setSiguientesTurnos([]);
            }
        }
    };

    const handleClinicaSelect = async (clinica) => {
        if (!clinica) {
            showErrorModal('Clínica no válida');
            return;
        }
        
        // Cargar los siguientes turnos y el turno actual cuando se selecciona una clínica
        await Promise.all([
            cargarSiguientesTurnos(clinica),
            cargarTurnoActual(clinica)
        ]);

        try {
            // Siempre permitir cambiar de clínica
            setSelectedClinica(clinica);
            
            // Si la clínica no existe en el estado, inicializarla
            if (!clinicasData[clinica]) {
                setClinicasData(prev => ({
                    ...prev,
                    [clinica]: {
                        turnoMasAntiguo: null,
                        turnoLlamado: null,
                        botonLlamarHabilitado: false
                    }
                }));
                
                // Obtener el siguiente turno solo si es una clínica nueva
                setLoading(true);
                await obtenerSiguienteTurno(clinica);
                setLoading(false);
            } else if (!clinicasData[clinica].turnoMasAntiguo) {
                // Si la clínica existe pero no tiene turno más antiguo, intentar obtenerlo
                setLoading(true);
                await obtenerSiguienteTurno(clinica);
                setLoading(false);
            }
            
            // Mostrar toast no bloqueante
            setToastMessage(`Clínica seleccionada: ${clinica}`);
            setToastType('success');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            
        } catch (error) {
            console.error('Error al seleccionar la clínica:', error);
            showErrorModal(`Error al seleccionar la clínica: ${error.message}`);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClinicas();
        const saved = localStorage.getItem('turnoLlamado');
        if (saved) {
            setTurnoLlamado(JSON.parse(saved));
        }
        setInitialized(true);
    }, []);

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
                                                {clinicasData[selectedClinica].turnoLlamado.url_foto ? (
                                                    <img 
                                                        src={`http://localhost:3001${clinicasData[selectedClinica].turnoLlamado.url_foto}`} 
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
                                                )}
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
                                                        {new Date(clinicasData[selectedClinica].turnoLlamado.fecha_turno).toLocaleString('es-GT', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
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
                                                const mensajeVoz = `Paciente con el número de afiliación ${clinicasData[selectedClinica].turnoLlamado.no_afiliacion}, código de turno ${clinicasData[selectedClinica].turnoLlamado.id_turno_cod}, presentarse a la recepción para la clínica ${selectedClinica}.`;
                                                if ('speechSynthesis' in window) {
                                                    window.speechSynthesis.cancel();
                                                    const mensaje = new SpeechSynthesisUtterance(mensajeVoz);
                                                    mensaje.rate = 1;
                                                    mensaje.pitch = 1;
                                                    window.speechSynthesis.speak(mensaje);
                                                }
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
                                                        {new Date(turno.fecha_turno).toLocaleString('es-GT', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
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
                {selectedClinica && (
                    <div className="flex flex-wrap gap-3 justify-between">
                        <button
                            className="px-5 py-2 rounded-lg bg-green-700 hover:bg-green-800 text-white font-semibold transition-colors dark:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleLlamar(selectedClinica)}
                            disabled={!!clinicasData[selectedClinica]?.turnoLlamado}
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