// Índice de masa corporal: cálculo y clasificación de la OMS.
// La misma clasificación vive en la BD (fn_clasificar_imc, BD/hotfix_estado_nutricional.sql) para guardar
// estado_nutricional; si se cambia aquí, cambiarla también allá.

// `hasta` es exclusivo; `texto` es el color legible sobre `color`
export const CATEGORIAS_IMC = [
  { nombre: 'Bajo peso', rango: '< 18.5', hasta: 18.5, color: '#4fb8e7', texto: '#0f2a3a' },
  { nombre: 'Saludable', rango: '18.5 – 24.9', hasta: 25, color: '#8db33a', texto: '#1f2a0a' },
  { nombre: 'Sobrepeso', rango: '25 – 29.9', hasta: 30, color: '#f58a1f', texto: '#2e1600' },
  { nombre: 'Obesidad I', rango: '30 – 34.9', hasta: 35, color: '#e8473b', texto: '#ffffff' },
  { nombre: 'Obesidad II', rango: '35 – 39.9', hasta: 40, color: '#c2449a', texto: '#ffffff' },
  { nombre: 'Obesidad III', rango: '≥ 40', hasta: Infinity, color: '#8e44ad', texto: '#ffffff' },
];

const numero = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));

// peso (kg) / estatura (m)², redondeado a 2 decimales; null si faltan datos válidos
export function calcularIMC(alturaCm, pesoKg) {
  const h = numero(alturaCm);
  const p = numero(pesoKg);
  if (!(h > 0) || !(p > 0)) return null;
  const metros = h / 100;
  return Math.round((p / (metros * metros)) * 100) / 100;
}

// Categoría de CATEGORIAS_IMC, o null si no hay IMC
export function categoriaIMC(imc) {
  const v = numero(imc);
  if (!(v > 0)) return null;
  return CATEGORIAS_IMC.find((c) => v < c.hasta);
}

// Estado nutricional de un informe: el guardado o, en informes anteriores al hotfix, el que corresponde a su IMC
export function estadoNutricional(informe) {
  if (!informe) return '';
  return informe.estado_nutricional || categoriaIMC(informe.imc)?.nombre || '';
}
