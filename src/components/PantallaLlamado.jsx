import React, { useEffect, useState } from 'react';
import api from '../config/api';

const PantallaLlamado = () => {
    // Intentar desbloquear el audio automáticamente al cargar
    React.useEffect(() => {
        // 1. Probar reproducir un audio silencioso
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const source = ctx.createBufferSource();
            source.buffer = ctx.createBuffer(1, 1, 22050);
            source.connect(ctx.destination);
            source.start(0);
        } catch (e) {
            // Si falla, no pasa nada
        }
        // 2. Probar usar SpeechSynthesis con texto vacío
        try {
            const utterance = new window.SpeechSynthesisUtterance('');
            utterance.volume = 0;
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            // Si falla, no pasa nada
        }
    }, []);

    const [paciente, setPaciente] = useState(null);
    const [turnosSiguientes, setTurnosSiguientes] = useState([]);
    const [turnoLlamado, setTurnoLlamado] = useState(null);
    // Nuevo: guardar el id del último turno mostrado para no volver a mostrarlo
    const [ultimoTurnoMostrado, setUltimoTurnoMostrado] = useState(() => {
        return localStorage.getItem('ultimoTurnoMostrado') || null;
    });
    // Para controlar el temporizador y evitar bugs
    const timerRef = React.useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mostrarPaciente, setMostrarPaciente] = useState(false);
    const [fotoCargando, setFotoCargando] = useState(false);

    // Función para verificar existencia de foto
    const verificarExistenciaFoto = async (filename) => {
        if (!filename) return false;
        
        try {
            const response = await api.get(`/check-photo/${filename}`);
            return response.data.exists;
        } catch (error) {
            console.error('Error al verificar la foto:', error);
            return false;
        }
    };

    // Función para normalizar y verificar la URL de la foto
    const procesarFotoPaciente = async (pacienteData) => {
        if (!pacienteData?.urlfoto) return pacienteData;
        
        const filename = pacienteData.urlfoto.replace(/^.*[\\\/]/, '');
        const fotoExists = await verificarExistenciaFoto(filename);
        
        return {
            ...pacienteData,
            urlfoto: fotoExists ? `/fotos/${filename}` : null
        };
    };

    // Función para decir el nombre del paciente
    // Llama por sonido dos veces, esperando que las voces estén listas
    const decirNombrePaciente = (nombre, clinica) => {
        if (!nombre || !clinica) return;
        // Mensaje exacto solicitado
        const texto = `${nombre} pasar a clínica ${clinica}`;
        let veces = 0;
const maxVeces = 1;
        function hablarConVoz() {
            // Forzar recarga de voces antes de hablar
            window.speechSynthesis.getVoices();
            const voices = window.speechSynthesis.getVoices();
            const spanishVoices = voices.filter(voice => voice.lang.includes('es'));
            if (voices.length === 0) {
                // Esperar a que se carguen las voces
                window.speechSynthesis.onvoiceschanged = () => {
                    hablarConVoz();
                };
                return;
            }
            function hablar() {
                if (veces >= maxVeces) return;
                const utterance = new SpeechSynthesisUtterance();
                utterance.text = texto;
                utterance.lang = 'es-ES';
                utterance.pitch = 1;
                utterance.rate = 0.7;
                utterance.volume = 1;
                if (spanishVoices.length > 0) {
                    utterance.voice = spanishVoices[0];
                }
                utterance.onend = () => {
                    veces++;
                    if (veces < maxVeces) hablar();
                };
                utterance.onerror = () => {
                    setAudioBloqueado(true);
                };
                window.speechSynthesis.speak(utterance);
            }
            hablar();
        }
        // Probar si el navegador bloquea el audio
        try {
            hablarConVoz();
        } catch (e) {
            setAudioBloqueado(true);
        }
    };

    // Mostrar aviso si el navegador bloquea el audio
    const [audioBloqueado, setAudioBloqueado] = useState(false);
    useEffect(() => {
        const onSpeechBlocked = () => {
            setAudioBloqueado(true);
        };
        window.speechSynthesis.onerror = onSpeechBlocked;
        return () => {
            window.speechSynthesis.onerror = null;
        };
    }, []);

    // Mostrar mensaje visible si el audio está bloqueado
    const MensajeAudioBloqueado = () => (
        audioBloqueado ? (
            <div style={{color: 'red', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', marginTop: 10}}>
                ⚠️ El navegador ha bloqueado el audio automático. Haz clic en la pantalla o revisa los permisos de sonido.
            </div>
        ) : null
    );

    useEffect(() => {
        const onSpeechBlocked = () => {
            setAudioBloqueado(true);
        };
        window.speechSynthesis.onerror = onSpeechBlocked;
        return () => {
            window.speechSynthesis.onerror = null;
        };
    }, []);

    const fetchData = async () => {
        try {
            setFotoCargando(true);
            
            // Obtener datos del paciente
            const pacienteResponse = await api.get('/pacientes/165');
            const pacienteProcesado = await procesarFotoPaciente(pacienteResponse.data);
            setPaciente(pacienteProcesado);

            // Obtener turnos siguientes
            const turnosResponse = await api.get('/turnos-siguientes');
            setTurnosSiguientes(turnosResponse.data || []);

            // Obtener turno llamado y procesar su foto
            const turnoLlamadoResponse = await api.get('/turnoLlamado');
            let turnoLlamadoProcesado = turnoLlamadoResponse.data;
            
            // Si hay turno llamado y es diferente al último mostrado, lo mostramos 5 segundos
            if (turnoLlamadoProcesado && turnoLlamadoProcesado.idturno && turnoLlamadoProcesado.idturno !== ultimoTurnoMostrado) {
                turnoLlamadoProcesado = await procesarFotoPaciente(turnoLlamadoProcesado);
                setTurnoLlamado(turnoLlamadoProcesado);
                setMostrarPaciente(true);
                decirNombrePaciente(
                    turnoLlamadoProcesado.nombrepaciente,
                    turnoLlamadoProcesado.nombreclinica
                );

                // Limpiar cualquier temporizador anterior
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(async () => {
                    setMostrarPaciente(false);
                    setTurnoLlamado(null); // Limpiar también el turno mostrado
                    setUltimoTurnoMostrado(turnoLlamadoProcesado.idturno);
                    localStorage.setItem('ultimoTurnoMostrado', turnoLlamadoProcesado.idturno);
                    // Hacer update al backend para marcar el turno como mostrado (estado 6)
                    try {
                        await api.put(`/turnoLlamado/${turnoLlamadoProcesado.idturno}`);
                    } catch (e) {
                        console.error('Error al actualizar el estado del turno:', e);
                    }
                }, 5000);
            } else if (turnoLlamadoProcesado && turnoLlamadoProcesado.idturno === ultimoTurnoMostrado) {
                // Si es el mismo turno ya mostrado, no mostrarlo
                setMostrarPaciente(false);
                setTurnoLlamado(null);
            } else {
                // Si no hay turno llamado
                setMostrarPaciente(false);
                setTurnoLlamado(null);
            }
        } catch (error) {
            console.error('Error al obtener datos:', error);
            setError(error);
        } finally {
            setLoading(false);
            setFotoCargando(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => {
            clearInterval(interval);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#f8f9fa'
            }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#f8f9fa',
                flexDirection: 'column'
            }}>
                <h2 style={{ color: '#dc3545', marginBottom: '20px' }}>Error al cargar los datos</h2>
                <button 
                    className="btn btn-primary"
                    onClick={() => {
                        setError(null);
                        setLoading(true);
                        fetchData();
                    }}
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <>
            {audioBloqueado && (
                <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,background:'#dc3545',color:'#fff',padding:'10px',textAlign:'center'}}>
                    El navegador ha bloqueado el audio. Haz clic en cualquier parte de la pantalla para habilitar el sonido.
                </div>
            )}
            <div
                onClick={() => {
                    if (audioBloqueado) {
                        window.speechSynthesis.resume();
                        setAudioBloqueado(false);
                    }
                }}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: '#6A7B76',
                    overflowY: 'auto',
                    padding: '32px 0',
                    boxSizing: 'border-box',
                    zIndex: 1
                }}
            >
                <div style={{
                    maxWidth: '1800px',
                    margin: '0 auto',
                    padding: '0',
                    height: '100%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                {/* Cabecera logos */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    width: '100%'
                }}>
                    <img
                        alt="Logo de la clínica"
                        src={require("assets/img/logoClinica.png")}
                        style={{ height: '200px', maxWidth: '30vw', objectFit: 'contain' }}
                    />
                    <div style={{
                        textAlign: 'center',
                        flex: 1,
                        minWidth: '300px'
                    }}>
                        <h2 style={{
                            color: '#112018',
                            fontWeight: 'bold',
                            marginBottom: '10px'
                        }}>Clínica Médica Renal Emanuel</h2>
                    </div>
                    <img
                        alt="Logo Chepe"
                        src={require("assets/img/ChepeLogo.png")}
                        style={{ height: '200px', maxWidth: '30vw', objectFit: 'contain' }}
                    />
                </div>

                {/* Fila principal: Foto+clínica | Nombre | Tabla */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'stretch',
                        gap: '0',
                        width: '100%',
                        marginBottom: '28px',
                        flexWrap: 'wrap',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Bloque combinado: Foto, clínica y nombre del paciente */}
                    <div
                        style={{
                            backgroundColor: '#b2bfb9',
                            borderRadius: '18px 0 0 18px',
                            boxShadow: '0 8px 32px rgba(44,62,80,0.13)',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            alignItems: 'stretch',
                            flex: '1 1 66.66%',
                            width: '66.66%',
                            maxWidth: '66.66%',
                            minWidth: 0,
                            boxSizing: 'border-box',
                            margin: 0,
                        }}
                    >
                        {/* Contenedor principal horizontal */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                        }}>
                            {/* Foto */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                marginRight: '40px',
                            }}>
                                {fotoCargando ? (
                                    <div style={{
                                        width: '500px',
                                        height: '500px',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: '#f0f0f0',
                                        borderRadius: '10px',
                                        border: '1px solid #2d6a4f'
                                    }}>
                                        <span style={{ color: '#888', fontSize: '1.2em' }}>Cargando foto...</span>
                                    </div>
                                ) : (
                                    <img
                                        alt={mostrarPaciente && turnoLlamado ? `Foto de ${turnoLlamado.nombrepaciente}` : "Foto de perfil"}
                                        src={
                                            mostrarPaciente && turnoLlamado?.urlfoto 
                                                ? `${api.defaults.baseURL}${turnoLlamado.urlfoto.startsWith('/') ? turnoLlamado.urlfoto : `/${turnoLlamado.urlfoto}`}?${Date.now()}`
                                                : require("assets/img/default-avatar.png")
                                        }
                                        style={{
                                            boxShadow: '0 40px 120px 0px rgba(44,62,80,0.18)',
                                            width: '500px',
                                            height: '500px',
                                            borderRadius: '18px',
                                            objectFit: 'cover',
                                            background: '#3dc',
                                            border: 'none',
                                            transition: 'box-shadow 0.2s',
                                            maxWidth: '100%',
                                            maxHeight: '90vw',
                                        }}
                                    />
                                )}
                            </div>
                            {/* Nombre del paciente */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'flex-start',
                                flex: 1,
                                minWidth: 0,
                            }}>
                                <span style={{
                                    color: '#2d6a4f',
                                    fontWeight: 'bold',
                                    fontSize: '1.35em',
                                    marginBottom: '8px',
                                    display: 'block'
                                }}>Nombre del paciente:</span>
                                <span style={{
                                    color: '#1b4332',
                                    fontWeight: 'bold',
                                    fontSize: '2.2em',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.07)',
                                    wordBreak: 'break-word',
                                    lineHeight: 1.2,
                                }}>
                                    {mostrarPaciente && turnoLlamado ? turnoLlamado.nombrepaciente : 'Sin paciente asignado'}
                                </span>
                            </div>
                        </div>

                    </div>
                    {/* Bloque derecho: Tabla Turnos siguientes */}
                    <div
                        style={{
                            backgroundColor: '#e3e6e5',
                            padding: '20px',
                            borderRadius: '0 18px 18px 0',
                            boxShadow: '0 8px 32px rgba(44,62,80,0.13)',
                            flex: '0 0 33.33%',
                            width: '33.33%',
                            maxWidth: '33.33%',
                            minWidth: '260px',
                            boxSizing: 'border-box',
                            overflowX: 'auto',
                            margin: 0,
                        }}
                    >
                        <h2 style={{
                            color: '#2d6a4f',
                            fontWeight: 'bold',
                            marginBottom: '20px'
                        }}>Turnos siguientes</h2>
                        <div style={{
                            overflowX: 'auto',
                            marginBottom: '20px'
                        }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                backgroundColor: '#e3e6e5'
                            }}>
                                <thead>
                                    <tr style={{
                                        backgroundColor: '#b2bfb9',
                                        borderBottom: '2px solid #2d6a4f'
                                    }}>
                                        <th style={{
                                            padding: '12px',
                                            textAlign: 'left',
                                            color: '#2d6a4f',
                                            fontWeight: 'bold'
                                        }}>Nombre del paciente</th>
                                        <th style={{
                                            padding: '12px',
                                            textAlign: 'left',
                                            color: '#2d6a4f',
                                            fontWeight: 'bold'
                                        }}>Sala</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {turnosSiguientes.length > 0 ? (
                                        turnosSiguientes.map((turno, index) => (
                                            <tr key={index} style={{
                                                borderBottom: '1px solid #e0e0e0'
                                            }}>
                                                <td style={{
                                                    padding: '12px',
                                                    color: '#333'
                                                }}>
                                                    <h3 style={{
                                                        margin: 0,
                                                        fontSize: '1.1em'
                                                    }}>{turno.nombrepaciente || 'Nombre no disponible'}</h3>
                                                </td>
                                                <td style={{
                                                    padding: '12px',
                                                    color: '#333'
                                                }}>
                                                    <h3 style={{
                                                        margin: 0,
                                                        fontSize: '1.1em'
                                                    }}>{turno.nombreclinica || 'Clínica no disponible'}</h3>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="2" style={{
                                                padding: '20px',
                                                textAlign: 'center',
                                                color: '#6c757d'
                                            }}>
                                                No hay turnos siguientes
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* Bloque inferior: Clínica asignada */}
                    <div style={{
                        width: '100%',
                        minHeight: '80px',
                        background: '#c3cbc7',
                        marginTop: '32px',
                        borderRadius: '18px',
                        boxShadow: '0 8px 32px rgba(44,62,80,0.13)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px 12px',
                    }}>
                        <span style={{
                            color: '#2d6a4f',
                            fontWeight: 'bold',
                            fontSize: '1.35em',
                            marginBottom: '8px',
                            display: 'block',
                            letterSpacing: '1px',
                        }}>Clínica asignada</span>
                        <span style={{
                            color: '#1b4332',
                            fontWeight: 'bold',
                            fontSize: '2.2em',
                            minHeight: '32px',
                            display: 'block',
                            textShadow: '0 1px 2px rgba(0,0,0,0.07)',
                            wordBreak: 'break-word',
                        }}>
                            {mostrarPaciente && turnoLlamado ? turnoLlamado.nombreclinica : 'Sin clínica asignada'}
                        </span>
                    </div>
                </div>
                {/* Responsividad: apilar en pantallas pequeñas */}
                <style>{`
                    @media (max-width: 900px) {
                        .pantalla-flex-main {
                            flex-direction: column !important;
                        }
                        .pantalla-flex-main > div {
                            width: 100% !important;
                            border-radius: 12px !important;
                            border-right: 1.5px solid #2d6a4f !important;
                            border-left: 1.5px solid #2d6a4f !important;
                        }
                        .pantalla-flex-main > div:last-child {
                            margin-top: 16px;
                        }
                    }
                `}</style>
            </div>
        </div>
        </>
    );
}

export default PantallaLlamado;