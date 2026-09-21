// Reglas del registro de resultados de laboratorio (sin React).
import api from '@/config/api';
import { estaInactivo, nombreCompletoPaciente } from '@/utils/pacientes';
import { formatearFecha } from '@/utils/fechas';

export const PARAMETROS_BASE = [
  'Albúmina gr/dl',
  'Nivel de Hemoglobina (Hb = g/dl)',
  'Leucocitos',
  'Plaquetas',
  'Calcio mg/dl',
  'Fósforo mg/dl',
  'Potasio',
  'Sodio',
  'Cloruro',
  'Creatinina',
  'BUN Pre-Hemodiálisis',
  'Hormona Paratiroidea (PTH)',
  'Bun Post-Hemodiálisis',
].map((param) => ({ label: param, param }));

export const PERIODICIDADES = [{ value: '1', label: 'Mensual' }, { value: '2', label: 'Trimestral' }, { value: '3', label: 'Semestral' }];

export const esParametroBase = (param) => PARAMETROS_BASE.some((b) => b.param === param);

// Nombre sin tildes, mayúsculas ni signos: sirve para reconocer el mismo parámetro escrito distinto
export const normalizar = (s = '') => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();

const CANON_BASE = Object.fromEntries(PARAMETROS_BASE.map((p) => [normalizar(p.param), p.param]));

// Nombres alternativos frecuentes -> nombre canónico
const ALIAS = Object.fromEntries([
  ['Creatinina', 'Creatinina'],
  ['Creatinina mg/dl', 'Creatinina'],
  ['creatinina (mg/dl)', 'Creatinina'],
  ['BUN Pre-Hemodialisis', 'BUN Pre-Hemodiálisis'],
  ['bun pre hemodialisis', 'BUN Pre-Hemodiálisis'],
  ['Bun Post-Hemodialisis', 'Bun Post-Hemodiálisis'],
  ['bun post hemodialisis', 'Bun Post-Hemodiálisis'],
  ['Hormona Paratiroidea', 'Hormona Paratiroidea (PTH)'],
  ['PTH', 'Hormona Paratiroidea (PTH)'],
  ['Albumina gr/dl', 'Albúmina gr/dl'],
  ['Calcio', 'Calcio mg/dl'],
  ['Fosforo mg/dl', 'Fósforo mg/dl'],
].map(([alias, canon]) => [normalizar(alias), canon]));

// Convierte los parámetros del último laboratorio del paciente en valores del formulario.
// Devuelve { nuevos, valores, originales, bloqueados, fechas } (nuevos: parámetros que la lista actual no tiene).
export function combinarUltimos(parametrosActuales, ultimos) {
  const conocidos = new Map(parametrosActuales.map((p) => [normalizar(p.param), p.param]));
  Object.entries(ALIAS).forEach(([k, v]) => conocidos.set(k, v));
  Object.entries(CANON_BASE).forEach(([k, v]) => { if (!conocidos.has(k)) conocidos.set(k, v); });

  const combinado = new Map(conocidos);
  const nuevos = [];
  for (const item of ultimos) {
    const nombre = item?.parametro;
    if (!nombre) continue;
    const key = normalizar(nombre);
    if (!combinado.has(key)) {
      const usado = conocidos.get(key) || CANON_BASE[key] || nombre;
      combinado.set(key, usado);
      if (!conocidos.has(key)) nuevos.push({ label: usado, param: usado });
    }
  }

  const resultado = { nuevos, valores: {}, originales: {}, bloqueados: {}, fechas: {} };
  for (const item of ultimos) {
    const nombre = item?.parametro;
    if (!nombre) continue;
    const key = normalizar(nombre);
    const canon = combinado.get(key) || conocidos.get(key) || CANON_BASE[key] || nombre;
    const valor = item?.valor || '';
    resultado.valores[canon] = valor;
    resultado.originales[canon] = valor;
    resultado.bloqueados[canon] = true; // lo que viene del historial queda bloqueado hasta pulsar "Actualizar"
    if (item?.fecha_laboratorio) resultado.fechas[canon] = formatearFecha(item.fecha_laboratorio);
  }
  return resultado;
}

