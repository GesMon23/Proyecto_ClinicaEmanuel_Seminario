// Reglas del registro masivo de formularios (sin React).
import api from '@/config/api';

export const MAX_PACIENTES = 8;

export const FORM_VACIO = { numeroformulario: '', sesionesautorizadasmes: '', periodoDel: '', periodoHasta: '' };

// Los egresados y fallecidos no reciben formulario (los reingresos, estado 4, sí)
export function estaInactivo(p) {
  const id = Number(p.idestado ?? p.id_estado ?? p.estado_id);
  const estado = (p.estado_descripcion || p.estado || p.estadoPaciente || '').toString().toLowerCase();
  return id === 3 || id === 5 || estado.includes('egres') || estado.includes('falle') || estado.includes('defunc');
}

export const nombreDe = (p) =>
  `${p.primernombre || ''} ${p.segundonombre || ''} ${p.otrosnombres || ''} ${p.primerapellido || ''} ${p.segundoapellido || ''} ${p.apellidocasada || ''}`
    .replace(/ +/g, ' ').trim();

// Descripción de la jornada del paciente (las columnas llegan con o sin guion bajo)
export function jornadaDe(p, jornadas) {
  const id = p.idjornada ?? p.id_jornada ?? p.idJornada;
  if (!id || !Array.isArray(jornadas)) return '';
  const j = jornadas.find((x) => (x.idjornada ?? x.id_jornada) === id);
  return j?.descripcion || '';
}

// Busca un paciente para agregarlo a la tabla. Devuelve { fila } o { titulo, mensaje } si no se puede agregar.
export async function prepararFila(noAfiliacion, cargados, jornadas) {
  if (cargados.length >= MAX_PACIENTES) {
    return { titulo: 'Límite alcanzado', mensaje: `Solo puede agregar un máximo de ${MAX_PACIENTES} pacientes por formulario.` };
  }
  const { data: p } = await api.get(`/consulta_pacientes_formularios/${noAfiliacion}`);
  if (!p) return { titulo: 'No encontrado', mensaje: 'No se encontró ningún paciente con ese número de afiliación.' };
  if (estaInactivo(p)) return { titulo: 'Paciente no disponible', mensaje: 'El paciente está Egresado o Fallecido y no puede agregarse.', limpiar: true };
  if (cargados.some((c) => c.noafiliacion === p.noafiliacion)) {
    return { titulo: 'Ya agregado', mensaje: 'El paciente ya fue agregado a la tabla.', limpiar: true };
  }
  return { fila: { noafiliacion: p.noafiliacion, dpi: p.dpi, nombre: nombreDe(p), sexo: p.sexo, jornada: jornadaDe(p, jornadas) } };
}

// Mensaje del primer problema del formulario, o null
export function problemaDelFormulario(form, cargados) {
  if (!cargados.length) return 'Debe agregar al menos un paciente a la tabla';
  if (!form.numeroformulario || !form.sesionesautorizadasmes || !form.periodoDel || !form.periodoHasta) return 'Todos los campos son obligatorios';
  return null;
}

export const armarMasivo = (form, cargados) => cargados.map((p) => ({
  noafiliacion: p.noafiliacion,
  numeroformulario: form.numeroformulario,
  fechainicioperiodo: form.periodoDel,
  fechafinperiodo: form.periodoHasta,
  sesionesautorizadasmes: form.sesionesautorizadasmes,
}));

export const guardarMasivo = (pacientes) =>
  api.put('/api/pacientes/masivo', { pacientes, usuario: localStorage.getItem('usuario') || 'sistema' }).then((r) => r.data);

export const cargarJornadas = () => api.get('/jornadas').then((r) => r.data).catch(() => []);
