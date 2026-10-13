// Piezas de la pantalla de Estadísticas. Los colores de las gráficas salen de las variables --viz-* de
// index.css, así que siguen el modo oscuro sin lógica en los componentes.
import React, { useState } from 'react';
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis } from 'recharts';

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

// ---------------------------------------------------------------- colores por categoría (pastel / anillo)

const PALETA = Array.from({ length: 8 }, (_, i) => `var(--viz-cat-${i + 1})`);
const COLOR_OTROS = 'var(--viz-otros)';
const MAX_SEGMENTOS = 6; // más que esto no se lee en un pastel: el resto se agrupa en "Otros"

// El color sigue a la categoría, no a su posición: cada gráfica recuerda qué color recibió cada nombre la
// primera vez, así un filtro que quita categorías no repinta las que quedan. `orden` fija los primeros.
const asignados = new Map();
function colorDe(clave, nombre, orden = []) {
  if (nombre === 'Otros') return COLOR_OTROS;
  let mapa = asignados.get(clave);
  if (!mapa) {
    mapa = new Map(orden.map((n, i) => [n, i]));
    asignados.set(clave, mapa);
  }
  if (!mapa.has(nombre)) mapa.set(nombre, mapa.size);
  return PALETA[mapa.get(nombre) % PALETA.length];
}

// Las mayores primero (salvo categorías con orden propio, como la escala del IMC); si hay demasiadas,
// las menores se agrupan en "Otros"
function segmentos(datos, ordenNatural) {
  const conValor = datos.filter((d) => Number(d.total) > 0);
  const ordenados = ordenNatural ? conValor : [...conValor].sort((a, b) => b.total - a.total);
  if (ordenados.length <= MAX_SEGMENTOS) return ordenados;
  const resto = ordenados.slice(MAX_SEGMENTOS - 1);
  return [...ordenados.slice(0, MAX_SEGMENTOS - 1), { nombre: 'Otros', total: resto.reduce((a, d) => a + d.total, 0) }];
}

// ------------------------------------------------------------------------------------------- gráficas

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

// Etiqueta del eje de las columnas (centrada, recortada)
function EtiquetaColumna({ x, y, payload }) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const texto = String(payload.value);
  const corto = texto.length > 16 ? `${texto.slice(0, 15)}…` : texto;
  return (
    <text x={x} y={y} dy={14} textAnchor="middle" fontSize={12} fill="var(--viz-texto-secundario)">
      <title>{texto}</title>
      {corto}
    </text>
  );
}

