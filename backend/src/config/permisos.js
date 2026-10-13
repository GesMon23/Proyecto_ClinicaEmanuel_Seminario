// Qué permiso (pestaña) exige cada ruta de la API. Los códigos son los de tbl_permisos (migración 005).
// Una ruta con sesión que no aparece aquí responde 403: las rutas nuevas quedan cerradas hasta asignarles permiso
// (test/permisos.test.js comprueba que toda ruta montada tenga regla).
// Las reglas se revisan en orden y gana la primera: las rutas fijas van antes que las de parámetro
// (/pacientes/egreso antes que /pacientes/:noafiliacion). Las rutas públicas están en config/acceso.js.

// Cualquier usuario con sesión activa (perfil, contraseña y catálogos sin datos de pacientes)
const SESION = 'sesion';

const REPORTES = ['reportes.pacientes', 'reportes.nuevo_ingreso', 'reportes.egreso', 'reportes.fallecidos'];
const ESTADISTICAS = ['estadisticas.pacientes', 'estadisticas.nutricion', 'estadisticas.psicologia'];
const USUARIOS = ['usuarios.registro_empleados', 'usuarios.creacion', 'usuarios.empleados', 'usuarios.roles'];
// Pantallas que muestran la foto del paciente
const FOTOS = ['consulta.pacientes', 'pacientes.reingreso', 'pacientes.egreso', 'pacientes.actualizacion', 'turnos.llamado'];
// Pantallas que buscan al paciente por número de afiliación antes de registrar algo
const BUSCAR_PACIENTE = ['consulta.pacientes', 'nutricion.registro', 'psicologia.registro', 'laboratorios.registro', 'referencias.registro'];

