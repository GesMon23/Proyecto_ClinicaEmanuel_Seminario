// Pestañas de cada módulo y el permiso que las abre (códigos de tbl_permisos, migración 005).
// Aquí solo se decide qué se muestra: el backend valida lo mismo en cada petición (backend/src/config/permisos.js).
export const PESTANAS = {
  consultaPacientes: [
    { clave: 'consulta', etiqueta: 'Consulta de Pacientes', permiso: 'consulta.pacientes' },
  ],
  gestionPacientes: [
    { clave: 'registro', etiqueta: 'Registro', permiso: 'pacientes.registro' },
    { clave: 'reingreso', etiqueta: 'Reingreso', permiso: 'pacientes.reingreso' },
    { clave: 'egreso', etiqueta: 'Egreso', permiso: 'pacientes.egreso' },
    { clave: 'registroformularios', etiqueta: 'Registro de Formularios', permiso: 'pacientes.formularios' },
    { clave: 'actualizacion', etiqueta: 'Actualizar Paciente', permiso: 'pacientes.actualizacion' },
  ],
  turnos: [
    { clave: 'llamado', etiqueta: 'Llamado', permiso: 'turnos.llamado' },
    { clave: 'asignar', etiqueta: 'Asignación', permiso: 'turnos.asignacion' },
    { clave: 'crear', etiqueta: 'Crear', permiso: 'turnos.crear' },
    { clave: 'consulta', etiqueta: 'Consulta Turnos', permiso: 'turnos.consulta' },
    { clave: 'clinicas', etiqueta: 'Clínicas por Usuario', permiso: 'turnos.clinicas' },
  ],
  nutricion: [
    { clave: 'registro', etiqueta: 'Registro', permiso: 'nutricion.registro' },
    { clave: 'consulta', etiqueta: 'Consulta', permiso: 'nutricion.consulta' },
  ],
  psicologia: [
    { clave: 'registro', etiqueta: 'Registro', permiso: 'psicologia.registro' },
    { clave: 'consulta', etiqueta: 'Consulta', permiso: 'psicologia.consulta' },
  ],
  laboratorios: [
    { clave: 'registro', etiqueta: 'Registro de Laboratorio', permiso: 'laboratorios.registro' },
    { clave: 'consulta', etiqueta: 'Consulta de Laboratorio', permiso: 'laboratorios.consulta' },
  ],
  referencias: [
    { clave: 'registro', etiqueta: 'Registro de Referencias', permiso: 'referencias.registro' },
    { clave: 'consulta', etiqueta: 'Consulta de Referencias', permiso: 'referencias.consulta' },
  ],
  reportes: [
    { clave: 'pacientesreporte', etiqueta: 'Reporte de Pacientes', permiso: 'reportes.pacientes' },
    { clave: 'nuevoingreso', etiqueta: 'Nuevo Ingreso Reportes', permiso: 'reportes.nuevo_ingreso' },
    { clave: 'egresoreporte', etiqueta: 'Egreso Reporte', permiso: 'reportes.egreso' },
    { clave: 'fallecidosreporte', etiqueta: 'Fallecidos Reporte', permiso: 'reportes.fallecidos' },
  ],
  estadisticas: [
    { clave: 'pacientes', etiqueta: 'Pacientes', permiso: 'estadisticas.pacientes' },
    { clave: 'nutricion', etiqueta: 'Nutrición', permiso: 'estadisticas.nutricion' },
    { clave: 'psicologia', etiqueta: 'Psicología', permiso: 'estadisticas.psicologia' },
  ],
  usuarios: [
    { clave: 'registro', etiqueta: 'Registrar Empleados', permiso: 'usuarios.registro_empleados' },
    { clave: 'creacion', etiqueta: 'Creación Usuarios', permiso: 'usuarios.creacion' },
    { clave: 'empleados', etiqueta: 'Gestión de Empleados', permiso: 'usuarios.empleados' },
    { clave: 'roles', etiqueta: 'Roles', permiso: 'usuarios.roles' },
    { clave: 'permisos', etiqueta: 'Permisos de Roles', permiso: 'usuarios.permisos' },
  ],
};

// Permisos que abren un módulo: basta tener una de sus pestañas
export const permisosDeModulo = (modulo) => PESTANAS[modulo].map((p) => p.permiso);

// ¿El usuario tiene alguno de los permisos? Una lista vacía no exige nada.
export function tieneAlguno(user, permisos = []) {
  if (permisos.length === 0) return true;
  const propios = Array.isArray(user?.permisos) ? user.permisos : [];
  return permisos.some((p) => propios.includes(p));
}
