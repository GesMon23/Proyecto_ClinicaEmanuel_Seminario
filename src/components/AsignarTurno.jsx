import React, { useState, useRef } from 'react';
import api from '../config/api';
import WebcamFoto from '@/components/WebcamFoto.jsx';
import logoClinica from "@/assets/logoClinica2.png";

const CustomModal = ({ show, onClose, title, message, type, action, children }) => {
    if (!show) return null;

    return (
        <>
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-50"
                onClick={onClose}
            />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl z-50 max-w-md w-full mx-4">
                <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{title}</h4>
                {message && <p className="text-gray-700 dark:text-gray-300 mb-4">{message}</p>}
                {children}
            </div>
        </>
    );
};

const AsignarTurno = () => {
    const [asignacionPacientes, setAsignacionPacientes] = useState([]);
    const [numeroAfiliacion, setNumeroAfiliacion] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState('info');
    const [pacienteSinFoto, setPacienteSinFoto] = useState(null);
    const [photo, setPhoto] = useState(null);
    const webcamRef = useRef(null);
    const [imgSrc, setImgSrc] = useState(null);
    const [isSendingPhoto, setIsSendingPhoto] = useState(false);
    const [showCamModal, setShowCamModal] = useState(false);
    const [showFaltanteModal, setShowFaltanteModal] = useState(false);
    const [motivoFalta, setMotivoFalta] = useState('');
    const [pacienteFaltante, setPacienteFaltante] = useState(null);
    const [sendingFaltante, setSendingFaltante] = useState(false);
    // Paginación (similar a GestionTurno.jsx)
    const [paginaActual, setPaginaActual] = useState(1);
    const [filasPorPagina, setFilasPorPagina] = useState(5);
    const totalPaginas = Math.ceil(asignacionPacientes.length / filasPorPagina) || 1;
    const turnosPaginados = asignacionPacientes.slice(
        (paginaActual - 1) * filasPorPagina,
        paginaActual * filasPorPagina
    );

    // Función para buscar pacientes por número de afiliación
    const buscarPacientes = async () => {
        setLoading(true);
        setError(null);

        try {
            if (!numeroAfiliacion) {
                setShowModal(true);
                setModalMessage('Ingrese el número de afiliación');
                setModalType('error');
                return;
            }

            // Endpoints alineados con BackGestionTurno.js
            const pacienteResponse = await api.get(`/GpacientesT/${numeroAfiliacion}`);
            const turnosResponse = await api.get(`/GmuestraTurnosT?noafiliacion=${numeroAfiliacion}`);

            if (turnosResponse.data.length === 0) {
                setShowModal(true);
                setModalMessage('No se encontraron registros para el número de afiliación proporcionado');
                setModalType('error');
                return;
            }

            // Si no hay foto, no bloqueamos el flujo de asignación. Podrías mostrar aviso opcional.
            // if (!pacienteResponse.data.url_foto) { ... }

            setAsignacionPacientes(turnosResponse.data);
            setNumeroAfiliacion('');
            setPaginaActual(1);
        } catch (error) {
            console.error('Error fetching data:', error);
            setError(error);
            setShowModal(true);
            setModalMessage('Error al buscar pacientes');
            setModalType('error');
        } finally {
            setLoading(false);
        }
    };

    const openCamModal = () => setShowCamModal(true);
    const closeCamModal = () => setShowCamModal(false);
    const handleCapturePhoto = (imageSrc) => {
        setImgSrc(imageSrc);
        setShowCamModal(false);
    };

    const sendPhoto = async (photoData) => {
        if (!photoData || !pacienteSinFoto) return;

        setIsSendingPhoto(true);
        try {
            console.log('Enviando foto para paciente:', pacienteSinFoto.noafiliacion);

            const response = await api.post('/upload-photo', {
                noAfiliacion: pacienteSinFoto.noafiliacion,
                photo: photoData
            });

            if (response.data.success) {
                const turnosResponse = await api.get(`/asignacionPacientes?noafiliacion=${pacienteSinFoto.noafiliacion}`);
                setAsignacionPacientes(turnosResponse.data);
                handleModalAction('aceptar');
            } else {
                throw new Error('Error al subir la foto');
            }
        } catch (error) {
            console.error('Error al enviar la foto:', error);
            setShowModal(true);
            setModalMessage(`Error al enviar la foto: ${error.message}`);
            setModalType('error');
        } finally {
            setIsSendingPhoto(false);
        }
    };

    const handleModalAction = (action) => {
        setShowModal(false);
    };

    const handleCloseModal = (action) => {
        setImgSrc(null);
        handleModalAction(action);
    };

    const handleAsignar = async (turnoId) => {
        try {
            const response = await api.put(`/Gasignar-turnoT/${turnoId}`);
            setShowModal(true);
            setModalMessage('Turno asignado exitosamente');
            setModalType('success');

            setAsignacionPacientes([]);
            setNumeroAfiliacion('');
        } catch (error) {
            console.error('Error asignando turno:', error);
            setShowModal(true);
            setModalMessage('Error al asignar el turno');
            setModalType('error');
        }
    };

    const handleFaltante = (paciente) => {
        setPacienteFaltante(paciente);
        setMotivoFalta('');
        setShowFaltanteModal(true);
    };

    const handleEnviarFaltante = async () => {
        if (!motivoFalta.trim()) {
            setShowModal(true);
            setModalMessage('Debe ingresar un motivo.');
            setModalType('error');
            return;
        }
        setSendingFaltante(true);
        try {
            // Asegurar campos correctos provenientes de la tabla: id_turno, fecha_turno, nombre_clinica
            const idTurno = pacienteFaltante?.id_turno;
            const fechaTurno = pacienteFaltante?.fecha_turno;
            const nombreClinica = pacienteFaltante?.nombre_clinica;

            if (!idTurno) {
                throw new Error('No se encontró el identificador del turno.');
            }

            const fechaFaltaStr = fechaTurno ? new Date(fechaTurno).toISOString().split('T')[0] : null;
            if (!fechaFaltaStr) {
                throw new Error('No se pudo determinar la fecha del turno para registrar la falta.');
            }

            await api.put(`/Gfaltante-turnoT/${idTurno}`, { idturnoestado: 7 });
            await api.post('/Gregistrar-faltistaT', {
                noafiliacion: pacienteFaltante.noafiliacion,
                fechaFalta: fechaFaltaStr,
                motivoFalta: motivoFalta.trim(),
                nombreClinica: nombreClinica
            });
            // Refrescar automáticamente la lista de turnos del paciente afectado
            try {
                const turnosRefrescados = await api.get(`/GmuestraTurnosT?noafiliacion=${pacienteFaltante.noafiliacion}`);
                setAsignacionPacientes(turnosRefrescados.data || []);
                // Ajustar la página si quedó fuera de rango
                const nuevasPaginas = Math.max(1, Math.ceil((turnosRefrescados.data || []).length / filasPorPagina));
                setPaginaActual(prev => Math.min(prev, nuevasPaginas));
            } catch (e) {
                console.warn('No se pudo refrescar la lista tras registrar falta', e);
            }

            setShowFaltanteModal(false);
            setShowModal(true);
            setModalMessage(`Falta registrada correctamente. Turno #${pacienteFaltante.id_turno_cod || idTurno}`);
            setModalType('success');
        } catch (error) {
            console.error('Error registrando falta:', error);
            setShowModal(true);
            setModalMessage('Error al registrar la falta.');
            setModalType('error');
        } finally {
            setSendingFaltante(false);
        }
    };

    return (
        <div className="w-full">
            <CustomModal
                show={showModal}
                onClose={handleCloseModal}
                title={modalType === 'success' ? 'Éxito' : modalType === 'error' ? 'Error' : ''}
                message={modalMessage}
                type={modalType}
            >
                {modalType !== 'success' && modalType !== 'error' ? null : (
                    <button
                        onClick={handleCloseModal}
                        className={`w-full ${modalType === 'success' ? 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700' : 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'} text-white font-semibold py-2 px-4 rounded transition-colors`}
                    >
                        Cerrar
                    </button>
                )}
            </CustomModal>

            <CustomModal show={showCamModal} onClose={closeCamModal} title="Captura de Fotografía">
                <WebcamFoto onCapture={handleCapturePhoto} onCancel={closeCamModal} />
            </CustomModal>

            <CustomModal show={showFaltanteModal} onClose={() => setShowFaltanteModal(false)} title="Registrar falta">
                <div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Motivo
                        </label>
                        <textarea
                            rows={3}
                            value={motivoFalta}
                            onChange={e => setMotivoFalta(e.target.value)}
                            placeholder="Ingrese el motivo de la falta"
                            disabled={sendingFaltante}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={handleEnviarFaltante}
                            disabled={sendingFaltante}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded transition-colors dark:bg-green-600 dark:hover:bg-green-700 dark:disabled:bg-gray-600"
                        >
                            {sendingFaltante ? 'Enviando...' : 'Enviar'}
                        </button>
                        <button
                            onClick={() => setShowFaltanteModal(false)}
                            disabled={sendingFaltante}
                            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded transition-colors dark:bg-gray-600 dark:hover:bg-gray-700 dark:disabled:bg-gray-600"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </CustomModal>

                <div className="flex flex-col items-center">
                    {/* Header (igual que en EgresoPacientes: solo imagen y H1) */}
                    <div className="w-full text-center mb-6">
                        <div className="flex items-center justify-center gap-6 flex-wrap">
                            <img
                                src={logoClinica}
                                alt="Logo Clínica"
                                className="h-[180px] max-w-[320px] object-contain bg-white rounded-xl shadow-md p-2 dark:bg-slate-800"
                            />
                            <h1 className="text-3xl font-bold text-green-800 dark:text-white">
                                Asignar Turno
                            </h1>
                        </div>
                    </div>

                    {/* Controles de búsqueda */}
                    <div className="flex items-center gap-4 flex-wrap mb-6 w-full justify-center">
                        <input
                            type="text"
                            placeholder="Número de Afiliación"
                            value={numeroAfiliacion}
                            onChange={(e) => setNumeroAfiliacion(e.target.value)}
                            className="text-lg px-4 py-2 w-56 rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <button
                            type="button"
                            onClick={buscarPacientes}
                            disabled={loading}
                            className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-base font-semibold py-2 px-5 rounded transition-colors dark:bg-green-600 dark:hover:bg-green-700 dark:disabled:bg-gray-600"
                        >
                            {loading ? 'Buscando...' : 'Buscar'}
                        </button>
                    </div>

                    <hr className="w-full border-gray-300 dark:border-gray-600 mb-6" />

                    {/* Tabla de pacientes */}
                    {asignacionPacientes.length > 0 && (
                        <div className="w-full">
                            {/* Controles de tabla */}
                            <div className="flex items-center justify-end mb-2 gap-3">
                                <label className="text-sm text-gray-700 dark:text-gray-300">Filas por página:</label>
                                <select
                                    value={filasPorPagina}
                                    onChange={(e) => { setFilasPorPagina(parseInt(e.target.value, 10)); setPaginaActual(1); }}
                                    className="px-2 py-1 border border-gray-300 dark:border-slate-700 rounded-md dark:bg-slate-800 dark:text-white"
                                >
                                    <option value={3}>3</option>
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={15}>15</option>
                                </select>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full table-auto border border-gray-300 dark:border-gray-600 text-sm text-center bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
                                    <thead className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">
                                        <tr>
                                            <th className="p-3 border dark:border-gray-600 font-semibold">No. Afiliación</th>
                                            <th className="p-3 border dark:border-gray-600 font-semibold">Nombre</th>
                                            <th className="p-3 border dark:border-gray-600 font-semibold">Código Turno</th>
                                            <th className="p-3 border dark:border-gray-600 font-semibold">Clínica</th>
                                            <th className="p-3 border dark:border-gray-600 font-semibold">Fecha</th>
                                            <th className="p-3 border dark:border-gray-600 font-semibold">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                        {turnosPaginados.map((t, idx) => (
                                            <tr key={t.id_turno || idx} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                                <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t.noafiliacion}</td>
                                                <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t.nombrepaciente}</td>
                                                <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t.id_turno_cod || t.id_turno}</td>
                                                <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t.nombre_clinica}</td>
                                                <td className="p-3 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t.fecha_turno ? new Date(t.fecha_turno).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''}</td>
                                                <td className="p-3 border dark:border-gray-600">
                                                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                                        <button
                                                            onClick={() => handleAsignar(t.id_turno)}
                                                            className="bg-green-700 hover:bg-green-800 text-white text-base font-semibold py-1 px-3 rounded transition-colors dark:bg-green-600 dark:hover:bg-green-700"
                                                        >
                                                            Asignar
                                                        </button>
                                                        <button
                                                            onClick={() => handleFaltante(t)}
                                                            disabled={!(t.nombre_clinica && t.nombre_clinica.toLowerCase().includes("hemodialisis"))}
                                                            className={`bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-base font-semibold py-1 px-3 rounded transition-colors dark:bg-red-600 dark:hover:bg-red-700 dark:disabled:bg-gray-600 ${!(t.nombre_clinica && t.nombre_clinica.toLowerCase().includes("hemodialisis")) ? "opacity-60" : ""}`}
                                                        >
                                                            Faltante
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginación */}
                            {totalPaginas > 1 && (
                                <div className="flex flex-wrap justify-center items-center gap-2 mt-4">
                                    <button
                                        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                                        disabled={paginaActual === 1}
                                        onClick={() => setPaginaActual(paginaActual - 1)}
                                    >
                                        Anterior
                                    </button>
                                    {[...Array(totalPaginas)].map((_, i) => (
                                        <button
                                            key={i}
                                            className={`px-3 py-2 rounded-lg transition-colors ${
                                                paginaActual === i + 1
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                                            }`}
                                            onClick={() => setPaginaActual(i + 1)}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                                        disabled={paginaActual === totalPaginas}
                                        onClick={() => setPaginaActual(paginaActual + 1)}
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            
        </div>
    );
};

export default AsignarTurno;