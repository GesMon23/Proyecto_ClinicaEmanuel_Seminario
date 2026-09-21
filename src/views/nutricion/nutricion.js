// Reglas del registro de informes de nutrición (sin React).
import api from '@/config/api';

export const FORM_VACIO = { alturaCm: '', pesoKg: '', motivoConsulta: '', observaciones: '' };

// IMC redondeado a 2 decimales; null si faltan datos válidos
export function calcularIMC(alturaCm, pesoKg) {
  const h = parseFloat(alturaCm);
  const p = parseFloat(pesoKg);
  if (!h || !p || h <= 0 || p <= 0) return null;
  const metros = h / 100;
  return Math.round((p / (metros * metros)) * 100) / 100;
}

export function clasificarIMC(imc) {
  if (imc == null) return '';
  if (imc < 18.5) return 'Bajo peso';
  if (imc < 25) return 'Normal';
  if (imc < 30) return 'Sobrepeso';
  return 'Obesidad';
}

// "23.4 (Normal)" o '' mientras falten datos
export function textoEstadoNutricional(alturaCm, pesoKg) {
  const imc = calcularIMC(alturaCm, pesoKg);
  return imc == null ? '' : `${imc} (${clasificarIMC(imc)})`;
}

// Mientras se escribe: nunca negativo; vacío o no numérico se borra
export function normalizarMedida(valor) {
  if (valor === '') return '';
  const n = parseFloat(valor);
  return Number.isNaN(n) ? '' : Math.max(0, n).toString();
}

// Mensaje del primer problema del formulario, o null
export function problemaDelFormulario(form, hayPaciente) {
  if (!hayPaciente) return 'Primero busque y seleccione un paciente.';
  if (!form.motivoConsulta) return 'Seleccione el motivo de la consulta.';
  const h = parseFloat(form.alturaCm);
  const p = parseFloat(form.pesoKg);
  if (!h || h <= 0 || !p || p <= 0) return 'Altura y Peso deben ser mayores a 0.';
  return null;
}

// Guarda el informe; devuelve { guardado, idInforme } (guardado false si la respuesta no trae el informe)
export async function guardarInforme(noAfiliacion, form) {
  const { data } = await api.post('/nutricion/evaluacion', {
    no_afiliacion: noAfiliacion,
    motivo_consulta: form.motivoConsulta,
    altura_cm: parseFloat(form.alturaCm),
    peso_kg: parseFloat(form.pesoKg),
    observaciones: form.observaciones || null,
    usuario_creacion: 'sistema',
  });
  return data && data.informe ? { guardado: true, idInforme: data.informe.id_informe ?? null } : { guardado: false };
}
