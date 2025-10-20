import React from "react";
import { Card, Container, Row, Col } from "react-bootstrap";

function CorazonRojo() {
  return (
    <Container fluid>
      <Row className="justify-content-center mt-4">
        <Col md="8" lg="6">
          <Card className="text-center">
            <Card.Header>
              <Card.Title as="h3">Corazón rojo</Card.Title>
            </Card.Header>
            <Card.Body style={{ padding: '48px 24px' }}>
              <div style={{ fontSize: 120, lineHeight: 1 }}>
                <span role="img" aria-label="corazon" style={{ color: '#e63946' }}>
                  ❤
                </span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default CorazonRojo;
