// Normalización de los parámetros de las estadísticas.

const DIA_MS = 24 * 3600 * 1000;
const hoyISO = () => new Date().toISOString().slice(0, 10);
const haceDiasISO = (dias) => new Date(Date.now() - dias * DIA_MS).toISOString().slice(0, 10);

// Texto recortado o null
const texto = (v) => (v ? String(v).trim() : null);

// Primera letra en minúscula ('Masculino' -> 'm'); lo usan los filtros de pacientes
const sexoInicial = (v) => (v ? String(v).trim().toLowerCase().charAt(0) : null);

// 'm' | 'f' | null (psicología)
const sexoMF = (v) => {
  if (!v) return null;
  const s = String(v).toLowerCase();
  if (s.startsWith('m')) return 'm';
  if (s.startsWith('f')) return 'f';
  return null;
};

// 'Masculino' | 'Femenino' | null (nutrición)
const sexoCompleto = (v) => {
  if (!v) return null;
  const s = String(v).toLowerCase();
  if (s.startsWith('m')) return 'Masculino';
  if (s.startsWith('f')) return 'Femenino';
  return null;
};

// 'Nuevo' | 'Reconsulta' | null
const motivo = (v) => {
  if (!v) return null;
  const m = String(v).trim();
  return ['Nuevo', 'Reconsulta'].includes(m) ? m : null;
};

// Rango de fechas: sin valores queda abierto (null)
const rangoAbierto = (q) => ({ desde: q.desde || null, hasta: q.hasta || null });
// Rango de fechas: sin valores usa los últimos 90 días
const rango90Dias = (q) => ({ desde: q.desde || haceDiasISO(90), hasta: q.hasta || hoyISO() });

module.exports = { hoyISO, haceDiasISO, texto, sexoInicial, sexoMF, sexoCompleto, motivo, rangoAbierto, rango90Dias };
