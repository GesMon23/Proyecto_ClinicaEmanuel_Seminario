// Transformaciones de los datos que devuelve /api/estadisticas/*.

const NOMBRES_ALTERNOS = ['name', 'descripcion', 'nombre'];
const TOTALES_ALTERNOS = ['total', 'c', 'count', 'size'];

const primerValor = (fila, claves) => {
  for (const k of claves) if (fila?.[k] !== undefined && fila?.[k] !== null) return fila[k];
  return undefined;
};

// [{ estado: 'Activo', total: '3' }] -> [{ name: 'Activo', total: 3 }]   (campo: nombre de la columna descriptiva)
export function aNombreTotal(items, campo, claveTotal = 'total') {
  return (items || []).map((i) => ({
    name: String(primerValor(i, [campo, ...NOMBRES_ALTERNOS]) ?? 'N/D'),
    [claveTotal]: Number(primerValor(i, TOTALES_ALTERNOS) ?? 0),
  }));
}

export const sumar = (lista, clave) =>
  (Array.isArray(lista) ? lista : []).reduce((acc, r) => acc + (Number(r?.[clave]) || 0), 0);

// Promedio de `campo` ponderado por `total` de cada fila
export function promedioPonderado(lista, campo) {
  const total = sumar(lista, 'total');
  if (total <= 0) return 0;
  return lista.reduce((acc, r) => acc + (Number(r[campo]) || 0) * (Number(r.total) || 0), 0) / total;
}

export const porcentaje = (valor, total) => (total > 0 ? (valor * 100) / total : 0);

export function nombreSexo(crudo) {
  const raw = (crudo ?? '').toString().trim().toLowerCase();
  if (raw === 'm' || raw.startsWith('masc')) return 'Masculino';
  if (raw === 'f' || raw.startsWith('fem')) return 'Femenino';
  return 'N/D';
}

// Últimos 90 días como { desde, hasta } en YYYY-MM-DD
export function rangoPorDefecto(dias = 90) {
  const aTexto = (d) => d.toISOString().slice(0, 10);
  return { desde: aTexto(new Date(Date.now() - dias * 24 * 3600 * 1000)), hasta: aTexto(new Date()) };
}