const aBoolean = (v, verdaderos, falsos) => {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (verdaderos.includes(s)) return true;
  if (falsos.includes(s)) return false;
  return null;
};
export const siNoABoolean = (v) => aBoolean(v, ['sí', 'si', 'true', '1'], ['no', 'false', '0']);
export const positivoNegativoABoolean = (v) => aBoolean(v, ['positivo', 'reactivo', 'true', '1'], ['negativo', 'no reactivo', 'false', '0']);

// Puntaje mientras se escribe: hasta 6 enteros y 2 decimales
export const valorParametroValido = (raw) => raw === '' || /^\d{1,6}(\.\d{0,2})?$/.test(raw);

// Mensaje del primer problema del formulario (o null). `hoy` se puede fijar en pruebas.
export function problemaDelFormulario(v, noAfiliacion, hoy = new Date()) {
  if (!noAfiliacion) return 'Ingrese un número de afiliación.';
  if (!v.fecha_laboratorio) return 'La fecha de laboratorio es requerida.';
  const texto = String(v.fecha_laboratorio).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return 'La fecha de laboratorio no es válida.';
  const [y, m, d] = texto.split('-').map((n) => parseInt(n, 10));
  const fecha = new Date(y, m - 1, d);
  if (fecha.getMonth() + 1 !== m || fecha.getDate() !== d || fecha.getFullYear() !== y) return 'La fecha de laboratorio no es válida.';
  if (fecha < new Date(1900, 0, 1)) return 'La fecha de laboratorio no puede ser anterior a 01/01/1900.';
  if (fecha > new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) return 'La fecha de laboratorio no puede ser en el futuro.';
  if (!v.idPerLaboratorio) return 'La periodicidad es requerida.';
  if (!v.examen_realizado) return 'Debe indicar si el examen fue realizado.';
  if (v.examen_realizado === 'No' && !v.causa_no_realizado) return 'Indique la causa de no realizado.';
  return null;
}

// Solo se envían los parámetros nuevos o cuyo valor cambió respecto al último laboratorio
export function parametrosAEnviar(parametros, valores, originales) {
  return parametros.flatMap(({ param }) => {
    const actual = (valores[param] ?? '').toString().trim();
    const original = (originales[param] ?? '').toString().trim();
    const cambio = param in originales ? actual !== original : actual !== '';
    return cambio && actual !== '' ? [{ parametro: param, valor: actual }] : [];
  });
}

const texto = (v) => (v ? String(v).trim() : null);

export const armarLaboratorio = (noAfiliacion, v, parametros) => ({
  no_afiliacion: String(noAfiliacion).trim(),
  idperlaboratorio: v.idPerLaboratorio ? Number(v.idPerLaboratorio) : null,
  fecha_laboratorio: (v.fecha_laboratorio || '').trim(),
  infeccion_acceso: texto(v.infeccion_acceso),
  complicacion_acceso: texto(v.complicacion_acceso),
  observacion: texto(v.observacion),
  examen_realizado: siNoABoolean(v.examen_realizado),
  causa_no_realizado: texto(v.causa_no_realizado),
  virologia: texto(v.virologia),
  antigeno_hepatitis_c: positivoNegativoABoolean(v.antigeno_hepatitis_c),
  antigeno_superficie: positivoNegativoABoolean(v.antigeno_superficie),
  hiv: positivoNegativoABoolean(v.hiv),
  parametros,
});

// Busca al paciente para registrar laboratorios: { nombre } o { mensaje, modal } (modal: se muestra como aviso, no bajo el campo)
export async function buscarPaciente(noAfiliacion) {
  const noEncontrado = { mensaje: 'No se encontró el paciente con ese número de afiliación.' };
  try {
    const { data: p } = await api.get(`/pacientes/${noAfiliacion}`);
    if (!p || !(p.primer_nombre || p.primer_apellido)) return noEncontrado;
    if (estaInactivo(p)) {
      return { modal: true, titulo: 'Paciente no disponible', mensaje: 'No se puede registrar laboratorios para pacientes egresados o fallecidos.' };
    }
    return { nombre: nombreCompletoPaciente(p) || p.no_afiliacion };
  } catch {
    return noEncontrado;
  }
}

export async function cargarUltimosParametros(noAfiliacion) {
  const { data } = await api.get(`/laboratorios/${noAfiliacion}/parametros/ultimo`);
  return Array.isArray(data?.data) ? data.data : [];
}

export const guardarLaboratorio = (payload) => api.post('/laboratorios', payload);