// Columnas (barras verticales) de una sola serie, con el valor sobre cada columna
function GraficaColumnas({ datos, etiquetaValor, decimales }) {
  const filas = datos.map((d) => ({ ...d, medida: d.valor ?? d.total }));
  return (
    <div role="img" aria-label={filas.map((d) => `${d.nombre}: ${fmt(d.medida, decimales)}`).join('; ')}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={filas} margin={{ top: 24, right: 8, bottom: 4, left: 8 }}>
          <XAxis dataKey="nombre" interval={0} tick={<EtiquetaColumna />} tickLine={false} axisLine={{ stroke: 'var(--viz-eje)' }} />
          <YAxis hide domain={[0, 'dataMax']} />
          <Tooltip cursor={{ fill: 'var(--viz-resaltado)' }} content={<TooltipBarra etiquetaValor={etiquetaValor} decimales={decimales} />} />
          <Bar dataKey="medida" maxBarSize={48} radius={[4, 4, 0, 0]} isAnimationActive={false} fill="var(--viz-serie)">
            <LabelList dataKey="medida" position="top" fontSize={12} fill="var(--viz-texto)" formatter={(v) => fmt(v, decimales)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TooltipPastel({ active, payload, total, etiquetaValor }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-md dark:border-slate-700 dark:bg-slate-800">
      <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
        {fmt(d.total)} <span className="text-sm font-normal text-slate-600 dark:text-slate-300">({fmt((100 * d.total) / total, 1)}%)</span>
      </p>
      <p className="text-slate-600 dark:text-slate-300">{d.nombre} · {etiquetaValor}</p>
    </div>
  );
}

// Pastel o anillo. Cada segmento lleva su color (siguiendo a la categoría) y la leyenda muestra nombre, valor
// y porcentaje, así la identidad nunca depende solo del color.
function GraficaPastel({ datos, etiquetaValor, anillo, clave, orden, ordenNatural }) {
  const segs = segmentos(datos, ordenNatural).map((d) => ({ ...d, color: d.color || colorDe(clave, d.nombre, orden) }));
  const total = segs.reduce((a, d) => a + d.total, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-56 w-full sm:w-1/2" role="img" aria-label={segs.map((d) => `${d.nombre}: ${fmt(d.total)}`).join('; ')}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segs} dataKey="total" nameKey="nombre" outerRadius="85%" innerRadius={anillo ? '55%' : 0}
              stroke="var(--viz-superficie)" strokeWidth={segs.length > 1 ? 2 : 0} isAnimationActive={false}
            >
              {segs.map((d) => <Cell key={d.nombre} fill={d.color} />)}
            </Pie>
            <Tooltip content={<TooltipPastel total={total} etiquetaValor={etiquetaValor} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2 text-sm sm:w-1/2">
        {segs.map((d) => (
          <li key={d.nombre} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: d.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200" title={d.nombre}>{d.nombre}</span>
            <span className="tabular-nums font-medium text-slate-900 dark:text-slate-50">{fmt(d.total)}</span>
            <span className="w-14 text-right tabular-nums text-slate-500 dark:text-slate-400">{fmt((100 * d.total) / total, 1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Celda del mapa de árbol: separación con el color de la superficie y nombre/valor solo si caben
function CeldaMapa({ x, y, width, height, nombre, total }) {
  // El nodo raíz (sin nombre) también pasa por aquí: no se dibuja
  if (typeof nombre !== 'string' || ![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  const cabe = width > 90 && height > 40;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4} fill="var(--viz-serie)" stroke="var(--viz-superficie)" strokeWidth={2} />
      {cabe && (
        <>
          <text x={x + 8} y={y + 18} fontSize={12} fill="#ffffff">{nombre.length > Math.floor(width / 8) ? `${nombre.slice(0, Math.floor(width / 8) - 1)}…` : nombre}</text>
          <text x={x + 8} y={y + 34} fontSize={12} fontWeight={600} fill="#ffffff">{fmt(total)}</text>
        </>
      )}
    </g>
  );
}

// Mapa de árbol: el área de cada rectángulo es proporcional al valor (el valor exacto está en el tooltip y la tabla)
function GraficaMapa({ datos, etiquetaValor }) {
  const filas = datos.filter((d) => Number(d.total) > 0);
  return (
    <div role="img" aria-label={filas.map((d) => `${d.nombre}: ${fmt(d.total)}`).join('; ')}>
      <ResponsiveContainer width="100%" height={280}>
        <Treemap data={filas} dataKey="total" nameKey="nombre" content={<CeldaMapa />} isAnimationActive={false}>
          <Tooltip content={<TooltipBarra etiquetaValor={etiquetaValor} decimales={0} />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

const GRAFICAS = { barras: GraficaBarras, columnas: GraficaColumnas, pastel: GraficaPastel, anillo: GraficaPastel, mapa: GraficaMapa };

// Tarjeta de una gráfica con su vista de tabla (los valores siempre se pueden leer sin pasar el mouse).
//   tipo: 'barras' (horizontales) | 'columnas' | 'pastel' | 'anillo' | 'mapa'
//   orden: para pastel/anillo, nombres con color fijo desde el inicio (p. ej. ['Masculino', 'Femenino'])
//   ordenNatural: no reordenar por tamaño (los datos ya vienen en su orden, p. ej. la escala del IMC)
export function TarjetaGrafica({
  titulo, nota, datos, tipo = 'barras', orden, ordenNatural = false, etiquetaValor = 'Informes', decimales = 0, ancho = false,
}) {
  const [tabla, setTabla] = useState(false);
  const Grafica = GRAFICAS[tipo] || GraficaBarras;
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
        : (
          <Grafica
            datos={datos} etiquetaValor={etiquetaValor} decimales={decimales}
            anillo={tipo === 'anillo'} clave={titulo} orden={orden} ordenNatural={ordenNatural}
          />
        ))}
    </figure>
  );
}