const REGLAS = [
  // ---- Sesión y perfil
  ['GET', '/auth/me', SESION],
  ['POST', '/auth/confirm-password', SESION],
  ['POST', '/auth/change-password', SESION],
  ['POST', '/auth/admin/reset-user-password', ['usuarios.roles']],
  ['GET', '/usuarios-activos', USUARIOS],

  // ---- Catálogos (sin datos de pacientes)
  ['GET', '/departamentos', SESION],
  ['GET', '/accesos-vasculares', SESION],
  ['GET', '/jornadas', SESION],
  ['GET', '/estados-paciente', SESION],
  ['GET', '/causas_egreso', SESION],
  ['GET', '/medicos', SESION],
  ['GET', '/GestadosTurnoT', SESION],
  ['GET', '/Adepartamento', SESION],
  ['GET', '/Aaccesos-vascular', SESION],
  ['GET', '/Ajornada', SESION],
  ['GET', '/laboratorios/catalogos', SESION],

  // ---- Fotos y documentos del paciente
  ['GET', '/check-photo/:id', FOTOS],
  ['GET', '/foto/:id', FOTOS],
  ['GET', '/fotos/:archivo', FOTOS],
  ['GET', '/Acheck-photo/:archivo', ['pacientes.actualizacion']],
  ['GET', '/Afoto/:id', ['pacientes.actualizacion']],
  ['GET', '/carnet/forzar/:noafiliacion', ['consulta.pacientes', 'pacientes.registro']],
  ['GET', '/qr', ['consulta.pacientes']],

  // ---- Reportes (antes que /pacientes/:noafiliacion: /pacientes/excel es un reporte)
  ['GET', '/pacientes', ['reportes.pacientes']],
  ['GET', '/pacientes/catalogos', ['reportes.pacientes']],
  ['GET', '/pacientes/excel', ['reportes.pacientes']],
  ['GET', '/nuevoingreso', ['reportes.nuevo_ingreso']],
  ['GET', '/nuevoingreso/catalogos', ['reportes.nuevo_ingreso']],
  ['GET', '/nuevoingreso/excel', ['reportes.nuevo_ingreso']],
  ['GET', '/egreso', ['reportes.egreso']],
  ['GET', '/egreso/catalogos', ['reportes.egreso']],
  ['GET', '/egreso/excel', ['reportes.egreso']],
  ['GET', '/fallecidos', ['reportes.fallecidos']],
  ['GET', '/fallecidos/catalogos', ['reportes.fallecidos']],
  ['GET', '/fallecidos/excel', ['reportes.fallecidos']],
  // Reporte de faltistas: existe en el backend pero no tiene pestaña; lo puede usar cualquiera de Reportes
  ['GET', '/faltistas', REPORTES],
  ['GET', '/faltistas/catalogos', REPORTES],
  ['GET', '/faltistas/excel', REPORTES],

  // ---- Gestión de Pacientes
  ['POST', '/pacientes', ['pacientes.registro']],
  ['GET', '/pacientes/existe/dpi/:dpi', ['pacientes.registro']],
  ['GET', '/pacientes/existe/noafiliacion/:noafiliacion', ['pacientes.registro']],
  ['GET', '/pacientes/egreso', ['pacientes.egreso', 'pacientes.reingreso']],
  ['PUT', '/pacientes/masivo', ['pacientes.formularios']],
  ['GET', '/pacientes/reingreso', ['pacientes.reingreso']],
  ['POST', '/pacientes/reingreso', ['pacientes.reingreso']],
  ['POST', '/historial/reingresos', ['pacientes.reingreso']],
  ['POST', '/egresos', ['pacientes.egreso']],
  ['POST', '/historial/egresos', ['pacientes.egreso']],
  ['PUT', '/pacientes/:noafiliacion', ['pacientes.egreso']],
  ['GET', '/consulta_pacientes_formularios/:noafiliacion', ['pacientes.formularios']],
  ['POST', '/historial/formularios', ['pacientes.formularios']],
  ['GET', '/Apacientes/actualizacion', ['pacientes.actualizacion']],
  ['PUT', '/Apacientes/:noafiliacion', ['pacientes.actualizacion']],
  ['POST', '/Aupload-foto/:noafiliacion', ['pacientes.actualizacion']],

  // ---- Consulta de Pacientes (ficha y sus pestañas)
  ['GET', '/pacientes/dpi/:dpi', ['consulta.pacientes']],
  ['GET', '/pacientes/:noafiliacion', BUSCAR_PACIENTE],
  ['GET', '/historial/:noafiliacion', ['consulta.pacientes']],
  ['GET', '/referencias/consulta', ['referencias.consulta']],
  ['GET', '/referencias/:noafiliacion', ['consulta.pacientes']],
  ['GET', '/formularios/:noafiliacion', ['consulta.pacientes']],
  ['GET', '/turnos/:noafiliacion', ['consulta.pacientes']],
  ['GET', '/faltistas/dpi/:dpi', ['consulta.pacientes']],
  ['GET', '/faltistas/:noafiliacion', ['consulta.pacientes']],

  // ---- Nutrición y Psicología
  ['POST', '/nutricion/evaluacion', ['nutricion.registro']],
  ['GET', '/nutricion/historial', ['nutricion.consulta']],
  ['GET', '/nutricion/historial/:noafiliacion', ['nutricion.consulta', 'consulta.pacientes']],
  ['GET', '/nutricion/:noafiliacion', ['consulta.pacientes']],
  ['POST', '/psicologia/evaluacion', ['psicologia.registro']],
  ['GET', '/psicologia/historial', ['psicologia.consulta']],
  ['GET', '/psicologia/historial/:noafiliacion', ['psicologia.consulta', 'consulta.pacientes']],
  ['GET', '/psicologia/:noafiliacion', ['consulta.pacientes']],

  // ---- Laboratorios
  ['POST', '/laboratorios', ['laboratorios.registro']],
  ['GET', '/laboratorios/historial', ['laboratorios.consulta']],
  ['GET', '/laboratorios/historial/:noafiliacion', ['laboratorios.consulta', 'consulta.pacientes']],
  ['GET', '/laboratorios/dpi/:dpi', ['laboratorios.consulta', 'consulta.pacientes']],
  ['GET', '/laboratorios/:noafiliacion/parametros/ultimo', ['laboratorios.registro', 'laboratorios.consulta', 'consulta.pacientes']],
  ['GET', '/laboratorios/:noafiliacion', ['laboratorios.consulta', 'consulta.pacientes']],

  // ---- Referencias
  ['POST', '/referencias', ['referencias.registro']],

  // ---- Turnos
  ['GET', '/Gturno-actual-usuario', ['turnos.llamado']],
  ['GET', '/Gsiguiente-turnoT/:clinica', ['turnos.llamado']],
  ['GET', '/Gsiguientes-turnosT/:clinica', ['turnos.llamado']],
  ['PUT', '/Gactualizar-estado-llamadoT/:id', ['turnos.llamado']],
  ['PUT', '/Gabandonar-turnoT/:id', ['turnos.llamado']],
  ['PUT', '/Gfinalizar-turnoT/:id', ['turnos.llamado']],
  ['POST', '/turnos/llamado', ['turnos.llamado']],
  ['GET', '/GturnosCreadosT', ['turnos.asignacion']],
  ['GET', '/GmuestraTurnosFaltantesT', ['turnos.asignacion']],
  ['PUT', '/Gasignar-turnoT/:id', ['turnos.asignacion']],
  ['PUT', '/Gfaltante-turnoT/:id', ['turnos.asignacion']],
  ['POST', '/Gregistrar-faltistaT', ['turnos.asignacion']],
  ['GET', '/GpacientesT/:noafiliacion', ['turnos.crear']],
  ['GET', '/GmuestraTurnosT', ['turnos.crear']],
  ['POST', '/Gcrear-turnoT', ['turnos.crear']],
  ['PUT', '/Gactualizar-turnoT/:id', ['turnos.crear']],
  ['PUT', '/Gcancelar-turnoT/:id', ['turnos.crear']],
  ['GET', '/GturnosT', ['turnos.consulta']],

  // ---- Estadísticas (los paneles nuevos y las rutas anteriores por tema)
  ['GET', '/estadisticas/panel/pacientes', ['estadisticas.pacientes']],
  ['GET', '/estadisticas/panel/nutricion', ['estadisticas.nutricion']],
  ['GET', '/estadisticas/panel/psicologia', ['estadisticas.psicologia']],
  ['GET', '/estadisticas/pacientes-:indicador', ['estadisticas.pacientes']],
  ['GET', '/estadisticas/nutricion-:indicador', ['estadisticas.nutricion']],
  ['GET', '/estadisticas/psicologia-:indicador', ['estadisticas.psicologia']],
  ['GET', '/estadisticas/resumen', ESTADISTICAS],

  // ---- Gestión de Usuarios
  ['POST', '/empleados', ['usuarios.registro_empleados']],
  ['PUT', '/registro-empleados', ['usuarios.registro_empleados']],
  ['GET', '/empleados/sin-usuario', ['usuarios.creacion']],
  ['GET', '/usuarios/existe', ['usuarios.creacion']],
  ['POST', '/usuarios', ['usuarios.creacion']],
  ['GET', '/roles/activos', ['usuarios.creacion', 'usuarios.roles']],
  ['GET', '/empleados', ['usuarios.empleados']],
  ['PUT', '/empleados/:dpi', ['usuarios.empleados']],
  ['PATCH', '/empleados/:dpi/estado', ['usuarios.empleados']],
  ['GET', '/usuarios/by-usuario', ['usuarios.roles']],
  ['GET', '/usuarios/:id/roles', ['usuarios.roles']],
  ['PUT', '/usuarios/:id/roles', ['usuarios.roles']],
  ['PATCH', '/usuarios/:id/estado', ['usuarios.roles']],
];

// '/pacientes/:noafiliacion' -> /^\/pacientes\/[^/]+\/?$/ ; un parámetro puede ir tras un prefijo fijo ('pacientes-:x')
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patronDe = (ruta) => new RegExp(`^${ruta.split(/(:\w+)/).map((t) => (t.startsWith(':') ? '[^/]+' : escapar(t))).join('')}/?$`);

const COMPILADAS = REGLAS.map(([metodo, ruta, permisos]) => ({ metodo, ruta, patron: patronDe(ruta), permisos }));

// Permisos que exige una ruta (ya sin el prefijo /api): SESION, una lista (basta uno) o null si no tiene regla
function permisosDeRuta(metodo, ruta) {
  const m = metodo === 'HEAD' ? 'GET' : metodo;
  const regla = COMPILADAS.find((r) => r.metodo === m && r.patron.test(ruta));
  return regla ? regla.permisos : null;
}

// Todos los códigos que usan las reglas (las pruebas los comparan con tbl_permisos)
const codigosUsados = () => [...new Set(REGLAS.flatMap(([, , p]) => (Array.isArray(p) ? p : [])))].sort();

module.exports = { SESION, REGLAS, permisosDeRuta, codigosUsados };
