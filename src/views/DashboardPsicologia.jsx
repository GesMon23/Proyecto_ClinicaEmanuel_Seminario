import React, { useEffect, useMemo, useState } from "react";
import { Card, Container, Row, Col } from "react-bootstrap";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import api from "@/config/api";

function DashboardPsicologia() {
  const [psicoTipoData, setPsicoTipoData] = useState([]);
  const [psicoAtencionData, setPsicoAtencionData] = useState([]);
  const [psicoPronosticoData, setPsicoPronosticoData] = useState([]);
  const [psicoSexoData, setPsicoSexoData] = useState([]);
  const [psicoJornadaData, setPsicoJornadaData] = useState([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [sexo, setSexo] = useState("");
  const [mostrarFiltrosPsico, setMostrarFiltrosPsico] = useState(false);
  // Filtros independientes para KDQOL
  const [desdeK, setDesdeK] = useState("");
  const [hastaK, setHastaK] = useState("");
  const [sexoK, setSexoK] = useState("");
  const [mostrarFiltrosKdqol, setMostrarFiltrosKdqol] = useState(false);
  const [totalKdqol, setTotalKdqol] = useState(0);
  const [promKdqol, setPromKdqol] = useState({ fisico: null, mental: null, sintomas: null, carga: null, efectos: null, global: null });
  const [kdqolJornadaData, setKdqolJornadaData] = useState([]);
  const [kdqolSexoData, setKdqolSexoData] = useState([]);
  const [theme] = useState({
    primary: "#0d6efd",
    info: "#0dcaf0",
    success: "#198754",
    warning: "#ffc107",
    danger: "#dc3545",
    secondary: "#6c757d",
    purple: "#6f42c1",
  });
  const [isDark] = useState(false);

  const colorPalette = useMemo(() => [
    '#0d6efd', // azul base
    '#198754', // verde base
    '#dc3545', // rojo base
    '#6ea8fe', // azul claro
    '#52b788', // verde medio
    '#ff6b6b', // rojo medio
    '#9ec5fe', // azul muy claro
    '#74c69d', // verde claro
    '#ff8787', // rojo claro
  ], []);

  // Carga de gráficas generales (no KDQOL)
  const cargarDatosBasicos = async (params) => {
    try {
      const { data } = await api.get('/api/estadisticas/psicologia-por-tipo', { params });
      const items = (data?.items || []).map(i => ({ name: i.tipo, total: i.total }));
      setPsicoTipoData(items);
    } catch (_) { setPsicoTipoData([]); }
    try {
      const { data } = await api.get('/api/estadisticas/psicologia-por-atencion', { params });
      const items = (data?.items || []).map(i => ({ name: i.atencion, total: i.total }));
      setPsicoAtencionData(items);
    } catch (_) { setPsicoAtencionData([]); }
    try {
      const { data } = await api.get('/api/estadisticas/psicologia-por-pronostico', { params });
      const items = (data?.items || []).map(i => ({ name: i.pronostico, total: i.total }));
      setPsicoPronosticoData(items);
    } catch (_) { setPsicoPronosticoData([]); }
    try {
      const { data } = await api.get('/api/estadisticas/psicologia-por-sexo', { params });
      const items = (data?.items || []).map(i => ({ name: i.sexo, total: i.total }));
      setPsicoSexoData(items);
    } catch (_) { setPsicoSexoData([]); }
    try {
      const { data } = await api.get('/api/estadisticas/psicologia-por-jornada', { params });
      const items = (data?.items || []).map(i => ({ name: i.jornada, total: i.total }));
      setPsicoJornadaData(items);
    } catch (_) { setPsicoJornadaData([]); }
  };

  // Carga de métricas y gráficas KDQOL (filtros independientes)
  const cargarDatosKdqol = async (params) => {
    try {
      const { data } = await api.get('/api/estadisticas/psicologia-kdqol-total', { params });
      setTotalKdqol(Number(data?.total || 0));
    } catch (_) { setTotalKdqol(0); }
    try {
      const { data } = await api.get('/api/estadisticas/psicologia-kdqol-promedios', { params });
      const p = data?.promedios || {};
      setPromKdqol({
        fisico: p.fisico != null ? Number(p.fisico) : null,
        mental: p.mental != null ? Number(p.mental) : null,
        sintomas: p.sintomas != null ? Number(p.sintomas) : null,
        carga: p.carga != null ? Number(p.carga) : null,
        efectos: p.efectos != null ? Number(p.efectos) : null,
        global: p.global != null ? Number(p.global) : null,
      });
    } catch (_) { setPromKdqol({ fisico: null, mental: null, sintomas: null, carga: null, efectos: null, global: null }); }
    try {
      const { data } = await api.get('/api/estadisticas/psicologia-kdqol-por-jornada', { params });
      const items = (data?.items || []).map(i => ({ name: i.jornada, total: i.total }));
      setKdqolJornadaData(items);
    } catch (_) { setKdqolJornadaData([]); }
    try {
      const { data } = await api.get('/api/estadisticas/psicologia-kdqol-por-sexo', { params });
      const items = (data?.items || []).map(i => ({ name: i.sexo, total: i.total }));
      setKdqolSexoData(items);
    } catch (_) { setKdqolSexoData([]); }
  };

  const KdqolPromTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const val = Number(payload[0]?.value || 0);
    return (
      <div style={{ background: '#fff', border: '1px solid #ddd', padding: 8, borderRadius: 6 }}>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div>Promedio: {val.toFixed(2)}</div>
      </div>
    );
  };

  useEffect(() => {
    cargarDatosBasicos({});
    cargarDatosKdqol({});
  }, []);

  const aplicarFiltros = () => {
    const params = {};
    if (desde && hasta) { params.desde = desde; params.hasta = hasta; }
    if (sexo) { params.sexo = sexo; }
    cargarDatosBasicos(params);
  };

  const aplicarFiltrosKdqol = () => {
    const params = {};
    if (desdeK && hastaK) { params.desde = desdeK; params.hasta = hastaK; }
    if (sexoK) { params.sexo = sexoK; }
    cargarDatosKdqol(params);
  };

  const totalPsico = (psicoTipoData || []).reduce((acc, i) => acc + (Number(i.total) || 0), 0);
  const totalJornada = (psicoJornadaData || []).reduce((a, b) => a + (Number(b.total) || 0), 0);
  const totalPronostico = (psicoPronosticoData || []).reduce((a, b) => a + (Number(b.total) || 0), 0);
  const totalAtencion = (psicoAtencionData || []).reduce((a, b) => a + (Number(b.total) || 0), 0);
  const totalSexo = (psicoSexoData || []).reduce((a, b) => a + (Number(b.total) || 0), 0);
  const totalKdqolJornada = (kdqolJornadaData || []).reduce((a, b) => a + (Number(b.total) || 0), 0);
  const totalKdqolSexo = (kdqolSexoData || []).reduce((a, b) => a + (Number(b.total) || 0), 0);

  const kdqolPromData = useMemo(() => [
    { name: 'Físico y mental', promedio: promKdqol.fisico },
    { name: 'Enfermedad Renal', promedio: promKdqol.mental },
    { name: 'Síntomas y Problemas', promedio: promKdqol.sintomas },
    { name: 'Efectos de la Enfermedad', promedio: promKdqol.efectos },
    { name: 'Vida Diaria', promedio: promKdqol.carga },
  ].filter(d => d.promedio != null), [promKdqol]);

  // Tooltips personalizados (muestran total y porcentaje al hover)
  const PsicoTipoTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0];
    const name = p?.name || p?.payload?.name;
    const val = Number(p?.value ?? p?.payload?.total ?? 0);
    const pct = totalPsico > 0 ? ((val * 100) / totalPsico).toFixed(1) : '0.0';
    return (
      <div style={{ background: '#fff', border: '1px solid #ddd', padding: 8, borderRadius: 6 }}>
        <div style={{ fontWeight: 600 }}>{name}</div>
        <div>Total: {val}</div>
        <div>%: {pct}%</div>
      </div>
    );
  };

  const PsicoJornadaTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const val = Number(payload[0]?.value || 0);
    const pct = totalJornada > 0 ? ((val * 100) / totalJornada).toFixed(1) : '0.0';
    return (
      <div style={{ background: '#fff', border: '1px solid #ddd', padding: 8, borderRadius: 6 }}>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div>Total: {val}</div>
        <div>%: {pct}%</div>
      </div>
    );
  };

  const PsicoPronosticoTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0];
    const name = p?.name || p?.payload?.name;
    const val = Number(p?.value ?? p?.payload?.total ?? 0);
    const pct = totalPronostico > 0 ? ((val * 100) / totalPronostico).toFixed(1) : '0.0';
    return (
      <div style={{ background: '#fff', border: '1px solid #ddd', padding: 8, borderRadius: 6 }}>
        <div style={{ fontWeight: 600 }}>{name}</div>
        <div>Total: {val}</div>
        <div>%: {pct}%</div>
      </div>
    );
  };

  const PsicoAtencionTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const val = Number(payload[0]?.value || 0);
    const pct = totalAtencion > 0 ? ((val * 100) / totalAtencion).toFixed(1) : '0.0';
    return (
      <div style={{ background: '#fff', border: '1px solid #ddd', padding: 8, borderRadius: 6 }}>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div>Total: {val}</div>
        <div>%: {pct}%</div>
      </div>
    );
  };

  const PsicoSexoTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0];
    const name = p?.name || p?.payload?.name;
    const val = Number(p?.value ?? p?.payload?.total ?? 0);
    const pct = totalSexo > 0 ? ((val * 100) / totalSexo).toFixed(1) : '0.0';
    return (
      <div style={{ background: '#fff', border: '1px solid #ddd', padding: 8, borderRadius: 6 }}>
        <div style={{ fontWeight: 600 }}>{name}</div>
        <div>Total: {val}</div>
        <div>%: {pct}%</div>
      </div>
    );
  };

  const KdqolJornadaTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const val = Number(payload[0]?.value || 0);
    const pct = totalKdqolJornada > 0 ? ((val * 100) / totalKdqolJornada).toFixed(1) : '0.0';
    return (
      <div style={{ background: '#fff', border: '1px solid #ddd', padding: 8, borderRadius: 6 }}>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div>Total: {val}</div>
        <div>%: {pct}%</div>
      </div>
    );
  };

  const KdqolSexoTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0];
    const name = p?.name || p?.payload?.name;
    const val = Number(p?.value ?? p?.payload?.total ?? 0);
    const pct = totalKdqolSexo > 0 ? ((val * 100) / totalKdqolSexo).toFixed(1) : '0.0';
    return (
      <div style={{ background: '#fff', border: '1px solid #ddd', padding: 8, borderRadius: 6 }}>
        <div style={{ fontWeight: 600 }}>{name}</div>
        <div>Total: {val}</div>
        <div>%: {pct}%</div>
      </div>
    );
  };

  return (
    <>
      <div className="mb-3">
        <Card className="card-stats text-center" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(25,135,84,0.12)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : theme.success, color: isDark ? '#ffffff' : theme.success }}>
          <Card.Body className="text-center">
            <div className="numbers text-center">
              <p className="card-category" style={{ fontWeight: 800, marginBottom: 8, letterSpacing: '.06em', color: isDark ? 'rgba(255,255,255,0.85)' : undefined }}>TOTAL</p>
              <Card.Title as="h1" style={{ fontSize: '3.2rem', fontWeight: 900, margin: 0, color: isDark ? '#ffffff' : theme.success }}>{Number(totalPsico || 0).toLocaleString()}</Card.Title>
            </div>
          </Card.Body>
        </Card>
      </div>
      <div className="mt-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, alignItems: 'stretch' }}>
        <div>
          <h5 style={{ fontWeight: 700, marginBottom: 8 }}>Tipo de consulta</h5>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={psicoTipoData}
                  dataKey="total"
                  nameKey="name"
                  outerRadius={110}
                  paddingAngle={2}
                >
                  {psicoTipoData.map((entry, index) => (
                    <Cell key={`psico-${index}`} fill={colorPalette[index % colorPalette.length]} />
                  ))}
                </Pie>
                <Legend layout="vertical" verticalAlign="middle" align="right" />
                <RTooltip content={<PsicoTipoTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h5 style={{ fontWeight: 700, marginBottom: 8 }}>Jornada</h5>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={psicoJornadaData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis />
                <RTooltip content={<PsicoJornadaTooltip />} />
                <Bar dataKey="total">
                  {psicoJornadaData.map((entry, index) => (
                    <Cell key={`jor-${index}`} fill={colorPalette[index % colorPalette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h5 style={{ fontWeight: 700, marginBottom: 8 }}>Pronóstico</h5>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={psicoPronosticoData}
                  dataKey="total"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {psicoPronosticoData.map((entry, index) => (
                    <Cell key={`pr-${index}`} fill={colorPalette[index % colorPalette.length]} />
                  ))}
                </Pie>
                <RTooltip content={<PsicoPronosticoTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      
      <div className="mt-4" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
        <div style={{ flex: '1 1 0', minWidth: 320 }}>
          <h5 style={{ fontWeight: 700, marginBottom: 8 }}>Tipo de atención</h5>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={psicoAtencionData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={140} />
                <RTooltip content={<PsicoAtencionTooltip />} />
                <Bar dataKey="total">
                  {psicoAtencionData.map((entry, index) => (
                    <Cell key={`at-${index}`} fill={colorPalette[index % colorPalette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ flex: '0 1 280px' }}>
          <h5 style={{ fontWeight: 700, marginBottom: 8 }}>Sexo</h5>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={psicoSexoData}
                  dataKey="total"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {psicoSexoData.map((entry, index) => (
                    <Cell key={`sx-${index}`} fill={index % 2 === 0 ? '#198754' : '#43a047'} />
                  ))}
                </Pie>
                <Legend />
                <RTooltip content={<PsicoSexoTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="d-flex justify-content-end mt-2">
        <button
          className="btn btn-primary"
          title={mostrarFiltrosPsico ? 'Ocultar filtros' : 'Mostrar filtros'}
          aria-label={mostrarFiltrosPsico ? 'Ocultar filtros' : 'Mostrar filtros'}
          onClick={() => setMostrarFiltrosPsico(v => !v)}
          style={{
            borderRadius: 4,
            width: 44,
            height: 36,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.success,
            borderColor: theme.success,
            color: '#fff',
            boxShadow: isDark ? '0 2px 6px rgba(255,255,255,.15)' : '0 2px 6px rgba(25,135,84,.3)'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M6 10.117V15l4-2.286V10.12l4.757-5.948A1 1 0 0 0 14.93 2H1.07a1 1 0 0 0-.828 1.172zM2.404 3.5h11.192L9.5 9.06v3.223L6.5 13.94V9.06z"/>
          </svg>
        </button>
      </div>
      {mostrarFiltrosPsico && (
        <div className="mt-3 psico-filtros" style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
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
          <div>
            <button
              className="btn btn-primary px-4"
              style={{
                borderRadius: 4,
                fontWeight: 1000,
                boxShadow: isDark ? '0 2px 6px rgba(255,255,255,.15)' : '0 2px 6px rgba(13,110,253,.3)',
                backgroundColor: theme.primary,
                borderColor: theme.primary,
                color: '#fff'
              }}
              onClick={aplicarFiltros}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
      <div className="mt-4">
        <div style={{
          backgroundColor: theme.success,
          color: '#fff',
          borderRadius: 6,
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: isDark ? '0 2px 6px rgba(255,255,255,.15)' : '0 2px 6px rgba(25,135,84,.3)'
        }}>
          <span style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '.04em', textTransform: 'uppercase' }}>RESULTADOS KDQOL</span>
        </div>

        <div className="mb-2 mt-3">
          <Card className="card-stats text-center" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(25,135,84,0.12)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : theme.success, color: isDark ? '#ffffff' : theme.success }}>
            <Card.Body className="text-center">
              <div className="numbers text-center">
                <p className="card-category" style={{ fontWeight: 800, marginBottom: 8, letterSpacing: '.06em', color: isDark ? 'rgba(255,255,255,0.85)' : undefined }}>TOTAL KDQOL</p>
                <Card.Title as="h1" style={{ fontSize: '2.8rem', fontWeight: 900, margin: 0, color: isDark ? '#ffffff' : theme.success }}>{Number(totalKdqol || 0).toLocaleString()}</Card.Title>
              </div>
            </Card.Body>
          </Card>
        </div>

        <div className="mb-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
          <div>
            <Card className="card-stats text-center" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(25,135,84,0.12)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : theme.success, color: isDark ? '#ffffff' : theme.success }}>
              <Card.Body className="text-center">
                <div className="numbers text-center">
                  <p className="card-category" style={{ fontWeight: 700, marginBottom: 8, color: isDark ? 'rgba(255,255,255,0.8)' : undefined }}>Físico y mental</p>
                  <Card.Title as="h2" style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, color: isDark ? '#ffffff' : theme.success }}>{promKdqol.fisico != null ? promKdqol.fisico.toFixed(2) : '—'}</Card.Title>
                </div>
              </Card.Body>
            </Card>
          </div>
          <div>
            <Card className="card-stats text-center" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(25,135,84,0.12)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : theme.success, color: isDark ? '#ffffff' : theme.success }}>
              <Card.Body className="text-center">
                <div className="numbers text-center">
                  <p className="card-category" style={{ fontWeight: 700, marginBottom: 8, color: isDark ? 'rgba(255,255,255,0.8)' : undefined }}>Enfermedad Renal</p>
                  <Card.Title as="h2" style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, color: isDark ? '#ffffff' : theme.success }}>{promKdqol.mental != null ? promKdqol.mental.toFixed(2) : '—'}</Card.Title>
                </div>
              </Card.Body>
            </Card>
          </div>
          <div>
            <Card className="card-stats text-center" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(25,135,84,0.12)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : theme.success, color: isDark ? '#ffffff' : theme.success }}>
              <Card.Body className="text-center">
                <div className="numbers text-center">
                  <p className="card-category" style={{ fontWeight: 700, marginBottom: 8, color: isDark ? 'rgba(255,255,255,0.8)' : undefined }}>Síntomas y Problemas</p>
                  <Card.Title as="h2" style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, color: isDark ? '#ffffff' : theme.success }}>{promKdqol.sintomas != null ? promKdqol.sintomas.toFixed(2) : '—'}</Card.Title>
                </div>
              </Card.Body>
            </Card>
          </div>
          <div>
            <Card className="card-stats text-center" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(25,135,84,0.12)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : theme.success, color: isDark ? '#ffffff' : theme.success }}>
              <Card.Body className="text-center">
                <div className="numbers text-center">
                  <p className="card-category" style={{ fontWeight: 700, marginBottom: 8, color: isDark ? 'rgba(255,255,255,0.8)' : undefined }}>Efectos de la Enfermedad</p>
                  <Card.Title as="h2" style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, color: isDark ? '#ffffff' : theme.success }}>{promKdqol.efectos != null ? promKdqol.efectos.toFixed(2) : '—'}</Card.Title>
                </div>
              </Card.Body>
            </Card>
          </div>
          <div>
            <Card className="card-stats text-center" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(25,135,84,0.12)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : theme.success, color: isDark ? '#ffffff' : theme.success }}>
              <Card.Body className="text-center">
                <div className="numbers text-center">
                  <p className="card-category" style={{ fontWeight: 700, marginBottom: 8, color: isDark ? 'rgba(255,255,255,0.8)' : undefined }}>Vida Diaria</p>
                  <Card.Title as="h2" style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, color: isDark ? '#ffffff' : theme.success }}>{promKdqol.carga != null ? promKdqol.carga.toFixed(2) : '—'}</Card.Title>
                </div>
              </Card.Body>
            </Card>
          </div>
          <div>
            <Card className="card-stats text-center" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(25,135,84,0.12)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : theme.success, color: isDark ? '#ffffff' : theme.success }}>
              <Card.Body className="text-center">
                <div className="numbers text-center">
                  <p className="card-category" style={{ fontWeight: 800, marginBottom: 8, letterSpacing: '.06em', color: isDark ? 'rgba(255,255,255,0.85)' : undefined }}>PROMEDIO GLOBAL</p>
                  <Card.Title as="h2" style={{ fontSize: '2.4rem', fontWeight: 900, margin: 0, color: isDark ? '#ffffff' : theme.success }}>{promKdqol.global != null ? promKdqol.global.toFixed(2) : '—'}</Card.Title>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>
      </div>

      <div className="mt-4" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
        <div style={{ flex: '1 1 0', minWidth: 320 }}>
          <h5 style={{ fontWeight: 700, marginBottom: 8 }}>KDQOL por jornada</h5>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={kdqolJornadaData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={140} />
                <RTooltip content={<KdqolJornadaTooltip />} />
                <Bar dataKey="total">
                  {kdqolJornadaData.map((entry, index) => (
                    <Cell key={`kdqol-jor-${index}`} fill={colorPalette[index % colorPalette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ flex: '0 1 280px' }}>
          <h5 style={{ fontWeight: 700, marginBottom: 8 }}>KDQOL por sexo</h5>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={kdqolSexoData}
                  dataKey="total"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {kdqolSexoData.map((entry, index) => (
                    <Cell key={`kdqol-sx-${index}`} fill={index % 2 === 0 ? '#198754' : '#43a047'} />
                  ))}
                </Pie>
                <Legend />
                <RTooltip content={<KdqolSexoTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h5 style={{ fontWeight: 700, marginBottom: 8 }}>Promedios KDQOL por área</h5>
        <div style={{ width: '100%', height: 340 }}>
          <ResponsiveContainer>
            <BarChart data={kdqolPromData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis />
              <RTooltip content={<KdqolPromTooltip />} />
              <Bar dataKey="promedio">
                {kdqolPromData.map((entry, index) => (
                  <Cell key={`kdqol-prom-${index}`} fill={colorPalette[index % colorPalette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="d-flex justify-content-end mt-3">
        <button
          className="btn btn-primary"
          title={mostrarFiltrosKdqol ? 'Ocultar filtros KDQOL' : 'Mostrar filtros KDQOL'}
          aria-label={mostrarFiltrosKdqol ? 'Ocultar filtros KDQOL' : 'Mostrar filtros KDQOL'}
          onClick={() => setMostrarFiltrosKdqol(v => !v)}
          style={{
            borderRadius: 4,
            width: 44,
            height: 36,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#43a047',
            borderColor: '#43a047',
            color: '#fff',
            boxShadow: isDark ? '0 2px 6px rgba(255,255,255,.15)' : '0 2px 6px rgba(67,160,71,.3)'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M6 10.117V15l4-2.286V10.12l4.757-5.948A1 1 0 0 0 14.93 2H1.07a1 1 0 0 0-.828 1.172zM2.404 3.5h11.192L9.5 9.06v3.223L6.5 13.94V9.06z"/>
          </svg>
        </button>
      </div>

      {mostrarFiltrosKdqol && (
        <div className="mt-3 psico-filtros" style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
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
              value={desdeK}
              onChange={(e) => setDesdeK(e.target.value)}
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
              value={hastaK}
              onChange={(e) => setHastaK(e.target.value)}
            />
          </div>
          <div style={{ minWidth: 220 }}>
            <label className="form-label mb-1" style={{ color: isDark ? '#ffffff' : theme.primary }}>Sexo: </label>
            <select
              className="form-select form-select-sm"
              value={sexoK}
              onChange={(e) => setSexoK(e.target.value)}
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
          <div>
            <button
              className="btn btn-primary px-4"
              style={{
                borderRadius: 4,
                fontWeight: 1000,
                boxShadow: isDark ? '0 2px 6px rgba(255,255,255,.15)' : '0 2px 6px rgba(13,110,253,.3)',
                backgroundColor: theme.primary,
                borderColor: theme.primary,
                color: '#fff'
              }}
              onClick={aplicarFiltrosKdqol}
            >
              Aplicar KDQOL
            </button>
          </div>
        </div>
      )}

      {isDark && (
        <style>{`
          .psico-filtros .form-control { color: #ffffff !important; }
          .psico-filtros .form-control::placeholder { color: rgba(255,255,255,0.75) !important; }
          .psico-filtros input[type="date"] { color: #ffffff !important; }
          .psico-filtros input[type="date"]::-webkit-datetime-edit,
          .psico-filtros input[type="date"]::-webkit-datetime-edit-text,
          .psico-filtros input[type="date"]::-webkit-datetime-edit-month-field,
          .psico-filtros input[type="date"]::-webkit-datetime-edit-day-field,
          .psico-filtros input[type="date"]::-webkit-datetime-edit-year-field { color: #ffffff !important; }
          .psico-filtros input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) !important; }
          .psico-filtros label.form-label { color: rgba(255,255,255,0.95) !important; }
          @-moz-document url-prefix() { .psico-filtros input[type="date"]{ color: #ffffff !important; } }
        `}</style>
      )}
    </>
  );
}

export default DashboardPsicologia;
