import React, { useEffect, useMemo, useState } from "react";
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
  ComposedChart,
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
  const [nutricionJornadaData, setNutricionJornadaData] = useState([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [sexo, setSexo] = useState(""); // '' | 'M' | 'F'
  const [nutricionSexoData, setNutricionSexoData] = useState([]);
  const [nutricionMotivoData, setNutricionMotivoData] = useState([]);
  const [selectedEstado, setSelectedEstado] = useState(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [motivo, setMotivo] = useState("");

  const [theme, setTheme] = useState({
    primary: "#0d6efd",
    info: "#0dcaf0",
    success: "#198754",
    warning: "#ffc107",
    danger: "#dc3545",
    secondary: "#6c757d",
    purple: "#6f42c1"
  });
  const [isDark, setIsDark] = useState(false);
  // Paleta enfocada en tonos de AZUL y VERDE
  const colorPalette = useMemo(() => [
    // Azules
    theme.primary,            // azul base del tema
    (theme.info || '#0dcaf0'),
    '#4dabf7',                // blue-4
    '#1e88e5',                // blue-6
    // Verdes
    theme.success,            // verde base del tema
    '#51cf66',                // green-4
    '#2f9e44'                 // green-7
  ], [theme]);
  const colorByEstado = useMemo(() => {
    const map = {};
    (nutricionEstadoData || []).forEach((e, i) => {
      if (e && e.name) map[e.name] = map[e.name] || colorPalette[i % colorPalette.length];
    });
    return map;
  }, [nutricionEstadoData]);

  const withAlpha = (hex, alpha = 1) => {
    try {
      const h = hex.replace('#','');
      const bigint = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch { return hex; }
  };

  const getDefaultRange = () => {
    const today = new Date();
    const past = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    const toStr = (d) => d.toISOString().slice(0, 10);
    return { desde: toStr(past), hasta: toStr(today) };
  };

  const parseCssColor = (val) => {
    if (!val) return '#ffffff';
    const v = val.trim();
    if (v.startsWith('#')) return v;
    const m = v.match(/rgb[a]?\(([^)]+)\)/i);
    if (m) {
      const [r, g, b] = m[1].split(',').slice(0,3).map(x => parseFloat(x));
      const toHex = (n) => ('0' + Math.round(n).toString(16)).slice(-2);
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    return v; // fallback
  };

  const luminance = (hex) => {
    try {
      const h = hex.replace('#','');
      const bigint = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      const [R, G, B] = [r, g, b].map(c => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    } catch { return 1; }
  };

  useEffect(() => {
    // leer colores desde variables CSS del proyecto (Bootstrap 5)
    try {
      const root = getComputedStyle(document.documentElement);
      const read = (v) => (root.getPropertyValue(v) || '').trim();
      const next = {
        primary: read('--bs-primary') || '#0d6efd',
        info: read('--bs-info') || '#0dcaf0',
        success: read('--bs-success') || '#198754',
        warning: read('--bs-warning') || '#ffc107',
        danger: read('--bs-danger') || '#dc3545',
        secondary: read('--bs-secondary') || '#6c757d',
        purple: read('--bs-purple') || '#6f42c1',
      };
      setTheme(next);
      const bodyBg = parseCssColor(read('--bs-body-bg') || read('--body-bg') || '#ffffff');
      // detectar tema oscuro por luminancia y atributos
      const byLum = luminance(bodyBg) < 0.5;
      const attrTheme = (document.documentElement.getAttribute('data-bs-theme') || '').toLowerCase();
      const byAttr = attrTheme === 'dark';
      const byClass = document.body.classList.contains('bg-dark') || document.body.classList.contains('dark') || document.body.classList.contains('theme-dark');
      setIsDark(byLum || byAttr || byClass);
    } catch (_) {}

    // reaccionar a prefers-color-scheme
    try {
      const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      if (mq && typeof mq.addEventListener === 'function') {
        const handler = (e) => setIsDark(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
      }
    } catch (_) {}
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
        const p = { ...params };
        if (!p.desde || !p.hasta) {
          const def = getDefaultRange();
          p.desde = p.desde || def.desde;
          p.hasta = p.hasta || def.hasta;
        }
        const { data } = await api.get('/api/estadisticas/nutricion-por-tipo', { params: p });
        const items = data?.items || [];
        setNutricionEstadoData(items.map(i => ({ name: i.estado, total: i.total, imc_promedio: i.imc_promedio, peso_promedio: i.peso_promedio, altura_promedio: i.altura_promedio })));
        const det = await api.get('/api/estadisticas/nutricion-detalle', { params: p });
        setNutricionDetalle(det?.data?.items || []);
        const j = await api.get('/api/estadisticas/nutricion-por-jornada', { params: p });
        setNutricionJornadaData((j?.data?.items || []).map(x => ({ name: x.jornada, total: x.total })));
        const sx = await api.get('/api/estadisticas/nutricion-por-sexo', { params: p });
        setNutricionSexoData((sx?.data?.items || []).map(x => {
          const raw = (x.sexo ?? '').toString().trim().toLowerCase();
          const name = raw === 'm' || raw.startsWith('masc') ? 'Masculino'
                     : raw === 'f' || raw.startsWith('fem') ? 'Femenino'
                     : 'N/D';
          return { name, total: x.total };
        }));
        const mv = await api.get('/api/estadisticas/nutricion-por-motivo', { params: p });
        setNutricionMotivoData((mv?.data?.items || []).map(x => ({ name: x.motivo, total: x.total })));
      } catch (e) {
        console.error('Nutrición por tipo error:', e);
        setNutricionEstadoData([]);
        setNutricionDetalle([]);
        setNutricionJornadaData([]);
        setNutricionSexoData([]);
        setNutricionMotivoData([]);
      }
    };
    fetchResumen();
    fetchPsico();
    fetchNutri();
  }, []);

  // Re-cargar automáticamente cuando cambie el sexo o el motivo
  useEffect(() => {
    const p = {};
    if (desde) p.desde = desde; if (hasta) p.hasta = hasta; if (sexo) p.sexo = sexo; if (motivo) p.motivo = motivo;
    // fetchNutri usa rango por defecto si faltan fechas
    (async () => { try { await (await import('@/config/api')).default.get; } catch (_) {} })();
    // Llamar a fetchNutri ya definido en el useEffect superior no es posible desde aquí directamente,
    // así que replicamos llamadas básicas con getDefaultRange
    (async () => {
      try {
        const base = { ...p };
        if (!base.desde || !base.hasta) {
          const def = getDefaultRange();
          base.desde = base.desde || def.desde; base.hasta = base.hasta || def.hasta;
        }
        const t = await api.get('/api/estadisticas/nutricion-por-tipo', { params: base });
        setNutricionEstadoData((t?.data?.items || []).map(i => ({ name: i.estado, total: i.total, imc_promedio: i.imc_promedio, peso_promedio: i.peso_promedio, altura_promedio: i.altura_promedio })));
        const j = await api.get('/api/estadisticas/nutricion-por-jornada', { params: base });
        setNutricionJornadaData((j?.data?.items || []).map(x => ({ name: x.jornada, total: x.total })));
        const sx = await api.get('/api/estadisticas/nutricion-por-sexo', { params: base });
        setNutricionSexoData((sx?.data?.items || []).map(x => {
          const raw = (x.sexo ?? '').toString().trim().toLowerCase();
          const name = raw === 'm' || raw.startsWith('masc') ? 'Masculino' : raw === 'f' || raw.startsWith('fem') ? 'Femenino' : 'N/D';
          return { name, total: x.total };
        }));
      } catch (e) {
        // silencioso para no ensuciar consola del usuario
      }
    })();
  }, [sexo, motivo]);

  const aplicarFiltrosNutricion = () => {
    const params = {};
    if (desde) params.desde = desde; else params.desde = getDefaultRange().desde;
    if (hasta) params.hasta = hasta; else params.hasta = getDefaultRange().hasta;
    if (sexo) params.sexo = sexo;
    if (motivo) params.motivo = motivo;
    // Reutilizamos el mismo fetch
    (async () => {
      await api.get('/api/estadisticas/nutricion-por-tipo', { params })
        .then(({ data }) => setNutricionEstadoData((data?.items || []).map(i => ({ name: i.estado, total: i.total, imc_promedio: i.imc_promedio, peso_promedio: i.peso_promedio, altura_promedio: i.altura_promedio }))))
        .catch(() => setNutricionEstadoData([]));
      await api.get('/api/estadisticas/nutricion-detalle', { params })
        .then(({ data }) => setNutricionDetalle(data?.items || []))
        .catch(() => setNutricionDetalle([]));
      await api.get('/api/estadisticas/nutricion-por-jornada', { params })
        .then(({ data }) => setNutricionJornadaData((data?.items || []).map(x => ({ name: x.jornada, total: x.total }))))
        .catch(() => setNutricionJornadaData([]));
      await api.get('/api/estadisticas/nutricion-por-sexo', { params })
        .then(({ data }) => setNutricionSexoData((data?.items || []).map(x => {
          const raw = (x.sexo ?? '').toString().trim().toLowerCase();
          const name = raw === 'm' || raw.startsWith('masc') ? 'Masculino'
                     : raw === 'f' || raw.startsWith('fem') ? 'Femenino'
                     : 'N/D';
          return { name, total: x.total };
        })))
        .catch(() => setNutricionSexoData([]));
      await api.get('/api/estadisticas/nutricion-por-motivo', { params })
        .then(({ data }) => setNutricionMotivoData((data?.items || []).map(x => ({ name: x.motivo, total: x.total }))))
        .catch(() => setNutricionMotivoData([]));
    })();
  };

  const totalNutri = nutricionEstadoData.reduce((acc, i) => acc + (Number(i.total) || 0), 0);
  const imcAvgGlobal = totalNutri > 0
    ? (nutricionEstadoData.reduce((acc, i) => acc + ((Number(i.imc_promedio) || 0) * (Number(i.total) || 0)), 0) / totalNutri)
    : 0;
  const pesoAvgGlobal = totalNutri > 0
    ? (nutricionEstadoData.reduce((acc, i) => acc + ((Number(i.peso_promedio) || 0) * (Number(i.total) || 0)), 0) / totalNutri)
    : 0;
  const alturaAvgGlobal = totalNutri > 0
    ? (nutricionEstadoData.reduce((acc, i) => acc + ((Number(i.altura_promedio) || 0) * (Number(i.total) || 0)), 0) / totalNutri)
    : 0;

  

  const NutriPieTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0];
    const name = p?.name || p?.payload?.name;
    const row = (nutricionEstadoData || []).find(r => r.name === name) || {};
    const total = Number(row.total || 0);
    const pct = totalNutri > 0 ? ((total * 100) / totalNutri) : 0;
    return (
      <div style={{ background: '#fff', border: '1px solid #ddd', padding: 8, borderRadius: 6 }}>
        <div style={{ fontWeight: 600 }}>{name}</div>
        <div>Total: {total}</div>
        <div>%: {pct.toFixed(1)}%</div>
        <div>IMC prom.: {(Number(row.imc_promedio) || 0).toFixed(2)}</div>
        <div>Peso prom. (kg): {(Number(row.peso_promedio) || 0).toFixed(2)}</div>
        <div>Altura prom. (cm): {(Number(row.altura_promedio) || 0).toFixed(2)}</div>
      </div>
    );
  };

  const NutriJornadaTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const totalJ = (nutricionJornadaData || []).reduce((a, b) => a + (Number(b.total) || 0), 0);
    const val = Number(payload[0].value || 0);
    const pct = totalJ > 0 ? ((val * 100) / totalJ).toFixed(1) : '0.0';
    return (
      <div style={{ background: '#fff', border: '1px solid #ddd', padding: 8, borderRadius: 6 }}>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div>Total: {val}</div>
        <div>%: {pct}%</div>
      </div>
    );
  };

  const handleEstadoClick = async (estadoName) => {
    const next = selectedEstado === estadoName ? null : estadoName;
    setSelectedEstado(next);
    const params = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (next) params.estado = next;
    try {
      const det = await api.get('/api/estadisticas/nutricion-detalle', { params });
      setNutricionDetalle(det?.data?.items || []);
    } catch {
      setNutricionDetalle([]);
    }
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

      <Row>
        <Col md="12">
          <Card>
            <Card.Header>
              <Card.Title as="h4">Pacientes por jornada (Nutrición)</Card.Title>
              <p className="card-category">Distribución de informes por jornada</p>
            </Card.Header>
            <Card.Body>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={nutricionJornadaData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis />
                    <RTooltip />
                    <Bar dataKey="total" fill="#5e72e4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
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
            <Card.Header style={{ backgroundColor: theme.primary, color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Card.Title as="h3" style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0, textAlign: 'center', width: '100%' }}>
                Nutrición por estado
              </Card.Title>
            </Card.Header>
            <Card.Body>
              {isDark && (
                <style>{`
                  .nutri-filtros .form-control { color: #ffffff !important; }
                  .nutri-filtros .form-control::placeholder { color: rgba(255,255,255,0.75) !important; }
                  .nutri-filtros input[type="date"] { color: #ffffff !important; }
                  .nutri-filtros input[type="date"]::-webkit-datetime-edit,
                  .nutri-filtros input[type="date"]::-webkit-datetime-edit-text,
                  .nutri-filtros input[type="date"]::-webkit-datetime-edit-month-field,
                  .nutri-filtros input[type="date"]::-webkit-datetime-edit-day-field,
                  .nutri-filtros input[type="date"]::-webkit-datetime-edit-year-field { color: #ffffff !important; }
                  .nutri-filtros input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) !important; }
                  .nutri-filtros label.form-label { color: rgba(255,255,255,0.95) !important; }
                  @-moz-document url-prefix() { .nutri-filtros input[type="date"]{ color: #ffffff !important; } }
                `}</style>
              )}
              <div className="mb-3">
                <Card className="card-stats text-center" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : withAlpha(theme.primary, 0.12), borderColor: isDark ? 'rgba(255,255,255,0.15)' : theme.primary, color: isDark ? '#ffffff' : theme.primary }}>
                  <Card.Body className="text-center">
                    <div className="numbers text-center">
                      <p className="card-category" style={{ fontWeight: 800, marginBottom: 8, letterSpacing: '.06em', color: isDark ? withAlpha('#ffffff', 0.85) : undefined }}>TOTAL</p>
                      <Card.Title as="h1" style={{ fontSize: '3.6rem', fontWeight: 900, margin: 0, color: isDark ? '#ffffff' : theme.primary }}>{Number(totalNutri || 0).toLocaleString()}</Card.Title>
                    </div>
                  </Card.Body>
                </Card>
              </div>
              <div className="mb-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
                <div>
                  <Card className="card-stats text-center" style={{ overflow: 'hidden', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : withAlpha(theme.primary, 0.12), borderColor: isDark ? 'rgba(255,255,255,0.15)' : theme.primary, color: isDark ? '#ffffff' : theme.primary }}>
                    <Card.Body className="text-center">
                      <div className="numbers text-center">
                        <p className="card-category" style={{ fontWeight: 700, marginBottom: 8, color: isDark ? withAlpha('#ffffff', 0.8) : undefined }}>IMC prom. global</p>
                        <Card.Title as="h2" style={{ fontSize: '2.4rem', fontWeight: 900, margin: 0, color: isDark ? '#ffffff' : theme.primary }}>{imcAvgGlobal.toFixed(2)}</Card.Title>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
                <div>
                  <Card className="card-stats text-center" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : withAlpha(theme.primary, 0.12), borderColor: isDark ? 'rgba(255,255,255,0.15)' : theme.primary, color: isDark ? '#ffffff' : theme.primary }}>
                    <Card.Body className="text-center">
                      <div className="numbers text-center">
                        <p className="card-category" style={{ fontWeight: 700, marginBottom: 8, color: isDark ? withAlpha('#ffffff', 0.8) : undefined }}>Peso prom. (kg)</p>
                        <Card.Title as="h2" style={{ fontSize: '2.4rem', fontWeight: 900, margin: 0, color: isDark ? '#ffffff' : theme.primary }}>{pesoAvgGlobal.toFixed(2)}</Card.Title>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
                <div>
                  <Card className="card-stats text-center" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : withAlpha(theme.primary, 0.12), borderColor: isDark ? 'rgba(255,255,255,0.15)' : theme.primary, color: isDark ? '#ffffff' : theme.primary }}>
                    <Card.Body className="text-center">
                      <div className="numbers text-center">
                        <p className="card-category" style={{ fontWeight: 700, marginBottom: 8, color: isDark ? withAlpha('#ffffff', 0.8) : undefined }}>Altura prom. (cm)</p>
                        <Card.Title as="h2" style={{ fontSize: '2.4rem', fontWeight: 900, margin: 0, color: isDark ? '#ffffff' : theme.primary }}>{alturaAvgGlobal.toFixed(2)}</Card.Title>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
                <div style={{ flex: '1 1 0' }}>
                  <div style={{ width: "100%", height: 320 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={nutricionEstadoData}
                          dataKey="total"
                          nameKey="name"
                          outerRadius={110}
                          paddingAngle={2}
                          onClick={(data) => handleEstadoClick(data?.name)}
                        >
                          {nutricionEstadoData.map((entry, index) => (
                            <Cell key={`nutri-cell-${index}`} fill={colorByEstado[entry.name] || colorPalette[index % colorPalette.length]} stroke={selectedEstado === entry.name ? '#111' : undefined} strokeWidth={selectedEstado === entry.name ? 2 : 1} />
                          ))}
                        </Pie>
                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                        <RTooltip content={<NutriPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div style={{ flex: '1 1 0', minWidth: 300, maxWidth: '50%' }}>
                  <div style={{ width: "100%", height: 320 }}>
                    <ResponsiveContainer>
                      <BarChart data={nutricionJornadaData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis />
                        <RTooltip content={<NutriJornadaTooltip />} />
                        <Bar dataKey="total">
                          {nutricionJornadaData.map((entry, index) => (
                            <Cell key={`jor-${index}`} fill={colorPalette[index % colorPalette.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch', marginTop: 12 }}>
                <div style={{ flex: '1 1 0', minWidth: 320 }}>
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                      <BarChart data={nutricionMotivoData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} />
                        <Legend />
                        <RTooltip />
                        <Bar dataKey="total" name="Total">
                          {nutricionMotivoData.map((entry, index) => (
                            <Cell key={`mot-${index}`} fill={colorPalette[index % colorPalette.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div style={{ flex: '0 1 280px' }}>
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={nutricionSexoData} dataKey="total" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                          {nutricionSexoData.map((entry, index) => (
                            <Cell key={`sx-${index}`} fill={index % 2 === 0 ? theme.primary : theme.success} />
                          ))}
                        </Pie>
                        <Legend />
                        <RTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className="d-flex justify-content-end mt-2">
                <Button
                  variant="primary"
                  title={mostrarFiltros ? 'Ocultar filtros' : 'Mostrar filtros'}
                  aria-label={mostrarFiltros ? 'Ocultar filtros' : 'Mostrar filtros'}
                  onClick={() => setMostrarFiltros(v => !v)}
                  style={{
                    borderRadius: 4,
                    width: 44,
                    height: 36,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                    color: '#fff',
                    boxShadow: isDark ? '0 2px 6px rgba(255,255,255,.15)' : '0 2px 6px rgba(13,110,253,.3)'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M6 10.117V15l4-2.286V10.12l4.757-5.948A1 1 0 0 0 14.93 2H1.07a1 1 0 0 0-.828 1.172zM2.404 3.5h11.192L9.5 9.06v3.223L6.5 13.94V9.06z"/>
                  </svg>
                </Button>
              </div>
              {mostrarFiltros && (
              <div className="mt-3 nutri-filtros" style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 220 }}>
                  <label className="form-label mb-1" style={{ color: isDark ? '#ffffff' : theme.primary }}>Desde: </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    style={{
                      borderRadius: 4,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : theme.primary}`,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : undefined,
                      color: isDark ? '#ffffff' : undefined
                    }}
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                  />
                </div>
                <div style={{ minWidth: 220 }}>
                  <label className="form-label mb-1" style={{ color: isDark ? '#ffffff' : theme.primary }}>Hasta: </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    style={{
                      borderRadius: 4,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : theme.primary}`,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : undefined,
                      color: isDark ? '#ffffff' : undefined
                    }}
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                  />
                </div>
                <div style={{ minWidth: 220 }}>
                  <label className="form-label mb-1" style={{ color: isDark ? '#ffffff' : theme.primary }}>Sexo: </label>
                  <select
                    className="form-select form-select-sm"
                    value={sexo}
                    onChange={(e) => setSexo(e.target.value)}
                    style={{
                      borderRadius: 4,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : theme.primary}`,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : undefined,
                      color: isDark ? '#ffffff' : undefined
                    }}
                  >
                    <option value="">Todos</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                <div style={{ minWidth: 220 }}>
                  <label className="form-label mb-1" style={{ color: isDark ? '#ffffff' : theme.primary }}>Motivo: </label>
                  <select
                    className="form-select form-select-sm"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    style={{
                      borderRadius: 4,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : theme.primary}`,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : undefined,
                      color: isDark ? '#ffffff' : undefined
                    }}
                  >
                    <option value="">Todos</option>
                    <option value="Nuevo">Nuevo</option>
                    <option value="Reconsulta">Reconsulta</option>
                  </select>
                </div>
                <div>
                  <Button
                    variant="primary"
                    className="px-4"
                    style={{
                      borderRadius: 4,
                      fontWeight: 1000,
                      boxShadow: isDark ? '0 2px 6px rgba(255,255,255,.15)' : '0 2px 6px rgba(13,110,253,.3)',
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                      color: '#fff'
                    }}
                    onClick={aplicarFiltrosNutricion}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

    </Container>
  );
}

export default DashboardsInteractivos;
