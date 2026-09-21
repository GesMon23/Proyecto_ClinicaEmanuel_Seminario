import React from "react";
import { Card, Col, Container, Row } from "react-bootstrap";
import DashboardPsicologia from "./DashboardPsicologia.jsx";
import PanelPacientes from "./dashboards/PanelPacientes.jsx";
import PanelNutricion from "./dashboards/PanelNutricion.jsx";
import { CabeceraPanel, EstilosLeyendaMovil } from "./dashboards/componentes.jsx";
import { useTema } from "./dashboards/tema";

// Dashboards de Pacientes, Nutrición y Psicología. Cada panel carga sus propios datos.
function DashboardsInteractivos() {
  const tema = useTema();
  return (
    <Container fluid>
      <EstilosLeyendaMovil />
      <PanelPacientes tema={tema} />
      <PanelNutricion tema={tema} />
      <Row>
        <Col md="12">
          <Card style={{ borderColor: tema.theme.success }}>
            <CabeceraPanel titulo="Psicología" color={tema.theme.success} />
            <Card.Body>
              <DashboardPsicologia />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default DashboardsInteractivos;
