// Reglas comunes sobre pacientes en las pantallas de registro.

// Un paciente egresado o fallecido no admite registros nuevos (evaluaciones, laboratorios, ...)
export function estaInactivo(p) {
  const idEstado = Number(p.id_estado ?? p.idestado ?? 0);
  const idCausa = Number(p.id_causa ?? p.idcausa ?? 0);
  const causa = String(p.causaegreso_descripcion ?? p.causa_egreso_descripcion ?? p.descripcion ?? '').toLowerCase();
  const estado = String(p.estado_descripcion ?? p.estado ?? '').toLowerCase();
  return idEstado === 3 || estado.includes('egres') || idCausa === 1 || causa.includes('fallec') || estado.includes('fallec');
}

// Nombre completo a partir de las columnas con guion bajo de tbl_pacientes
export const nombreCompletoPaciente = (p) =>
  [p.primer_nombre, p.segundo_nombre, p.otros_nombres, p.primer_apellido, p.segundo_apellido, p.apellido_casada].filter(Boolean).join(' ');
