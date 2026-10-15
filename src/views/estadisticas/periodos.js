// Períodos de la pantalla de Estadísticas: presets -> { desde, hasta } (fechas locales YYYY-MM-DD; null = abierto)

const iso = (fecha) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}`;
};
const haceDias = (dias, hoy) => { const d = new Date(hoy); d.setDate(d.getDate() - dias); return d; };

export const PERIODOS = [
  { valor: '30', etiqueta: 'Últimos 30 días' },
  { valor: '90', etiqueta: 'Últimos 90 días' },
  { valor: 'anio', etiqueta: 'Este año' },
  { valor: 'todo', etiqueta: 'Todo el historial' },
  { valor: 'personalizado', etiqueta: 'Personalizado…' },
];

export const PERIODO_INICIAL = '90';

// null si el período personalizado todavía no es válido (faltan fechas o desde > hasta)
export function rangoDe(periodo, personalizado = {}, hoy = new Date()) {
  switch (periodo) {
    case '30': return { desde: iso(haceDias(30, hoy)), hasta: iso(hoy) };
    case '90': return { desde: iso(haceDias(90, hoy)), hasta: iso(hoy) };
    case 'anio': return { desde: `${hoy.getFullYear()}-01-01`, hasta: iso(hoy) };
    case 'todo': return { desde: null, hasta: null };
    case 'personalizado': {
      const { desde, hasta } = personalizado;
      return desde && hasta && desde <= hasta ? { desde, hasta } : null;
    }
    default: return null;
  }
}

const dma = (v) => (v ? v.split('-').reverse().join('/') : '');

// Texto para los subtítulos: "Del 13/07/2026 al 11/10/2026" / "Todo el historial"
export function describirRango(rango) {
  if (!rango || (!rango.desde && !rango.hasta)) return 'Todo el historial';
  if (rango.desde && rango.hasta) return `Del ${dma(rango.desde)} al ${dma(rango.hasta)}`;
  return rango.desde ? `Desde el ${dma(rango.desde)}` : `Hasta el ${dma(rango.hasta)}`;
}
