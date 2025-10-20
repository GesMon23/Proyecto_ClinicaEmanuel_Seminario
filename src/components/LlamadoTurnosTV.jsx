import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  User,
  Activity,
  Brain,
  Ear,
  Baby,
  Hospital,
  Apple
} from "lucide-react";

// Función para obtener el icono de la clínica


const CustomModal = ({ show, onClose, title, message, type }) => {
    if (!show) return null;

    return (
        <>
            {/* Overlay */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-50"
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

const LlamadoTurnosTV = () => {
    const [turnosActuales, setTurnosActuales] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [ultimaActualizacion, setUltimaActualizacion] = useState({});

    // Lista de clínicas a mostrar (asegúrate de que estos nombres coincidan exactamente con los de la base de datos)
    const clinicas = ['Hemodialisis', 'Nutrición', 'Psicología'];

    // Función para obtener los turnos actuales de todas las clínicas
    const fetchTurnosActuales = async () => {
        setLoading(true);
        const turnos = {};
        let errorOcurred = false;
        
        try {
            // Hacer una solicitud para cada clínica
            await Promise.all(clinicas.map(async (clinica) => {
                try {
                    console.log(`Solicitando turno para clínica: ${clinica}`);
                    const response = await api.get(`/Gturno-actual/${encodeURIComponent(clinica)}`);
                    console.log(`Respuesta para ${clinica}:`, response);
                    
                    // Verificar si la respuesta tiene datos
                    if (response && response.data) {
                        // Si es un array, tomar el primer elemento
                        const data = Array.isArray(response.data) ? response.data[0] : response.data;
                        if (data && data.id_turno_cod) {
                            turnos[clinica] = data;
                        } else {
                            turnos[clinica] = null;
                        }
                    } else {
                        turnos[clinica] = null; // No hay turno activo
                    }
                } catch (error) {
                    console.error(`Error al cargar turno para ${clinica}:`, error);
                    errorOcurred = true;
                    turnos[clinica] = { error: `Error: ${error.message || 'Error desconocido'}` };
                }
            }));
            
            console.log('Datos de turnos actualizados:', turnos);
            setTurnosActuales(turnos);
            
            if (errorOcurred) {
                setError('Algunos turnos no pudieron ser cargados. Ver la consola para más detalles.');
            } else {
                setError(null);
            }
        } catch (err) {
            console.error('Error general al cargar turnos actuales:', err);
            setError(`Error al cargar los turnos: ${err.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    // Función para verificar si hay cambios en los turnos
    const hayCambios = (nuevosTurnos, turnosActuales) => {
        for (const clinica of clinicas) {
            const turnoActual = turnosActuales[clinica];
            const nuevoTurno = nuevosTurnos[clinica];
            
            // Si uno es null y el otro no, hay cambios
            if ((!turnoActual && nuevoTurno) || (turnoActual && !nuevoTurno)) {
                return true;
            }
            
            // Si ambos tienen datos, comparar el ID del turno
            if (turnoActual && nuevoTurno && turnoActual.id_turno_cod !== nuevoTurno.id_turno_cod) {
                return true;
            }
        }
        return false;
    };

    // Variable para almacenar la última vez que se actualizó cada clínica
    const ultimaActualizacionRef = useRef({});
    
    // Función para actualizar los datos solo si hay cambios
    const actualizarDatos = useCallback(async () => {
        try {
            const ahora = Date.now();
            const TIEMPO_ENTRE_ACTUALIZACIONES = 30000; // 30 segundos
            
            // Filtrar clínicas que necesitan actualización (última actualización hace más de 30 segundos)
            const clinicasAActualizar = clinicas.filter(clinica => {
                const ultimaActualizacion = ultimaActualizacionRef.current[clinica] || 0;
                return (ahora - ultimaActualizacion) > TIEMPO_ENTRE_ACTUALIZACIONES;
            });
            
            // Si no hay clínicas para actualizar, salir
            if (clinicasAActualizar.length === 0) {
                return;
            }
            
            // Hacer una sola petición para todas las clínicas que necesitan actualización
            try {
                const responses = await Promise.all(
                    clinicasAActualizar.map(clinica => 
                        api.get(`/Gturno-actual/${encodeURIComponent(clinica)}`)
                            .then(response => ({
                                clinica,
                                data: response?.data,
                                error: null
                            }))
                            .catch(error => {
                                console.error(`Error al obtener turno para ${clinica}:`, error);
                                return { clinica, data: null, error };
                            })
                    )
                );

                // Procesar las respuestas
                setTurnosActuales(prevTurnos => {
                    const nuevosTurnos = { ...prevTurnos };
                    let huboCambios = false;
                    
                    responses.forEach(({ clinica, data, error }) => {
                        if (error) {
                            // Si hay error, mantener el valor actual en caché
                            return;
                        }
                        
                        const dataActual = Array.isArray(data) ? data[0] : data;
                        const turnoActual = prevTurnos[clinica];
                        const nuevoTurno = dataActual?.id_turno_cod ? dataActual : null;
                        
                        // Verificar si hay cambios
                        if ((!turnoActual && nuevoTurno) || 
                            (turnoActual && !nuevoTurno) || 
                            (turnoActual?.id_turno_cod !== nuevoTurno?.id_turno_cod)) {
                            
                            nuevosTurnos[clinica] = nuevoTurno;
                            huboCambios = true;
                            // Actualizar el timestamp de la última actualización
                            ultimaActualizacionRef.current[clinica] = ahora;
                        } else if (nuevoTurno) {
                            // Si no hay cambios pero hay datos, actualizar el timestamp igualmente
                            ultimaActualizacionRef.current[clinica] = ahora;
                        }
                    });
                    
                    return huboCambios ? nuevosTurnos : prevTurnos;
                });
                
            } catch (error) {
                console.error('Error al obtener los turnos:', error);
            }
            
        } catch (error) {
            console.error('Error en la verificación de actualizaciones:', error);
        }
    });
    
    // Efecto para cargar los datos iniciales y configurar la verificación periódica
    useEffect(() => {
        let isMounted = true;
        
        // Cargar datos iniciales
        const cargarDatosIniciales = async () => {
            if (!isMounted) return;
            
            try {
                setLoading(true);
                const ahora = Date.now();
                
                // Inicializar timestamps de última actualización
                clinicas.forEach(clinica => {
                    ultimaActualizacionRef.current[clinica] = 0; // Forzar actualización en la primera carga
                });
                
                // Cargar datos iniciales
                await actualizarDatos();
                
            } catch (error) {
                console.error('Error al cargar datos iniciales:', error);
                if (isMounted) {
                    setError('Error al cargar los datos iniciales');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };
        
        cargarDatosIniciales();
        
        // Configurar verificación periódica cada 30 segundos
        const intervalId = setInterval(() => {
            if (document.visibilityState === 'visible') {
                actualizarDatos();
            }
        }, 30000);
        
        // Verificar cuando la pestaña vuelve a estar visible
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                actualizarDatos();
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Limpiar al desmontar
        return () => {
            isMounted = false;
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Función para obtener el icono de la clínica
    const getClinicaIcon = (clinicaNombre) => {
        const iconStyle = 'w-8 h-8 me-4';
        const iconMap = {
            'Pediatría': <Baby className={iconStyle} />,
            'Ginecología': <User className={iconStyle} />,
            'Oftalmología': <Eye className={iconStyle} />,
            'Ortopedia': <Bone className={iconStyle} />,
            'Cardiología': <HeartPulse className={iconStyle} />,
            'Otorrinolaringología': <Ear className={iconStyle} />,
            'Psicología': <Brain className={iconStyle} />,
            'Enfermería': <Syringe className={iconStyle} />,
            'Farmacia': <Pill className={iconStyle} />,
            'Laboratorio': <Activity className={iconStyle} />,
            'Rayos X': <Activity className={iconStyle} />,
            'Nutrición': <Apple className={iconStyle} />,
            'default': <Hospital className={iconStyle} />
        };
        return iconMap[clinicaNombre] || iconMap['default'];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-slate-900">
                <div className="text-2xl font-semibold text-gray-700 dark:text-white">Cargando turnos...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-slate-900">
                <div className="text-2xl font-semibold text-red-600 dark:text-red-400">{error}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
            <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-bold text-green-800 dark:text-white mb-2">Turnos en Atención</h1>
                </div>

                <div className="flex flex-col items-center gap-8 p-6 w-full max-w-5xl mx-auto">
                    {clinicas.map((clinica) => {
                        const turno = turnosActuales[clinica];
                        console.log(`Renderizando clínica ${clinica}:`, turno);
                        
                        // Verificar si hay un error o si los datos son válidos
                        const hasError = turno && turno.error;
                        const hasData = turno && turno.id_turno_cod;
                        
                        return (
                            <div key={clinica} className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden w-full">
                                <div className={`p-5 text-white ${hasError ? 'bg-red-600' : 'bg-green-700'}`}>
                                    <h2 className="text-2xl font-bold text-center">{clinica}</h2>
                                </div>
                                <div className="p-6 min-h-[250px] flex flex-col md:flex-row gap-6 items-center justify-center">
                                    {loading ? (
                                        <div className="text-gray-500 dark:text-gray-400 w-full text-center">Cargando...</div>
                                    ) : hasError ? (
                                        <div className="text-red-600 dark:text-red-400 w-full text-center">
                                            <p>Error al cargar el turno</p>
                                        </div>
                                    ) : hasData ? (
                                        <>
                                            <div className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-green-200 dark:border-green-800">
                                                {turno.url_foto ? (
                                                    <img 
                                                        src={turno.url_foto}
                                                        alt="Foto del paciente"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                                                        <User className="w-16 h-16 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 text-center md:text-left">
                                                <div className="text-6xl font-bold text-gray-800 dark:text-white mb-3">
                                                    {turno.id_turno_cod}
                                                </div>
                                                <p className="text-2xl text-gray-700 dark:text-gray-200 mb-2 font-medium">
                                                    {turno.nombrepaciente || 'Paciente'}
                                                </p>
                                                <p className="text-lg text-gray-600 dark:text-gray-400 mb-3">
                                                    <span className="font-semibold">Afiliación:</span> {turno.no_afiliacion || 'N/A'}
                                                </p>
                                                <div className="mt-4 inline-block bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 py-2 px-6 rounded-full text-lg font-medium">
                                                    En atención
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-12 w-full text-center">
                                            <p className="text-xl text-gray-500 dark:text-gray-400 italic">Sin turno activo</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        
    );
};
export default LlamadoTurnosTV;