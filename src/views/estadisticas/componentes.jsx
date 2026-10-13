// Piezas de la pantalla de Estadísticas. Los colores de las gráficas salen de las variables --viz-* de
// index.css, así que siguen el modo oscuro sin lógica en los componentes.
import React, { useState } from 'react';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const fmt = (v, decimales = 0) => (v === null || v === undefined || Number.isNaN(Number(v))
  ? '—'
  : Number(v).toLocaleString('es-GT', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }));

const ENTRADA = 'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 '
  + 'focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

export function Selector({ etiqueta, valor, onCambio, opciones, todos = 'Todos' }) {
  return (
    <label className="block min-w-[160px] text-sm font-medium text-slate-700 dark:text-slate-200">
      {etiqueta}
      <select value={valor} onChange={(e) => onCambio(e.target.value)} className={ENTRADA}>
        {todos !== null && <option value="">{todos}</option>}
        {opciones.map(([v, texto]) => <option key={v} value={v}>{texto}</option>)}
      </select>
    </label>
  );
}

export function Fecha({ etiqueta, valor, onCambio }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {etiqueta}
      <input type="date" value={valor} onChange={(e) => onCambio(e.target.value)} className={ENTRADA} />
    </label>
  );
}

// Fila de filtros: siempre arriba del contenido que afecta, nunca dentro de una gráfica
export function FilaFiltros({ children }) {
  return <div className="flex flex-wrap items-end gap-4">{children}</div>;
}

// Una sección (Pacientes, Nutrición, Psicología). Mientras recarga, el contenido se atenúa sin desaparecer.
export function Seccion({ titulo, subtitulo, filtros, cargando, error, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="mb-4 flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{titulo}</h2>
        {subtitulo && <p className="text-sm text-slate-600 dark:text-slate-300">{subtitulo}</p>}
      </header>
      {filtros && <div className="mb-5">{filtros}</div>}
      {error && (
        <p role="alert" className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <div className={`transition-opacity ${cargando ? 'opacity-50' : 'opacity-100'}`} aria-busy={cargando}>
        {children}
      </div>
    </section>
  );
}

export function FilaCifras({ children }) {
  return <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

// Cifra destacada: etiqueta, valor y una nota opcional
export function TarjetaCifra({ etiqueta, valor, decimales = 0, nota }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
      <p className="text-sm text-slate-600 dark:text-slate-300">{etiqueta}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-50">{fmt(valor, decimales)}</p>
      {nota && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{nota}</p>}
    </div>
  );
}

export function RejillaGraficas({ children }) {
  return <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{children}</div>;
}

function SinDatos() {
  return (
    <p className="flex h-24 items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      Sin datos para estos filtros
    </p>
  );
}

function TablaDatos({ datos, etiquetaValor, decimales }) {
  const total = datos.reduce((a, d) => a + (Number(d.total) || 0), 0);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <th className="py-2 font-medium">Categoría</th>
          <th className="py-2 text-right font-medium">{etiquetaValor}</th>
          {!decimales && <th className="py-2 text-right font-medium">%</th>}
        </tr>
      </thead>
      <tbody className="tabular-nums text-slate-800 dark:text-slate-100">
        {datos.map((d) => (
          <tr key={d.nombre} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
            <td className="py-1.5">{d.nombre}</td>
            <td className="py-1.5 text-right">{fmt(d.valor ?? d.total, decimales)}</td>
            {!decimales && <td className="py-1.5 text-right">{total ? fmt((100 * d.total) / total, 1) : '—'}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Etiqueta del eje de categorías: recorta nombres largos (el nombre completo queda en el tooltip y la tabla)
function EtiquetaCategoria({ x, y, payload }) {
  // Recharts la llama una vez antes de calcular la posición: sin coordenadas no se dibuja (evita y="NaN")
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const texto = String(payload.value);
  const corto = texto.length > 22 ? `${texto.slice(0, 21)}…` : texto;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fill="var(--viz-texto-secundario)">
      <title>{texto}</title>
      {corto}
    </text>
  );
}

function TooltipBarra({ active, payload, etiquetaValor, decimales }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-md dark:border-slate-700 dark:bg-slate-800">
      <p className="text-base font-semibold text-slate-900 dark:text-slate-50">{fmt(d.valor ?? d.total, decimales)}</p>
      <p className="text-slate-600 dark:text-slate-300">{d.nombre} · {etiquetaValor}</p>
    </div>
  );
}

// Barras horizontales de una sola serie (o con color por categoría cuando el color tiene significado, p. ej. el IMC).
// datos: [{ nombre, total, valor?, color? }]  ·  valor (si existe) es lo que se grafica en lugar de total
function GraficaBarras({ datos, etiquetaValor, decimales }) {
  const filas = datos.map((d) => ({ ...d, medida: d.valor ?? d.total }));
  const alto = filas.length * 36 + 16;
  return (
    <div role="img" aria-label={filas.map((d) => `${d.nombre}: ${fmt(d.medida, decimales)}`).join('; ')}>
      <ResponsiveContainer width="100%" height={alto}>
        <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 4 }} barCategoryGap={8}>
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis
            type="category" dataKey="nombre" width={170} interval={0}
            tick={<EtiquetaCategoria />} tickLine={false} axisLine={{ stroke: 'var(--viz-eje)' }}
          />
          <Tooltip
            cursor={{ fill: 'var(--viz-resaltado)' }}
            content={<TooltipBarra etiquetaValor={etiquetaValor} decimales={decimales} />}
          />
          <Bar dataKey="medida" maxBarSize={24} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {filas.map((d) => <Cell key={d.nombre} fill={d.color || 'var(--viz-serie)'} />)}
            <LabelList
              dataKey="medida" position="right" fontSize={12} fill="var(--viz-texto)"
              formatter={(v) => fmt(v, decimales)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Tarjeta de una gráfica con su vista de tabla (los valores siempre se pueden leer sin pasar el mouse)
export function TarjetaGrafica({ titulo, nota, datos, etiquetaValor = 'Informes', decimales = 0, ancho = false }) {
  const [tabla, setTabla] = useState(false);
  const vacia = !datos?.length || datos.every((d) => !(Number(d.valor ?? d.total) > 0));
  return (
    <figure className={`m-0 rounded-lg border border-slate-200 p-4 dark:border-slate-700 ${ancho ? 'xl:col-span-2' : ''}`}>
      <figcaption className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-50">{titulo}</p>
          {nota && <p className="text-xs text-slate-500 dark:text-slate-400">{nota}</p>}
        </div>
        {!vacia && (
          <button
            type="button" onClick={() => setTabla((t) => !t)}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-600 dark:text-green-400 dark:hover:bg-slate-800"
          >
            {tabla ? 'Ver gráfica' : 'Ver tabla'}
          </button>
        )}
      </figcaption>
      {vacia && <SinDatos />}
      {!vacia && (tabla
        ? <TablaDatos datos={datos} etiquetaValor={etiquetaValor} decimales={decimales} />
        : <GraficaBarras datos={datos} etiquetaValor={etiquetaValor} decimales={decimales} />)}
    </figure>
  );
}
