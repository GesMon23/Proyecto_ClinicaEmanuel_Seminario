import React from 'react';
import DataComponent from '../components/DataComponent';
import { Container, Row, Col } from 'react-bootstrap';  // Importa componentes de react-bootstrap

const DataView = () => {
    return (
        <Container fluid>
            <Row>
                <Col>
                    <h1>Vista de Datos</h1>
                    <p>Esta es una vista dedicada para mostrar los datos de la base de datos.</p>
                </Col>
            </Row>
            <Row>
                <Col>
                    <DataComponent />  {/* Usa el componente aquí */}
                </Col>
            </Row>
        </Container>
    );
};

export default DataView;