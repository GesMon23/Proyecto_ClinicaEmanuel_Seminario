// Cálculos de la ficha del paciente.

// Edad en años cumplidos a la fecha de hoy; acepta 'YYYY-MM-DD' (o con hora). Vacío si no se puede leer.
export function calcularEdad(fechaNacimiento, hoy = new Date()) {
  if (!fechaNacimiento) return '';
  const partes = String(fechaNacimiento).split('T')[0].split(' ')[0].split('-');
  if (partes.length < 3) return '';
  const anio = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
  const dia = parseInt(partes[2], 10);
  if ([anio, mes, dia].some(Number.isNaN)) return '';
  let edad = hoy.getFullYear() - anio;
  const meses = hoy.getMonth() - mes;
  if (meses < 0 || (meses === 0 && hoy.getDate() < dia)) edad--;
  return edad;
}

// Nombre completo a partir de las columnas de nombre del paciente (con o sin guion bajo)
export function nombreCompleto(fila) {
  const it = fila || {};
  return [
    it.primer_nombre ?? it.primernombre,
    it.segundo_nombre ?? it.segundonombre,
    it.primer_apellido ?? it.primerapellido,
    it.segundo_apellido ?? it.segundoapellido,
  ].filter(Boolean).join(' ');
}

const DIMENSIONES_KDQOL = [
  { key: 'fisico_mental', label: 'Físico y Mental' },
  { key: 'enfermedad_renal', label: 'Enfermedad Renal' },
  { key: 'sintomas_problemas', label: 'Síntomas y Problemas' },
  { key: 'efectos_enfermedad', label: 'Efectos de la Enfermedad' },
  { key: 'vida_diaria', label: 'Vida Diaria' },
  // variantes que puede traer el procedimiento
  { key: 'puntaje_fisico', label: 'Puntaje Físico' },
  { key: 'puntaje_mental', label: 'Puntaje Mental' },
  { key: 'puntaje_sintomas', label: 'Puntaje Síntomas' },
  { key: 'puntaje_carga', label: 'Puntaje Carga' },
  { key: 'puntaje_efectos', label: 'Puntaje Efectos' },
];

// KDQOL de un informe de psicología: { kdqol (objeto o null), filas: [{label, value}], promedio (o null) }
export function resumenKdqol(informe) {
  let kdqol = null;
  try { kdqol = typeof informe?.kdqol === 'string' ? JSON.parse(informe.kdqol) : (informe?.kdqol ?? null); } catch { kdqol = null; }
  const filas = [];
  if (kdqol && typeof kdqol === 'object') {
    for (const d of DIMENSIONES_KDQOL) {
      const n = typeof kdqol[d.key] === 'string' ? parseFloat(kdqol[d.key]) : kdqol[d.key];
      if (n != null && !Number.isNaN(n)) filas.push({ label: d.label, value: n });
    }
  }
  const promedio = filas.length > 0 ? Math.round((filas.reduce((s, f) => s + f.value, 0) / filas.length) * 100) / 100 : null;
  return { kdqol, filas, promedio };
}
