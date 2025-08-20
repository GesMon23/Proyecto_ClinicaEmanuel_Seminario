import React, { useEffect, useState } from 'react';
import api from '../config/api';
import { Container, Row, Col, Card, Form, Navbar, Button, Table } from 'react-bootstrap';
import logoClinica from "@/assets/logoClinica2.png"

const CustomModal = ({ show, onClose, title, message, type }) => {
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
            <div style={overlayStyle} onClick={onClose} />
            <div style={modalStyle}>
                <h4>{title}</h4>
                <p>{message}</p>
                <Button
                    variant={type === 'success' ? 'success' : 'danger'}
                    onClick={onClose}
                    style={{ marginTop: '10px' }}
                >
                    Cerrar
                </Button>
            </div>
        </>
    );
};

const LlamadoTurnos = () => {
    const [turnoMasAntiguo, setTurnoMasAntiguo] = useState(null);
    const [turnoLlamado, setTurnoLlamado] = useState(() => {
    const saved = localStorage.getItem('turnoLlamado');
    return saved ? JSON.parse(saved) : null;
});
    const [clinicas, setClinicas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedClinica, setSelectedClinica] = useState('');
    const [clinicaAsignada, setClinicaAsignada] = useState(null);
    const [botonLlamarHabilitado, setBotonLlamarHabilitado] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState('info'); // 'info', 'success', 'error'
    const [fotoCargando, setFotoCargando] = useState(false);

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
            setClinicas(response.data);
            setLoading(false);
        } catch (error) {
            setError(error);
            setLoading(false);
        }
    };

    const fetchTurnoMasAntiguoPorClinica = async (clinica) => {
        try {
            const response = await api.get(`/turno-mas-antiguo/${encodeURIComponent(clinica)}`);
            setTurnoMasAntiguo(response.data);
            setBotonLlamarHabilitado(true);
        } catch (error) {
            setError(error);
        }
    };

    const handleLlamar = async () => {
        if (!turnoMasAntiguo) {
            showErrorModal('No hay turno para llamar');
            return;
        }

        try {
            setFotoCargando(true);
            
            await api.put(`/llamar-turno/${turnoMasAntiguo.idturno}`);
            const turnoLlamadoResponse = await api.get(`/turno-mas-antiguo/${encodeURIComponent(selectedClinica)}`);
            
            // Verificar y normalizar la URL de la foto
            if (turnoLlamadoResponse.data?.urlfoto) {
                const filename = turnoLlamadoResponse.data.urlfoto.replace(/^.*[\\\/]/, '');
                const fotoExists = await verificarExistenciaFoto(filename);
                
                if (fotoExists) {
                    turnoLlamadoResponse.data.urlfoto = `/fotos/${filename}`;
                } else {
                    turnoLlamadoResponse.data.urlfoto = null;
                }
            }
            
            setTurnoLlamado(turnoLlamadoResponse.data);
            localStorage.setItem('turnoLlamado', JSON.stringify(turnoLlamadoResponse.data));
            await obtenerSiguienteTurno();
            showSuccessModal('Turno llamado exitosamente');
        } catch (error) {
            console.error('Error al llamar turno:', error);
            showErrorModal(`Error al llamar el turno: ${error.response?.data?.detail || error.message}`);
        } finally {
            setFotoCargando(false);
        }
    };

    const obtenerSiguienteTurno = async () => {
        try {
            const response = await api.get(`/turno-mas-antiguo-asignado/${encodeURIComponent(selectedClinica)}`);
            setTurnoMasAntiguo(response.data);
            setBotonLlamarHabilitado(true);
        } catch (error) {
            console.error('Error al obtener siguiente turno:', error);
            setTurnoMasAntiguo(null);
            setBotonLlamarHabilitado(true);
        }
    };

    const handleAbandonar = async () => {
        if (!turnoMasAntiguo) {
            showErrorModal('No hay turno para marcar como abandonado');
            return;
        }

        try {
            await api.put(`/abandonar-turno/${turnoLlamado.idturno}`);
            setTurnoLlamado(null);
localStorage.removeItem('turnoLlamado');
            setBotonLlamarHabilitado(true);
            showSuccessModal('Turno marcado como abandonado');
        } catch (error) {
            console.error('Error al marcar turno como abandonado:', error);
            showErrorModal('Error al marcar el turno como abandonado');
        }
    };

    // Llamar nuevamente: cambia el estado del turno a 3 y refresca la vista
    const handleLlamarNuevamente = async () => {
        if (!turnoLlamado) {
            showErrorModal('No hay un turno llamado para volver a llamar');
            return;
        }
        try {
            await api.put(`/turnoLlamado/${turnoLlamado.idturno}`, { idturnoestado: 3 });
            showSuccessModal('Turno llamado nuevamente');
            // Refrescar el estado para que el cambio se refleje
            await obtenerSiguienteTurno();
        } catch (error) {
            console.error('Error al volver a llamar el turno:', error);
            showErrorModal('Error al volver a llamar el turno');
        }
    };

    const handleFinalizar = async () => {
        if (!turnoLlamado) {
            showErrorModal('No hay un turno activo para finalizar');
            return;
        }

        try {
            const response = await api.put(`/finalizar-turno/${turnoLlamado.idturno}`);
            showSuccessModal(response.data.message);
            setTurnoLlamado(null);
localStorage.removeItem('turnoLlamado');
            setBotonLlamarHabilitado(true);
        } catch (error) {
            console.error('Error al finalizar turno:', error);
            showErrorModal('Error al finalizar el turno');
        }
    };

    const handleClinicaChange = (event) => {
        setSelectedClinica(event.target.value);
    };

    const handleAsignar = async () => {
        if (!selectedClinica) {
            showErrorModal('Selecciona una clínica primero');
            return;
        }

        try {
            setClinicaAsignada(selectedClinica);
            setTurnoLlamado(null);
localStorage.removeItem('turnoLlamado');
            localStorage.removeItem('turnoLlamado');
            showSuccessModal(`Clínica asignada: ${selectedClinica}`);

            await obtenerSiguienteTurno();
        } catch (error) {
            console.error('Error al obtener el turno más antiguo:', error);
            showErrorModal('Error al obtener el turno más antiguo');
        }
    };

    useEffect(() => {
        fetchClinicas();
        // Restaurar turnoLlamado desde localStorage si existe
        const saved = localStorage.getItem('turnoLlamado');
        if (saved) {
            setTurnoLlamado(JSON.parse(saved));
        }
    }, []);

