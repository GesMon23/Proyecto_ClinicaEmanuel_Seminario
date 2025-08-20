import React, { useState, useRef } from 'react';
import api from '../config/api';
import {
    Container,
    Row,
    Col,
    Card,
    Form,
    Button,
    Table
} from 'react-bootstrap';
import WebcamFoto from '@/components/WebcamFoto.jsx';
import logoClinica from "@/assets/logoClinica2.png"

const CustomModal = ({ show, onClose, title, message, type, action, children }) => {
    if (!show) return null;

    const modalStyle = {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000
    };

    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 999
    };

    return (
        <>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                onClick={onClose}
            >
                <div
                    className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-lg w-full max-w-md mx-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h4 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                        {title}
                    </h4>
                    <p className='text-gray-800 dark:text-white mb-4'>{message}</p>
                    {children}
                </div>
            </div>
        </>
    );
};

const AsignarTurno = () => {
    const [asignacionPacientes, setAsignacionPacientes] = useState([]); // Estado para los pacientes
    const [numeroAfiliacion, setNumeroAfiliacion] = useState(''); // Estado para el número de afiliación
    const [loading, setLoading] = useState(false); // Estado para manejar la carga
    const [error, setError] = useState(null); // Estado para manejar errores
    const [showModal, setShowModal] = useState(false); // Estado para controlar el modal
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState('info');
    const [pacienteSinFoto, setPacienteSinFoto] = useState(null); // Nuevo estado para el paciente sin foto
    const [photo, setPhoto] = useState(null); // Estado para la foto capturada
    const webcamRef = useRef(null);
    const [imgSrc, setImgSrc] = useState(null);
    const [isSendingPhoto, setIsSendingPhoto] = useState(false);
    const [showCamModal, setShowCamModal] = useState(false);
    const [showFaltanteModal, setShowFaltanteModal] = useState(false);
    const [motivoFalta, setMotivoFalta] = useState('');
    const [pacienteFaltante, setPacienteFaltante] = useState(null);
    const [sendingFaltante, setSendingFaltante] = useState(false);

    // Función para buscar pacientes por número de afiliación
    const buscarPacientes = async () => {
        setLoading(true);
        setError(null);

        try {
            // Primero verificamos si el paciente tiene foto
            const pacienteResponse = await api.get(`/pacientes/${numeroAfiliacion}`);

            // Luego buscamos los turnos disponibles
            const turnosResponse = await api.get(`/asignacionPacientes?noafiliacion=${numeroAfiliacion}`);

            // Verificar si existen turnos
            if (turnosResponse.data.length === 0) {
                setShowModal(true);
                setModalMessage('No se encontraron registros para el número de afiliación proporcionado');
                setModalType('error');
                return;
            }

            // Si el paciente no tiene foto, abrir directamente el modal de cámara y no permitir continuar sin foto
            if (!pacienteResponse.data.urlfoto) {
                setPacienteSinFoto(turnosResponse.data[0]);
                setShowCamModal(true);
                setImgSrc(null);
                return;
            }

            // Si tiene foto, mostramos los turnos directamente
            setAsignacionPacientes(turnosResponse.data);
            setNumeroAfiliacion('');
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

    // Nueva función para abrir/cerrar el modal de cámara y capturar la imagen usando WebcamFoto
    const openCamModal = () => setShowCamModal(true);
    const closeCamModal = () => setShowCamModal(false);
    const handleCapturePhoto = (imageSrc) => {
        setImgSrc(imageSrc);
        setShowCamModal(false);
    };

    // Función para enviar la foto al servidor
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
                // Después de guardar la foto exitosamente, volvemos a buscar los turnos
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

    // Función para manejar el clic en el botón del modal
    // Ya no se usa para advertencia, solo para éxito/error
    const handleModalAction = (action) => {
        setShowModal(false);
    };

    // Función para cerrar el modal
    const handleCloseModal = (action) => {
        setImgSrc(null);
        handleModalAction(action);
    };

    // Función para manejar el clic en "Asignar"
    const handleAsignar = async (turnoId) => {
        try {
            const response = await api.put(`/asignar-turno/${turnoId}`);
            setShowModal(true);
            setModalMessage('Turno asignado exitosamente');
            setModalType('success');

            // Limpia la vista después de asignar
            setAsignacionPacientes([]); // Restablece la lista de pacientes a vacío
            setNumeroAfiliacion(''); // Limpia el campo de búsqueda
        } catch (error) {
            console.error('Error asignando turno:', error);
            setShowModal(true);
            setModalMessage('Error al asignar el turno');
            setModalType('error');
        }
    };

    // Función para manejar el clic en "Faltante"
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
            // Update tbl_turnos usando el endpoint correcto
            await api.put(`/turnoLlamado/${pacienteFaltante.idturno}`, { idturnoestado: 7 });
            // Insert into tbl_faltistas
            await api.post('/registrar-faltista', {
                noafiliacion: pacienteFaltante.noafiliacion,
                fechaFalta: pacienteFaltante.fechaturno.split('T')[0],
                motivoFalta: motivoFalta.trim()
            });
            setShowFaltanteModal(false);
            setShowModal(true);
            setModalMessage('Falta registrada correctamente.');
            setModalType('success');
            setAsignacionPacientes([]);
            setNumeroAfiliacion('');
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
        <>
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
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition duration-200 mt-4"
                    >
                        Cerrar
                    </button>

                )}
            </CustomModal>

            <CustomModal show={showCamModal} onClose={closeCamModal} title="Captura de Fotografía">
                <WebcamFoto onCapture={handleCapturePhoto} onCancel={closeCamModal} />
            </CustomModal>

            <CustomModal show={showFaltanteModal} onClose={() => setShowFaltanteModal(false)} title="Registrar falta">
                <Form>
                    <Form.Group>
                        <Form.Label>Motivo</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={motivoFalta}
                            onChange={e => setMotivoFalta(e.target.value)}
                            placeholder="Ingrese el motivo de la falta"
                            disabled={sendingFaltante}
                        />
                    </Form.Group>
                    <div className="mt-3 d-flex justify-content-end" style={{ gap: 8 }}>
                        <Button variant="danger" onClick={handleEnviarFaltante} disabled={sendingFaltante}>
                            {sendingFaltante ? 'Enviando...' : 'Enviar'}
                        </Button>
                        <Button variant="secondary" onClick={() => setShowFaltanteModal(false)} disabled={sendingFaltante}>
                            Cancelar
                        </Button>
                    </div>
                </Form>
            </CustomModal>

            <Container fluid className="px-3 md:px-5 lg:px-8 py-4">
                <Row className="justify-content-center">
                    <Col md="12">
                        <Card className="shadow-sm rounded-lg">
                            <Card.Body className="p-4 sm:p-5 md:p-6">
                                <div className="form-container flex flex-col items-center">
                                    <Row className="w-full justify-content-center">
                                        <Col xs="12" md="8" className="text-center">
                                            <img
                                                alt="Logo Clínica"
                                                src={logoClinica}
                                                className=" mx-auto mb-4"
                                            />
                                            <hr className="my-4 border-t border-gray-300 dark:border-gray-600" />
                                        </Col>

                                        <Col md="12">
                                            <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3 mb-4">
                                                {/* Input */}
                                                <div className="w-full sm:w-1/2 md:w-1/3">
                                                    <input
                                                        type="text"
                                                        placeholder="Número de Afiliación"
                                                        value={numeroAfiliacion}
                                                        onChange={(e) => setNumeroAfiliacion(e.target.value)}
                                                        className="w-full text-base px-4 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                                                    />
                                                </div>

                                                {/* Botón */}
                                                <div className="w-full sm:w-auto text-center">
                                                    <button
                                                        type="button"
                                                        onClick={buscarPacientes}
                                                        disabled={loading}
                                                        className="w-full sm:w-auto bg-[#2d6a4f] hover:bg-[#24543d] text-white font-semibold px-6 py-2 rounded shadow-sm transition duration-200 disabled:opacity-60"
                                                    >
                                                        {loading ? 'Buscando...' : 'Buscar'}
                                                    </button>
                                                </div>
                                            </div>

                                            <hr className="my-4 border-t border-gray-300 dark:border-gray-600" />
                                        </Col>


                                        {/* Tabla de pacientes */}
                                        <div className="overflow-x-auto mt-4 rounded-lg shadow">
                                            <table className="w-full mt-4 table-auto border border-gray-300 dark:border-gray-600 text-sm text-center bg-white dark:bg-slate-800">
                                                <thead className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">

                                                    <tr>
                                                        <th className="p-2 border dark:border-gray-600">No. Afiliación</th>
                                                        <th className="p-2 border dark:border-gray-600">Nombre</th>
                                                        <th className="p-2 border dark:border-gray-600">Turno</th>
                                                        <th className="p-2 border dark:border-gray-600">Clínica</th>
                                                        <th className="p-2 border dark:border-gray-600">Fecha</th>
                                                        <th className="p-2 border dark:border-gray-600">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-slate-800">
                                                    {asignacionPacientes.map((paciente) => (
                                                        <tr key={paciente.noafiliacion}>
                                                            <td className="p-2 border dark:border-gray-600">{paciente.noafiliacion}</td>
                                                            <td className="p-2 border dark:border-gray-600">{paciente.nombrepaciente}</td>
                                                            <td className="p-2 border dark:border-gray-600">{paciente.idturno}</td>
                                                            <td className="p-2 border dark:border-gray-600">{paciente.nombreclinica}</td>
                                                            <td className="p-2 border dark:border-gray-600">
                                                                {new Date(paciente.fechaturno).toLocaleDateString()}
                                                            </td>
                                                            <td className="p-2 border dark:border-gray-600 flex flex-col sm:flex-row gap-2">
                                                                <button
                                                                    onClick={() => handleAsignar(paciente.idturno)}
                                                                    className="bg-[#2d6a4f] hover:bg-[#24543d] text-white font-semibold px-4 py-2 rounded shadow-sm transition w-full sm:w-auto"
                                                                >
                                                                    Asignar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleFaltante(paciente)}
                                                                    disabled={
                                                                        !(
                                                                            paciente.nombreclinica &&
                                                                            paciente.nombreclinica.toLowerCase().includes("hemodialisis")
                                                                        )
                                                                    }
                                                                    className={`bg-[#dc3545] hover:bg-[#b02a37] text-white font-semibold px-4 py-2 rounded shadow-sm transition w-full sm:w-auto ${!(paciente.nombreclinica &&
                                                                        paciente.nombreclinica.toLowerCase().includes("hemodialisis"))
                                                                        ? "opacity-60 cursor-not-allowed"
                                                                        : ""
                                                                        }`}
                                                                >
                                                                    Faltante
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="clearfix"></div>
                                    </Row>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </>
    );
}

export default AsignarTurno;