import React, { useState, useEffect } from 'react';
import api from '../config/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import logoClinica from "@/assets/logoClinica2.png"
import {
    Container,
    Row,
    Col,
    Card,
    Form,
    Button,
    Table
} from 'react-bootstrap';

const CustomModal = ({ show, onClose, title, message, type, onConfirm }) => {
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
                {type === 'confirm' ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <Button variant="danger" onClick={onConfirm}>Sí, eliminar</Button>
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    </div>
                ) : (
                    <Button 
                        variant={type === 'success' ? 'success' : 'danger'} 
                        onClick={onClose}
                        style={{ marginTop: '10px' }}
                    >
                        Cerrar
                    </Button>
                )}
            </div>
        </>
    );
};

const GestionTurno = () => {
    const [numeroAfiliacion, setNumeroAfiliacion] = useState('');
    const [opcionSeleccionada, setOpcionSeleccionada] = useState('');
    const [nombrePaciente, setNombrePaciente] = useState('');
    const [clinicas, setClinicas] = useState([]);
    const [turnos, setTurnos] = useState([]);
    const [eventosCalendario, setEventosCalendario] = useState([]);
    const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [turnoEditando, setTurnoEditando] = useState(null);
    const [calendarioHabilitado, setCalendarioHabilitado] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState('info');
    const [idTurnoAEliminar, setIdTurnoAEliminar] = useState(null);
    const [onConfirmEliminar, setOnConfirmEliminar] = useState(null);
    // Nuevo estado para jornadas y días permitidos
    const [jornadas, setJornadas] = useState([]);
    const [diasPermitidos, setDiasPermitidos] = useState([]);

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

    // Cargar jornadas al inicio
    useEffect(() => {
        const fetchJornadas = async () => {
            try {
                const response = await api.get('/jornadas');
                setJornadas(response.data);
            } catch (error) {
                showErrorModal('Error al cargar jornadas');
            }
        };
        fetchJornadas();
    }, []);

    useEffect(() => {
        const fetchClinicas = async () => {
            try {
                const response = await api.get('/clinicas');
                setClinicas(response.data);
            } catch (error) {
                showErrorModal(error);
            }
        };

        fetchClinicas();
    }, []);

    const handleNumeroAfiliacionChange = (e) => {
        setNumeroAfiliacion(e.target.value);
        setCalendarioHabilitado(false); 
    };

    const handleOpcionChange = (e) => {
        setOpcionSeleccionada(e.target.value);
    };

    const handleBuscar = async () => {
        try {
            const response = await api.get(`/pacientes/${numeroAfiliacion}`);
            const paciente = response.data;

            if (paciente) {
                if (paciente.idestado === 3) {
                    showErrorModal('El paciente está egresado y no puede agendar turnos.');
                    setNumeroAfiliacion('');
                    setNombrePaciente('');
                    setCalendarioHabilitado(false);
                    setTurnos([]);
                    setEventosCalendario([]);
                    setDiasPermitidos([]);
                    return;
                }
                setNombrePaciente(`${paciente.primernombre} ${paciente.primerapellido}`);
                setCalendarioHabilitado(true); 

                // Buscar la jornada del paciente y setear los días permitidos
                if (paciente.idjornada) {
                    const jornadaPaciente = jornadas.find(j => j.idjornada === paciente.idjornada);
                    if (jornadaPaciente && jornadaPaciente.dias) {
                        // Suponiendo que los días vienen como "Lunes,Miércoles,Viernes"
                        const dias = jornadaPaciente.dias.split(',').map(d => d.trim().toLowerCase());
                        setDiasPermitidos(dias);
                    } else {
                        setDiasPermitidos([]);
                    }
                } else {
                    setDiasPermitidos([]);
                }

                const turnosResponse = await api.get(`/asignacionPacientes?noafiliacion=${numeroAfiliacion}`);
                const turnosPaciente = turnosResponse.data;
                setTurnos(turnosPaciente);

                const eventos = turnosPaciente.map(turno => ({
                    title: `Clínica: ${turno.nombreclinica}`,
                    start: new Date(turno.fechaturno),
                    end: new Date(new Date(turno.fechaturno).getTime() + 24 * 60 * 60 * 1000),
                    allDay: true,
                    extendedProps: {
                        turnoId: turno.idturno,
                        noAfiliacion: turno.noafiliacion,
                        paciente: turno.nombrepaciente,
                        clinica: turno.nombreclinica
                    }
                }));
                setEventosCalendario(eventos);
            } else {
                showErrorModal('El paciente no existe');
                setNumeroAfiliacion('');
                setEventosCalendario([]);
                setCalendarioHabilitado(false); 
            }
        } catch (error) {
            // Si la respuesta es 404 o similar, mostrar mensaje claro
            if (error.response && error.response.status === 404) {
                showErrorModal('El paciente no existe');
                setNumeroAfiliacion('');
            } else {
                showErrorModal('Error al buscar el paciente');
            }
            setEventosCalendario([]);
            setCalendarioHabilitado(false); 
        }
    };

    const handleCrear = async () => {
        if (!numeroAfiliacion || !opcionSeleccionada || !fechaSeleccionada) {
            showErrorModal('Por favor, selecciona un paciente, una clínica y una fecha.');
            return;
        }

        try {
            const datosTurno = {
                noAfiliacion: numeroAfiliacion,
                clinica: opcionSeleccionada,
                fechaTurno: fechaSeleccionada.toISOString().split('T')[0],
            };

            const response = await api.post('/crear-turno', datosTurno);

            if (response.data.success) {
                showSuccessModal('Turno creado exitosamente');
                handleCancelar();
            }
        } catch (error) {
            showErrorModal(error);
        }
    };

    const handleSelectDate = (selectInfo) => {
    setFechaSeleccionada(selectInfo.start);
};

    const handleCancelar = () => {
        setNumeroAfiliacion('');
        setOpcionSeleccionada('');
        setNombrePaciente('');
        setTurnos([]);
        setEventosCalendario([]);
        setFechaSeleccionada(null);
        setModoEdicion(false);
        setTurnoEditando(null);
        setCalendarioHabilitado(false); // Bloquea el select nuevamente
    };

    const handleEditar = (idTurno) => {
        const turno = turnos.find(t => t.idturno === idTurno);
        if (turno) {
            setModoEdicion(true);
            setTurnoEditando(turno);
            setOpcionSeleccionada(turno.nombreclinica);
            setFechaSeleccionada(new Date(turno.fechaturno));
        }
    };

    const handleGuardarEdicion = async () => {
        if (!turnoEditando || !fechaSeleccionada) {
            showErrorModal('Por favor, selecciona una fecha.');
            return;
        }
    
        try {
            const response = await api.put(`/actualizar-turno/${turnoEditando.idturno} `, {
                fechaTurno: fechaSeleccionada.toISOString().split('T')[0],
            });
            console.log(response.data);
    
            if (response.data.success) {
                showSuccessModal('Turno actualizado exitosamente');
                setModoEdicion(false);
                setTurnoEditando(null);
                handleCancelar();
            } else {
                showErrorModal('Error al actualizar el turno');
            }
        } catch (error) {
            showErrorModal(error);
        }
    };

    const handleEliminar = (idTurno) => {
        setIdTurnoAEliminar(idTurno);
        setModalMessage('¿Está seguro que desea eliminar este turno?');
        setModalType('confirm');
        setShowModal(true);
        setOnConfirmEliminar(() => () => confirmarEliminarTurno(idTurno));
    };

    const confirmarEliminarTurno = async (idTurno) => {
        try {
            const response = await api.delete(`/eliminar-turno/${idTurno}`);
            if (response.data.success) {
                showSuccessModal('Turno eliminado correctamente');
                // Actualizar la lista de turnos después de eliminar
                setTurnos(turnos.filter(t => t.idturno !== idTurno));
            } else {
                showErrorModal('No se pudo eliminar el turno.');
            }
        } catch (error) {
            showErrorModal('Error al eliminar el turno.');
        }
        setIdTurnoAEliminar(null);
        setOnConfirmEliminar(null);
    };

    const handleEventClick = (clickInfo) => {
        const evento = clickInfo.event;
        const props = evento.extendedProps;
        showSuccessModal(
            `Información del Turno:\n` +
            `Turno #: ${props.turnoId}\n` +
            `Paciente: ${props.paciente}\n` +
            `No. Afiliación: ${props.noAfiliacion}\n` +
            `Clínica: ${props.clinica}\n` +
            `Fecha: ${evento.start.toLocaleDateString()}`
        );
    };

    return (
        <Container fluid>
            <CustomModal
                show={showModal}
                onClose={() => {
                    setShowModal(false);
                    setIdTurnoAEliminar(null);
                    setOnConfirmEliminar(null);
                }}
                title={modalType === 'success' ? 'Éxito' : modalType === 'confirm' ? 'Confirmar' : 'Error'}
                message={modalMessage}
                type={modalType}
                onConfirm={onConfirmEliminar}
            />

            <Row>
                <Col md="6">
                    <Card>
                        <Card.Body>
                            <Form>
                                <Row>
                                    <Col md="12" className="text-center">
                                        <img
                                            alt="..."
                                            className="logoTurnoPaciente"
                                            src={logoClinica}
                                        />
                                        <hr/>
                                    </Col>

                                    <Col md="12">
                                        <Form.Group as={Row} className="align-items-center">
                                            <Col sm="4">
                                                <Form.Control
                                                    placeholder="Número de Afiliación"
                                                    type="text"
                                                    value={numeroAfiliacion}
                                                    onChange={handleNumeroAfiliacionChange}
                                                />
                                            </Col>
                                            <Col sm="2">
                                                <Button
                                                    className="btn-fill"
                                                    type="button"
                                                    variant="success"
                                                    onClick={handleBuscar}
                                                    style={{
                                                        backgroundColor: '#2d6a4f',
                                                        borderColor: '#2d6a4f',
                                                        color: '#ffffff'
                                                    }}
                                                >
                                                    Buscar
                                                </Button>
                                            </Col>
                                            
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </Form>

                            <hr/>

                            <h3 className="text-clinica">{nombrePaciente || 'Nombre del paciente'}</h3>
                            <hr/>

                            <Table className="table-hover table-striped">
                                <thead>
                                    <tr>
                                        <th className="border-0">ID Turno</th>
                                        <th className="border-0">Clínica</th>
                                        <th className="border-0">Fecha del Turno</th>
                                        <th className="border-0">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {turnos.map((turno) => (
                                        <tr key={turno.idturno}>
                                            <td>{turno.idturno}</td>
                                            <td>{turno.nombreclinica}</td>
                                            <td>{new Date(turno.fechaturno).toLocaleDateString()}</td>
                                            <td>
                                                <Button
                                                    variant="success"
                                                    onClick={() => handleEditar(turno.idturno)}
                                                    style={{
                                                        backgroundColor: '#ffffff',
                                                        borderColor: '#2d6a4f',
                                                        color: '#2d6a4f',
                                                        marginRight: '8px'
                                                    }}
                                                >
                                                    Editar
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    onClick={() => handleEliminar(turno.idturno)}
                                                    style={{
                                                        backgroundColor: '#dc3545',
                                                        borderColor: '#dc3545',
                                                        color: '#fff'
                                                    }}
                                                    disabled={turno.nombreclinica && turno.nombreclinica.toLowerCase().includes('hemodialisis')}
                                                >
                                                    Eliminar
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>

                            <Form>
                                <Col sm="4">
                                    <Form.Select
    value={opcionSeleccionada}
    onChange={handleOpcionChange}
    className="form-control"
    disabled={!calendarioHabilitado || modoEdicion}
>
    <option value="">Seleccione una clínica</option>
    {Array.isArray(clinicas) && clinicas.map((clinica) => (
        <option key={clinica.idsala} value={clinica.descripcion}>
            {clinica.descripcion}
        </option>
    ))}
</Form.Select>
{!calendarioHabilitado && (
    <div style={{ color: '#b94a48', marginTop: 8, fontSize: 14 }}>
        Debe buscar un paciente antes de seleccionar una clínica.
    </div>
)}
                                </Col>
                            </Form>

                            <hr/>

                            <Col md="12" className="d-flex justify-content-between">
                                <Button
                                    className="btn-fill"
                                    type="button"
                                    variant="danger"
                                    onClick={handleCancelar}
                                    style={{
                                        backgroundColor: '#9B2C2C',
                                        borderColor: '#9B2C2C',
                                        color: '#ffffff'
                                    }}
                                >
                                    Cancelar
                                </Button>
                                {modoEdicion ? (
                                    <Button
                                        className="btn-fill"
                                        type="button"
                                        variant="success"
                                        onClick={handleGuardarEdicion}
                                        style={{
                                            backgroundColor: '#2d6a4f',
                                            borderColor: '#2d6a4f',
                                            color: '#ffffff'
                                        }}
                                    >
                                        Guardar
                                    </Button>
                                ) : (
                                    <Button
                                        className="btn-fill"
                                        type="button"
                                        variant="success"
                                        onClick={handleCrear}
                                        style={{
                                            backgroundColor: '#2d6a4f',
                                            borderColor: '#2d6a4f',
                                            color: '#ffffff'
                                        }}
                                    >
                                        Aceptar
                                    </Button>
                                )}
                            </Col>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md="6">
                    <Card>
                        <Card.Body>
                            <div style={{ 
                                '--fc-border-color': calendarioHabilitado ? '#e0e8e3' : '#d3d3d3',
                                '--fc-button-bg-color': calendarioHabilitado ? '#2d6a4f' : '#d3d3d3',
                                '--fc-button-border-color': calendarioHabilitado ? '#2d6a4f' : '#d3d3d3',
                                '--fc-button-hover-bg-color': calendarioHabilitado ? '#1b4332' : '#d3d3d3',
                                '--fc-button-hover-border-color': calendarioHabilitado ? '#1b4332' : '#d3d3d3',
                                '--fc-button-active-bg-color': calendarioHabilitado ? '#1b4332' : '#d3d3d3',
                                '--fc-today-bg-color': calendarioHabilitado ? '#1d8348' : '#f0f0f0',
                                '--fc-event-bg-color': calendarioHabilitado ? '#40916c' : '#d3d3d3',
                                '--fc-event-border-color': calendarioHabilitado ? '#40916c' : '#d3d3d3',
                                '--fc-event-text-color': calendarioHabilitado ? '#ffffff' : '#696969',
                                '--fc-page-bg-color': '#ffffff',
                                '--fc-toolbar-title-font-size': '1.5em',
                            }}>
                                <style>
                                    {`
                                    .fc .fc-toolbar-title {
                                        text-transform: uppercase;
                                        font-weight: bold;
                                        color: ${calendarioHabilitado ? '#2d6a4f' : '#696969'};
                                    }
                                    .fc .fc-col-header-cell-cushion {
                                        text-transform: uppercase;
                                        font-weight: bold;
                                        color: ${calendarioHabilitado ? '#2d6a4f' : '#696969'};
                                    }
                                    .fc .fc-daygrid-day-number {
                                        font-weight: bold;
                                        color: ${calendarioHabilitado ? '#2d6a4f' : '#696969'};
                                    }
                                    .fc .fc-event-title {
                                        text-transform: uppercase;
                                        font-weight: bold !important;
                                    }
                                    .fc .fc-day-today .fc-daygrid-day-number {
                                        color: ${calendarioHabilitado ? '#ffffff' : '#696969'};
                                        font-weight: bolder;
                                    }
                                    .fc .fc-day {
                                        cursor: ${calendarioHabilitado ? 'pointer' : 'not-allowed'};
                                    }
                                    .fc .fc-day-today {
                                        background-color: ${calendarioHabilitado ? '#1d8348' : '#f0f0f0'};
                                    }
                                    .fc .fc-daygrid-day.fc-day-selected {
                                        background-color: ${calendarioHabilitado ? '#52be80' : '#f0f0f0'};
                                        border-radius: 0;
                                    }
                                    .fc .fc-daygrid-day.fc-day-selected .fc-daygrid-day-number {
                                        color: ${calendarioHabilitado ? '#ffffff' : '#696969'};
                                        font-weight: bolder;
                                    }
                                    .fc .fc-day:before {
                                        content: '';
                                        position: absolute;
                                        top: 0;
                                        left: 0;
                                        right: 0;
                                        bottom: 0;
                                        background-color: ${calendarioHabilitado ? 'transparent' : 'transparent'};
                                    }
                                    .fc .fc-day.fc-day-disabled,
                                    .fc-daygrid-day.fc-day-disabled,
                                    td.fc-day.fc-day-disabled,
                                    td.fc-daygrid-day.fc-day-disabled {
                                        background-color: #ededed !important;
                                        color: #b0b0b0 !important;
                                        border: 1px solid #cccccc !important;
                                        pointer-events: none !important;
                                        opacity: 1 !important;
                                    }
                                    .fc .fc-day.fc-day-disabled .fc-daygrid-day-number,
                                    .fc-daygrid-day.fc-day-disabled .fc-daygrid-day-number,
                                    td.fc-day.fc-day-disabled .fc-daygrid-day-number,
                                    td.fc-daygrid-day.fc-day-disabled .fc-daygrid-day-number {
                                        color: #a0a0a0 !important;
                                        font-weight: normal !important;
                                    }
                                    .fc-daygrid-day.fc-day-selected {
                                        background-color: ${calendarioHabilitado ? '#52be80' : '#f0f0f0'} !important;
                                    }
                                    `}
                                </style>
                                <FullCalendar
    plugins={[dayGridPlugin, interactionPlugin]}
    initialView="dayGridMonth"
    selectable={calendarioHabilitado}
    events={eventosCalendario}
    select={calendarioHabilitado ? (info => {
    // Si es domingo, no permitir selección
    if (info.start && info.start.getDay && info.start.getDay() === 0) {
        showErrorModal('No se pueden agendar turnos los domingos');
        return;
    }
    handleSelectDate(info);
}) : null}
    eventClick={handleEventClick}
    headerToolbar={{
        left: 'prev,next',
        center: 'title',
        right: 'today'
    }}
    height="auto"
    fixedWeekCount={false}
    showNonCurrentDates={true}
    dayMaxEvents={true}
    eventDisplay="block"
    locale="es"
    buttonText={{
        today: 'Hoy'
    }}
    selectConstraint={{
        start: calendarioHabilitado ? new Date() : null,
        end: null
    }}
    dayClassNames={(date) => {
    // Bloquear domingos y días pasados
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    if (date.getDay() === 0) {
        return 'fc-day-disabled';
    }
    if (calendarioHabilitado && date < hoy) {
        return 'fc-day-disabled';
    }
    return '';
}}
    eventContent={(eventInfo) => {
        return (
            <div style={{ 
                padding: '2px 4px',
                cursor: 'pointer',
                fontSize: '0.9em'
            }}>
                <div><strong>Turno #{eventInfo.event.extendedProps.turnoId}</strong></div>
                <div>{eventInfo.event.title}</div>
            </div>
        );
    }}
/>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default GestionTurno;