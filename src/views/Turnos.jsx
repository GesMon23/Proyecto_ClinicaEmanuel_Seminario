import React, { useState } from 'react';
import './TurnosNavButtons.css';
import ChartistGraph from "react-chartist";
import Calendar from "./Calendar";
import { Navbar, Container, Nav, Dropdown, Button } from "react-bootstrap";
import LlamadoTurnos from '@/components/LlamadoTurnos';
import AsignarTurno from '@/components/AsignarTurno';
import GestionTurno from '@/components/GestionTurno';
import ConsultaTurnos from '@/components/ConsultaTurnos';

// react-bootstrap components
import {
    Badge,
    Card,
    Table,
    Row,
    Col,
    Form,
    OverlayTrigger,
    Tooltip,
    Image, Modal
} from "react-bootstrap";
// import { useHistory } from 'react-router-dom';

function Turnos() {
    const [tab, setTab] = useState('llamado');

    return (
        <Container fluid>

            <Row>
                <Col md="12">
                    <h2 className='mb-4 text-3xl font-bold text-green-700 dark:text-white'>Turnos</h2>
                    <Card>
                        <Card.Body>
                            <div className="turnos-nav-btns">
                                <button className={`turnos-nav-btn${tab === 'llamado' ? ' active' : ''}`} onClick={() => setTab('llamado')}>Llamado</button>
                                <button className={`turnos-nav-btn${tab === 'asignar' ? ' active' : ''}`} onClick={() => setTab('asignar')}>Asignar</button>
                                <button className={`turnos-nav-btn${tab === 'crear' ? ' active' : ''}`} onClick={() => setTab('crear')}>Crear</button>
                                <button className={`turnos-nav-btn${tab === 'consulta' ? ' active' : ''}`} onClick={() => setTab('consulta')}>Consulta Turnos</button>
                            </div>
                            <div>
                                {tab === 'llamado' && <LlamadoTurnos />}
                                {tab === 'asignar' && <AsignarTurno />}
                                {tab === 'crear' && <GestionTurno />}
                                {tab === 'consulta' && <ConsultaTurnos />}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}

export default Turnos;