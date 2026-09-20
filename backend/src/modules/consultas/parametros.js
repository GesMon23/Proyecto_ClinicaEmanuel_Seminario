// Normalización de parámetros de consulta (query string) antes de enviarlos a los procedimientos.

// Texto sin espacios sobrantes, o null si está vacío
const textoONulo = (v) => {
  const s = (v ?? '').toString().trim();
  return s === '' ? null : s;
};

// Número, o null si está vacío o no es numérico
const enteroONulo = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// 'm' / 'masculino' -> 'Masculino'; 'f' / 'femenino' -> 'Femenino'; otro valor -> null
const sexoNormalizado = (v) => {
  const raw = (v ?? '').toString().trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'm' || raw.startsWith('masc')) return 'Masculino';
  if (raw === 'f' || raw.startsWith('feme')) return 'Femenino';
  return null;
};

module.exports = { textoONulo, enteroONulo, sexoNormalizado };
