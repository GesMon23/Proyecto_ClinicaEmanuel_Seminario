// Piezas compartidas de los paneles del dashboard.
import React from 'react';
import { Button, Card } from 'react-bootstrap';
import { ResponsiveContainer } from 'recharts';
import { withAlpha } from './tema';
import { porcentaje } from './calculos';

const TARJETA_TOOLTIP = { background: '#fff', border: '1px solid #ddd', padding: 8, borderRadius: 6 };

// Encabezado de color de cada panel (Pacientes, Nutrición, Psicología)
export function CabeceraPanel({ titulo, color }) {
  return (
    <Card.Header style={{ backgroundColor: color, color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Card.Title
        as="h3"
        style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0, textAlign: 'center', width: '100%' }}
      >
        {titulo}
      </Card.Title>
    </Card.Header>
  );
}

// Tarjeta con una cifra grande. `tono` es el color de marca; `alfaFondo` la intensidad del fondo en modo claro.
export function TarjetaCifra({ etiqueta, valor, tono, isDark, tamano = '3.2rem', grande = true, nota, alfaFondo = 0.12 }) {
  const blanco = '#ffffff';
  return (
    <Card
      className="card-stats text-center"
      style={{
        overflow: 'hidden',
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : withAlpha(tono, alfaFondo),
        borderColor: isDark ? 'rgba(255,255,255,0.15)' : tono,
        color: isDark ? blanco : tono,
      }}
    >
      <Card.Body className="text-center">
        <div className="numbers text-center">
          <p
            className="card-category"
            style={{ fontWeight: grande ? 800 : 700, marginBottom: 8, letterSpacing: grande ? '.06em' : undefined, color: isDark ? 'rgba(255,255,255,0.85)' : undefined }}
          >
            {etiqueta}
          </p>
          <Card.Title as={grande ? 'h1' : 'h2'} style={{ fontSize: tamano, fontWeight: 900, margin: 0, color: isDark ? blanco : tono }}>
            {valor}
          </Card.Title>
          {nota && <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>{nota}</div>}
        </div>
      </Card.Body>
    </Card>
  );
}

// Contenedor de un gráfico: título opcional y mensaje cuando no hay datos
export function MarcoGrafico({ titulo, clase, hayDatos, children, Titulo = 'h6' }) {
  return (
    <div className={`w-full ${clase}`}>
      {titulo && React.createElement(Titulo, { style: { fontWeight: 700, marginBottom: 8 } }, titulo)}
      {hayDatos ? (
        <ResponsiveContainer>{children}</ResponsiveContainer>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>Sin datos disponibles</div>
      )}
    </div>
  );
}

// Tooltip con valor y porcentaje sobre `total`
export function TooltipPorcentaje({ active, payload, label, total, etiqueta = 'Valor' }) {
  if (!active || !payload || !payload.length) return null;
  const v = Number(payload[0]?.value || 0);
  const nombre = payload[0]?.name || payload[0]?.payload?.name || label;
  return (
    <div style={TARJETA_TOOLTIP}>
      <div style={{ fontWeight: 600 }}>{nombre}</div>
      <div>{etiqueta}: {v.toLocaleString()}</div>
      <div>%: {porcentaje(v, total).toFixed(1)}%</div>
    </div>
  );
}

export function TooltipEstadoNutricional({ active, payload, estados, total }) {
  if (!active || !payload || !payload.length) return null;
  const nombre = payload[0]?.name || payload[0]?.payload?.name;
  const fila = estados.find((r) => r.name === nombre) || {};
  const cantidad = Number(fila.total || 0);
  return (
    <div style={TARJETA_TOOLTIP}>
      <div style={{ fontWeight: 600 }}>{nombre}</div>
      <div>Total: {cantidad}</div>
      <div>%: {porcentaje(cantidad, total).toFixed(1)}%</div>
      <div>IMC prom.: {(Number(fila.imc_promedio) || 0).toFixed(2)}</div>
      <div>Peso prom. (kg): {(Number(fila.peso_promedio) || 0).toFixed(2)}</div>
      <div>Altura prom. (cm): {(Number(fila.altura_promedio) || 0).toFixed(2)}</div>
    </div>
  );
}

export function TooltipJornada({ active, payload, label, total }) {
  if (!active || !payload || !payload.length) return null;
  const v = Number(payload[0].value || 0);
  return (
    <div style={TARJETA_TOOLTIP}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      <div>Total: {v}</div>
      <div>%: {porcentaje(v, total).toFixed(1)}%</div>
    </div>
  );
}

