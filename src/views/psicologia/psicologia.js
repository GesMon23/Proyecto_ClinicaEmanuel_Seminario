// Reglas del registro de evaluaciones psicológicas (sin React).
import api from '@/config/api';
import { calcularEdad } from '@/components/consultaPacientes/calculos';

export const EVALUACION_VACIA = {
  motivo_consulta: '',
  tipo_consulta: 'Consulta',
  tipo_atencion: 'Resiliente',
  pronostico_paciente: 'Intermedio',
  aplicacion_kdqol: '',
  fisico_mental: '',
  enfermedad_renal: '',
  sintomas_problemas: '',
  efectos_enfermedad: '',
  vida_diaria: '',
  observaciones: '',
};

// Las 5 áreas del KDQOL, en el orden en que se van habilitando (cada una exige la anterior)
export const AREAS_KDQOL = [
  { campo: 'fisico_mental', etiqueta: 'Físico y mental' },
  { campo: 'enfermedad_renal', etiqueta: 'Enfermedad renal' },
  { campo: 'sintomas_problemas', etiqueta: 'Síntomas y problemas' },
  { campo: 'efectos_enfermedad', etiqueta: 'Efectos de la enfermedad' },
  { campo: 'vida_diaria', etiqueta: 'Vida Diaria' },
];

// Puntaje válido mientras se escribe: vacío, o hasta 3 enteros y 2 decimales (máximo 999.99)
export function puntajeValido(valor) {
  if (valor === '') return true;
  return /^\d{1,3}(\.\d{0,2})?$/.test(valor) && parseFloat(valor) <= 999.99;
}

// Promedio de las 5 áreas ('' mientras falte alguna)
export function promedioKdqol(ev) {
  const valores = AREAS_KDQOL.map(({ campo }) => (ev[campo] === '' || ev[campo] == null ? NaN : parseFloat(ev[campo])));
  if (valores.some(Number.isNaN)) return '';
  return (Math.round((valores.reduce((a, n) => a + n, 0) / valores.length) * 100) / 100).toFixed(2);
}

// No se registra psicología a pacientes egresados o fallecidos
export function estaInactivo(p) {
  const idEstado = Number(p.id_estado ?? p.idestado ?? 0);
  const idCausa = Number(p.id_causa ?? p.idcausa ?? 0);
  const causa = String(p.causaegreso_descripcion ?? p.causa_egreso_descripcion ?? p.descripcion ?? '').toLowerCase();
  const estado = String(p.estado_descripcion ?? p.estado ?? '').toLowerCase();
  return idEstado === 3 || estado.includes('egres') || idCausa === 1 || causa.includes('fallec') || estado.includes('fallec');
}

// Resumen del paciente para la pantalla, o { mensaje } (título y texto del aviso) si no se puede registrar
export async function buscarPaciente(noAfiliacion) {
  try {
    const { data } = await api.get(`/pacientes/${noAfiliacion}`);
    if (!data || !data.primer_nombre) {
      return { titulo: 'Paciente no encontrado', mensaje: 'No se encontró el paciente con ese número de afiliación.' };
    }
    if (estaInactivo(data)) {
      return { titulo: 'Paciente no disponible', mensaje: 'No se puede registrar psicología para pacientes egresados o fallecidos.' };
    }
    return {
      paciente: {
        nombre: [data.primer_nombre, data.segundo_nombre, data.otros_nombres, data.primer_apellido, data.segundo_apellido, data.apellido_casada].filter(Boolean).join(' '),
        edad: Math.max(0, Number(calcularEdad(data.fecha_nacimiento)) || 0),
        sexo: data.sexo,
      },
    };
  } catch {
    return { titulo: 'Error de búsqueda', mensaje: 'No se encontró el paciente con ese número de afiliación.' };
  }
}

// Guarda la evaluación; devuelve el id del informe (o null)
export async function guardarEvaluacion(noAfiliacion, evaluacion) {
  const { data } = await api.post('/psicologia/evaluacion', { no_afiliacion: noAfiliacion, ...evaluacion });
  return data && data.message ? { guardada: true, idInforme: data?.informe?.id_informe ?? null } : { guardada: false };
}
