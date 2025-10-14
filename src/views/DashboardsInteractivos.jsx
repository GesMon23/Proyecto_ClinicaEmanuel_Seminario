import React, { useEffect, useState } from "react";
import { Card, Container, Row, Col, Table, Button } from "react-bootstrap";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import api from "@/config/api";

// Nota: Los datos reales se pueden cargar desde el backend usando fetch a endpoints existentes.
// Aquí dejamos estructuras listas para conectar.

function DashboardsInteractivos() {
  const [kpis, setKpis] = useState({
    pacientesActivos: 0,
    ingresosHoy: 0,
    citasPendientes: 0,
    faltistasMes: 0,
  });

  const [lineData, setLineData] = useState([]);
  const [barData, setBarData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [psicoTipoData, setPsicoTipoData] = useState([]);
  const [nutricionEstadoData, setNutricionEstadoData] = useState([]);
  const [nutricionDetalle, setNutricionDetalle] = useState([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    const fetchResumen = async () => {
      try {
        const { data } = await api.get('/api/estadisticas/resumen');
        const k = data?.kpis || {};
        setKpis({
          pacientesActivos: k.pacientesActivos ?? 0,
          ingresosHoy: k.ingresosHoy ?? 0,
          citasPendientes: k.tasaInasistenciaPct ?? 0, // usamos este KPI como placeholder
          faltistasMes: k.faltasMes ?? 0,
        });
        const ingresosMes = data?.series?.ingresosMes || [];
        const egresosMes = data?.series?.egresosMes || [];
        setLineData(ingresosMes.map((r) => ({ name: r.mes?.slice(0,7) || '', value: r.ingresos })));
        setBarData(egresosMes.map((r) => ({ name: r.mes?.slice(0,7) || '', egresos: r.egresos })));
        const causas = data?.distribuciones?.causasEgreso || [];
        setPieData(causas.map((c) => ({ name: c.causa, value: c.total })));
      } catch (err) {
        console.error('Resumen estadísticas error:', err);
        // Fallback mock mínimo si falla la API
        setKpis({ pacientesActivos: 0, ingresosHoy: 0, citasPendientes: 0, faltistasMes: 0 });
        setLineData([]);
        setBarData([]);
        setPieData([]);
      }
    };
    const fetchPsico = async () => {
      try {
        const { data } = await api.get('/api/estadisticas/psicologia-por-tipo');
        const items = data?.items || [];
        setPsicoTipoData(items.map(i => ({ name: i.tipo, total: i.total })));
      } catch (e) {
        console.error('Psicología por tipo error:', e);
        setPsicoTipoData([]);
      }
    };
    const fetchNutri = async (params = {}) => {
      try {
        const { data } = await api.get('/api/estadisticas/nutricion-por-tipo', { params });
        const items = data?.items || [];
        setNutricionEstadoData(items.map(i => ({ name: i.estado, total: i.total })));
        const det = await api.get('/api/estadisticas/nutricion-detalle', { params });
        setNutricionDetalle(det?.data?.items || []);
      } catch (e) {
        console.error('Nutrición por tipo error:', e);
        setNutricionEstadoData([]);
        setNutricionDetalle([]);
      }
    };
    fetchResumen();
    fetchPsico();
    fetchNutri();
  }, []);

  const aplicarFiltrosNutricion = () => {
    const params = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    // Reutilizamos el mismo fetch
    (async () => {
      await api.get('/api/estadisticas/nutricion-por-tipo', { params })
        .then(({ data }) => setNutricionEstadoData((data?.items || []).map(i => ({ name: i.estado, total: i.total }))))
        .catch(() => setNutricionEstadoData([]));
      await api.get('/api/estadisticas/nutricion-detalle', { params })
        .then(({ data }) => setNutricionDetalle(data?.items || []))
        .catch(() => setNutricionDetalle([]));
    })();
  };

  return (
    <Container fluid>
      <Row>
        <Col lg="3" sm="6">
          <Card className="card-stats">
            <Card.Body>
              <Row>
                <Col xs="5">
                  <div className="icon-big text-center icon-warning">
                    <i className="nc-icon nc-heart text-danger"></i>
                  </div>
                </Col>
                <Col xs="7">
                  <div className="numbers">
                    <p className="card-category">Pacientes activos</p>
                    <Card.Title as="h4">{kpis.pacientesActivos}</Card.Title>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col lg="3" sm="6">
          <Card className="card-stats">
            <Card.Body>
              <Row>
                <Col xs="5">
                  <div className="icon-big text-center icon-warning">
                    <i className="nc-icon nc-calendar-60 text-primary"></i>
                  </div>
                </Col>
                <Col xs="7">
                  <div className="numbers">
                    <p className="card-category">Ingresos hoy</p>
                    <Card.Title as="h4">{kpis.ingresosHoy}</Card.Title>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col lg="3" sm="6">
          <Card className="card-stats">
            <Card.Body>
              <Row>
                <Col xs="5">
                  <div className="icon-big text-center icon-warning">
                    <i className="nc-icon nc-bullet-list-67 text-warning"></i>
                  </div>
                </Col>
                <Col xs="7">
                  <div className="numbers">
                    <p className="card-category">Citas pendientes</p>
                    <Card.Title as="h4">{kpis.citasPendientes}</Card.Title>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col lg="3" sm="6">
          <Card className="card-stats">
            <Card.Body>
              <Row>
                <Col xs="5">
                  <div className="icon-big text-center icon-warning">
                    <i className="nc-icon nc-simple-remove text-info"></i>
                  </div>
                </Col>
                <Col xs="7">
                  <div className="numbers">
                    <p className="card-category">Faltistas mes</p>
                    <Card.Title as="h4">{kpis.faltistasMes}</Card.Title>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md="8">
          <Card>
            <Card.Header>
              <Card.Title as="h4">Tendencia de atenciones</Card.Title>
              <p className="card-category">Últimos 8 períodos</p>
            </Card.Header>
            <Card.Body>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <LineChart data={lineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <RTooltip />
                    <Line type="monotone" dataKey="value" stroke="#1d8cf8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md="4">
          <Card>
            <Card.Header>
              <Card.Title as="h4">Causas de egreso</Card.Title>
              <p className="card-category">Top causas últimos 6 meses</p>
            </Card.Header>
            <Card.Body>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={["#1d8cf8", "#ff8d72", "#e14eca"][index % 3]} />
                      ))}
                    </Pie>
                    <Legend />
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md="6">
          <Card>
            <Card.Header>
              <Card.Title as="h4">Egresos por mes</Card.Title>
            </Card.Header>
            <Card.Body>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RTooltip />
                    <Bar dataKey="egresos" fill="#00f2c3" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md="6">
          <Card>
            <Card.Header>
              <Card.Title as="h4">Psicología por tipo de consulta</Card.Title>
              <p className="card-category">Últimos 90 días</p>
            </Card.Header>
            <Card.Body>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={psicoTipoData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis />
                    <RTooltip />
                    <Bar dataKey="total" fill="#e14eca" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md="12">
          <Card>
            <Card.Header>
              <Card.Title as="h4">Nutrición por estado</Card.Title>
              <p className="card-category">Últimos 90 días</p>
            </Card.Header>
            <Card.Body>
              <div className="mb-3" style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
                <div>
                  <label className="form-label">Desde</label>
                  <input type="date" className="form-control" value={desde} onChange={(e) => setDesde(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Hasta</label>
                  <input type="date" className="form-control" value={hasta} onChange={(e) => setHasta(e.target.value)} />
                </div>
                <div>
                  <Button variant="primary" onClick={aplicarFiltrosNutricion}>Aplicar</Button>
                </div>
              </div>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={nutricionEstadoData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis />
                    <RTooltip />
                    <Bar dataKey="total" fill="#ff8d72" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md="12">
          <Card>
            <Card.Header>
              <Card.Title as="h4">Detalle de informes de Nutrición</Card.Title>
              <p className="card-category">motivo_consulta, estado_nutricional, altura, peso, imc, fecha</p>
            </Card.Header>
            <Card.Body>
              <Table className="table-hover table-striped">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Motivo consulta</th>
                    <th>Estado nutricional</th>
                    <th>Altura</th>
                    <th>Peso</th>
                    <th>IMC</th>
                  </tr>
                </thead>
                <tbody>
                  {nutricionDetalle.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center">Sin datos</td>
                    </tr>
                  )}
                  {nutricionDetalle.map((r, idx) => (
                    <tr key={idx}>
                      <td>{r.fecha || ''}</td>
                      <td>{r.motivo_consulta || '—'}</td>
                      <td>{r.estado_nutricional || '—'}</td>
                      <td>{r.altura ?? '—'}</td>
                      <td>{r.peso ?? '—'}</td>
                      <td>{r.imc ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default DashboardsInteractivos;