if (loading) return <div>Cargando...</div>;
if (error) return <div className='dark:text-white'>Error: {error.message}</div>;

return (
    <Container fluid>
        <CustomModal
            show={showModal}
            onClose={handleCloseModal}
            title={modalType === 'success' ? 'Éxito' : 'Error'}
            message={modalMessage}
            type={modalType}
        />
        <Row>
            <Col md="6">
                <Card>
                    <Card.Body>
                        <Form>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                <Form.Select
                                    aria-label="select example"
                                    className="form-select btn"
                                    style={{
                                        fontSize: '1rem',
                                        border: '1px solid #186a3b',
                                        borderRadius: '0.25rem',
                                        backgroundColor: '#186a3b',
                                        color: 'white',
                                        cursor: 'pointer',
                                        minWidth: '220px'
                                    }}
                                    value={selectedClinica}
                                    onChange={handleClinicaChange}
                                    disabled={!!turnoMasAntiguo}
                                >
                                    <option value="">Seleccione una clínica</option>
                                    {Array.isArray(clinicas) && clinicas.map((clinica) => (
                                        <option key={clinica.idsala} value={clinica.descripcion}>
                                            {clinica.descripcion}
                                        </option>
                                    ))}
                                </Form.Select>
                                <Button
                                    className="btn-fill pull-right"
                                    type="button"
                                    variant="success"
                                    onClick={handleAsignar}
                                    style={{
                                        backgroundColor: '#2d6a4f',
                                        borderColor: '#2d6a4f',
                                        color: '#ffffff'
                                    }}
                                >
                                    Asignar
                                </Button>
                                <Button
                                    className="btn-fill pull-right"
                                    type="button"
                                    variant="primary"
                                    onClick={obtenerSiguienteTurno}
                                    style={{
                                        backgroundColor: '#007bff',
                                        borderColor: '#007bff',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '6px 10px'
                                    }}
                                    aria-label="Recargar búsqueda de turno"
                                >
                                    <i className="bi bi-arrow-clockwise" style={{ fontSize: '1.2rem' }}></i>
                                </Button>
                            </div>
                            <Row>
                                <Col md="12" className="text-center">
                                    <img
                                        alt="..."
                                        className="logoTurnoPaciente"
                                        src={logoClinica}
                                    />
                                    <hr />
                                </Col>
                                <h4>Turno Actual</h4>
                                <Table className="table-hover table-striped">
                                    <thead>
                                        <tr>
                                            <th className="border-0">No. Afiliación</th>
                                            <th className="border-0">Nombre</th>
                                            <th className="border-0">Turno</th>
                                            <th className="border-0">Clínica</th>
                                            <th className="border-0">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {turnoLlamado ? (
                                            <tr>
                                                <td>{turnoLlamado.noafiliacion}</td>
                                                <td>{turnoLlamado.nombrepaciente}</td>
                                                <td>{turnoLlamado.idturno}</td>
                                                <td>{turnoLlamado.nombreclinica}</td>
                                                <td>{new Date(turnoLlamado.fechaturno).toLocaleDateString()}</td>
                                            </tr>
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="text-center">No hay turno llamado</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </Row>
                            <Row>
                                <Col md="12" className="d-flex justify-content-between">
                                    <Button
                                        className="btn-fill"
                                        type="button"
                                        variant="success"
                                        onClick={handleLlamar}
                                        disabled={!botonLlamarHabilitado || !turnoMasAntiguo}
                                        style={{
                                            backgroundColor: '#2d6a4f',
                                            borderColor: '#2d6a4f',
                                            color: '#ffffff'
                                        }}
                                    >
                                        Llamar
                                    </Button>
                                    <Button
                                        className="btn-fill"
                                        type="button"
                                        variant="success"
                                        onClick={handleAbandonar}
                                        style={{
                                            backgroundColor: '#ffffff',
                                            borderColor: '#2d6a4f',
                                            color: '#2d6a4f'
                                        }}
                                    >
                                        Abandonado
                                    </Button>
                                    <Button
                                        className="btn-fill"
                                        type="button"
                                        variant="danger"
                                        onClick={handleFinalizar}
                                        style={{
                                            backgroundColor: '#9B2C2C',
                                            borderColor: '#9B2C2C',
                                            color: '#ffffff'
                                        }}
                                    >
                                        Finalizar
                                    </Button>
                                    <Button
                                        className="btn-fill"
                                        type="button"
                                        onClick={handleLlamarNuevamente}
                                        disabled={!turnoLlamado}
                                        style={{
                                            backgroundColor: '#007bff',
                                            borderColor: '#007bff',
                                            color: '#fff',
                                            fontWeight: 'normal',
                                            display: 'block'
                                        }}
                                    >
                                        Llamar Nuevamente
                                    </Button>
                                </Col>
                            </Row>
                        </Form>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    </Container>
);
}

export default LlamadoTurnos;