export function BotonAlternarFiltros({ abierto, onClick, theme, isDark, color = theme.primary }) {
  const titulo = abierto ? 'Ocultar filtros' : 'Mostrar filtros';
  return (
    <Button
      variant="primary"
      title={titulo}
      aria-label={titulo}
      onClick={onClick}
      style={{
        borderRadius: 4, width: 44, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: color, borderColor: color, color: '#fff',
        boxShadow: isDark ? '0 2px 6px rgba(255,255,255,.15)' : `0 2px 6px ${withAlpha(color, 0.3)}`,
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M6 10.117V15l4-2.286V10.12l4.757-5.948A1 1 0 0 0 14.93 2H1.07a1 1 0 0 0-.828 1.172zM2.404 3.5h11.192L9.5 9.06v3.223L6.5 13.94V9.06z" />
      </svg>
    </Button>
  );
}

// Campo del panel de filtros: `tipo` = 'select' (con `opciones`) o cualquier type de input (p. ej. 'date')
export function CampoFiltro({ etiqueta, tipo = 'select', valor, onCambio, opciones = [], todos = 'Todos', theme, isDark }) {
  const estilo = {
    borderRadius: 4,
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : theme.primary}`,
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : undefined,
    color: isDark ? '#ffffff' : undefined,
  };
  return (
    <div style={{ minWidth: 220 }}>
      <label className="form-label mb-1" style={{ color: isDark ? '#ffffff' : theme.primary }}>{etiqueta}</label>
      {tipo === 'select' ? (
        <select className="form-select form-select-sm" value={valor} onChange={(e) => onCambio(e.target.value)} style={estilo}>
          <option value="">{todos}</option>
          {opciones.map((o) => {
            const [v, texto] = Array.isArray(o) ? o : [o, o];
            return <option key={v} value={v}>{texto}</option>;
          })}
        </select>
      ) : (
        <input type={tipo} className="form-control form-control-sm" value={valor} onChange={(e) => onCambio(e.target.value)} style={estilo} />
      )}
    </div>
  );
}

export function BotonAplicar({ onClick, theme, isDark, children, color = theme.primary }) {
  return (
    <Button
      variant="primary"
      className="px-4"
      style={{
        borderRadius: 4, fontWeight: 900, backgroundColor: color, borderColor: color, color: '#fff',
        boxShadow: isDark ? '0 2px 6px rgba(255,255,255,.15)' : `0 2px 6px ${withAlpha(color, 0.3)}`,
      }}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

// Estilos que necesita Recharts y los filtros en modo oscuro
export function EstilosOscuros({ theme }) {
  return (
    <style>{`
      .recharts-default-legend { color: #e5e7eb !important; }
      .recharts-legend-item-text { color: #e5e7eb !important; }
      .recharts-cartesian-axis-tick-value { fill: #e5e7eb !important; }
      .recharts-pie-label-text { fill: #e5e7eb !important; }
      .recharts-tooltip-wrapper .recharts-default-tooltip { background-color: #111827 !important; border-color: #374151 !important; color: #e5e7eb !important; }
      .pac-filtros .form-label { color: #e5e7eb !important; }
      .pac-filtros .form-select,
      .pac-filtros .form-control { color: #e5e7eb !important; background-color: #0b1220 !important; border-color: #1f2937 !important; }
      .pac-filtros .form-control::placeholder { color: rgba(229,231,235,0.7) !important; }
      .pac-filtros .form-select:focus,
      .pac-filtros .form-control:focus { background-color: #0b1220 !important; color: #e5e7eb !important; border-color: #2563eb !important; box-shadow: 0 0 0 .2rem rgba(37,99,235,.25) !important; }
      .pac-filtros .form-select option { background-color: #0b1220; color: #e5e7eb; }
      .pac-filtros .btn-primary { background-color: ${theme.primary} !important; border-color: ${theme.primary} !important; color: #ffffff !important; }
      .pac-filtros .btn-primary:hover, .pac-filtros .btn-primary:focus { filter: brightness(1.05); }
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
    `}</style>
  );
}

// Oculta la leyenda de los gráficos en pantallas pequeñas
export const EstilosLeyendaMovil = () => (
  <style>{`
    @media (max-width: 768px) {
      .legend-hide-sm .recharts-default-legend,
      .legend-hide-sm .recharts-legend-wrapper { display: none !important; }
    }
  `}</style>
);
