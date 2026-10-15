// Reglas comunes sobre pacientes en las pantallas de registro.
import api from '@/config/api';
import { calcularEdad } from '@/components/consultaPacientes/calculos';

// Un paciente egresado o fallecido no admite registros nuevos (evaluaciones, laboratorios, ...)
export function estaInactivo(p) {
  const idEstado = Number(p.id_estado ?? p.idestado ?? 0);
  const idCausa = Number(p.id_causa ?? p.idcausa ?? 0);
  const causa = String(p.causaegreso_descripcion ?? p.causa_egreso_descripcion ?? p.descripcion ?? '').toLowerCase();
  const estado = String(p.estado_descripcion ?? p.estado ?? '').toLowerCase();
  return idEstado === 3 || estado.includes('egres') || idCausa === 1 || causa.includes('fallec') || estado.includes('fallec');
}

// Busca un paciente para registrarle algo (`que`: 'nutrición', 'psicología', ...).
// Devuelve { paciente: { nombre, edad, sexo } } o { titulo, mensaje } con el aviso a mostrar.
export async function buscarPacienteParaRegistro(noAfiliacion, que) {
  try {
    const { data } = await api.get(`/pacientes/${noAfiliacion}`);
    if (!data || !data.primer_nombre) {
      return { titulo: 'Paciente no encontrado', mensaje: 'No se encontró el paciente con ese número de afiliación.' };
    }
    if (estaInactivo(data)) {
      return { titulo: 'Paciente no disponible', mensaje: `No se puede registrar ${que} para pacientes egresados o fallecidos.` };
    }
    return {
      paciente: {
        nombre: nombreCompletoPaciente(data),
        edad: Math.max(0, Number(calcularEdad(data.fecha_nacimiento)) || 0),
        sexo: data.sexo,
      },
    };
  } catch {
    return { titulo: 'Error de búsqueda', mensaje: 'No se encontró el paciente con ese número de afiliación.' };
  }
}

// Nombre completo a partir de las columnas con guion bajo de tbl_pacientes
export const nombreCompletoPaciente = (p) =>
  [p.primer_nombre, p.segundo_nombre, p.otros_nombres, p.primer_apellido, p.segundo_apellido, p.apellido_casada].filter(Boolean).join(' ');
