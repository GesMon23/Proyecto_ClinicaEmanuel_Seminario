// Definición de cada reporte de pacientes: qué filtros tiene, de dónde salen los datos y cómo se muestran.
// ReporteTabular arma la pantalla a partir de esto.
import { formatearFecha } from '@/utils/fechas';
import { calcularEdadHasta, diferenciaDMA, fechaCortePaciente } from '@/utils/reportes';

const nombre = (p) => p.nombre_completo
  || [p.primernombre ?? p.primer_nombre, p.segundonombre ?? p.segundo_nombre, p.otrosnombres ?? p.otros_nombres,
    p.primerapellido ?? p.primer_apellido, p.segundoapellido ?? p.segundo_apellido, p.apellidocasada ?? p.apellido_casada]
    .filter(Boolean).join(' ');

export function formatearPeriodo(inicio, fin) {
  const f1 = formatearFecha(inicio);
  const f2 = formatearFecha(fin);
  if (f1 && f2) return `Del ${f1} al ${f2}`;
  if (f1) return `Desde ${f1}`;
  if (f2) return `Hasta ${f2}`;
  return '';
}

const estado = (p) => p.estadopaciente || p.estado || '';
const texto = (campo) => (p) => p[campo] || '';
const fecha = (campo) => (p) => formatearFecha(p[campo]);

// Filtros: 'fechaInicio' | 'fechaFin' | 'formulario' | 'estado' | 'jornada' | 'accesovascular' | 'sexo' | 'departamento'
export const FILTROS = {
  fechaInicio: { param: 'fechainicio', tipo: 'fechaInicio' },
  fechaFin: { param: 'fechafin', tipo: 'fechaFin' },
  formulario: { param: 'numeroformulario', tipo: 'texto', etiqueta: 'Número Formulario', marcador: 'Ingrese número de formulario' },
  estado: { param: 'estado', tipo: 'select', etiqueta: 'Estado', catalogo: 'estados', todos: 'Todos' },
  jornada: { param: 'jornada', tipo: 'select', etiqueta: 'Jornada', catalogo: 'jornadas', todos: 'Todas' },
  accesovascular: { param: 'accesovascular', tipo: 'select', etiqueta: 'Acceso Vascular', catalogo: 'accesos', todos: 'Todos' },
  sexo: { param: 'sexo', tipo: 'select', etiqueta: 'Sexo', catalogo: 'sexos', todos: 'Todos' },
  departamento: { param: 'departamento', tipo: 'select', etiqueta: 'Departamento', catalogo: 'departamentos', todos: 'Todos' },
};

const FILTROS_BASE = ['fechaInicio', 'fechaFin', 'jornada', 'accesovascular', 'sexo', 'departamento'];

// ---- comunes a Pacientes y Nuevo Ingreso: la edad y la estancia se cuentan hasta el fallecimiento (o hoy)
const edadCorte = (p) => calcularEdadHasta(p.fechanacimiento, fechaCortePaciente(p));
const estanciaCorte = (p) => diferenciaDMA(p.fechaingreso, fechaCortePaciente(p));

const CAMPOS_PACIENTE = [
  { etiqueta: 'No. Afiliación', valor: texto('noafiliacion') },
  { etiqueta: 'DPI', valor: texto('dpi') },
  { etiqueta: 'Nombre Completo', valor: nombre, completo: true },
  { etiqueta: 'Edad', valor: edadCorte },
  { etiqueta: 'Fecha Nacimiento', valor: fecha('fechanacimiento') },
  { etiqueta: 'Sexo', valor: texto('sexo') },
  { etiqueta: 'Dirección', valor: texto('direccion') },
  { etiqueta: 'Departamento', valor: texto('departamento') },
  { etiqueta: 'Fecha Ingreso', valor: fecha('fechaingreso') },
  { etiqueta: 'Estancia en el Programa (D-M-A)', valor: estanciaCorte },
  { etiqueta: 'Estado', valor: estado },
  { etiqueta: 'Jornada', valor: texto('jornada') },
  { etiqueta: 'Acceso Vascular', valor: texto('accesovascular') },
  { etiqueta: 'No. Formulario', valor: texto('numeroformulario') },
  { etiqueta: 'Periodo', valor: (p) => formatearPeriodo(p.fechainicioperiodo, p.fechafinperiodo), completo: true },
  { etiqueta: 'Observaciones', valor: texto('observaciones'), completo: true },
];

const LISTADO_PACIENTE = [
  { titulo: 'No. Afiliación', valor: texto('noafiliacion') },
  { titulo: 'Nombre', valor: nombre },
  { titulo: 'Sexo', valor: texto('sexo') },
  { titulo: 'Departamento', valor: texto('departamento') },
  { titulo: 'Jornada', valor: texto('jornada') },
  { titulo: 'Acceso', valor: texto('accesovascular') },
  { titulo: 'No. Formulario', valor: texto('numeroformulario') },
];

const COLUMNAS_PACIENTE = [
  { titulo: 'No. Afiliación', valor: texto('noafiliacion'), ancho: 140 },
  { titulo: 'DPI', valor: texto('dpi'), ancho: 130 },
  { titulo: 'Número Proveedor', valor: texto('nopacienteproveedor'), ancho: 140 },
  { titulo: 'Nombre Completo', valor: nombre, ancho: 220 },
  { titulo: 'Edad', valor: edadCorte, ancho: 80 },
  { titulo: 'Fecha de Nacimiento', valor: fecha('fechanacimiento'), ancho: 140 },
  { titulo: 'Sexo', valor: texto('sexo'), ancho: 80 },
  { titulo: 'Dirección', valor: texto('direccion'), ancho: 200 },
  { titulo: 'Departamento', valor: texto('departamento'), ancho: 160 },
  { titulo: 'Fecha Ingreso', valor: fecha('fechaingreso'), ancho: 140 },
  { titulo: 'Estancia en el Programa (D-M-A)', valor: estanciaCorte, ancho: 160 },
  { titulo: 'Estado del Paciente', valor: estado, ancho: 140 },
  { titulo: 'Jornada', valor: texto('jornada'), ancho: 120 },
  { titulo: 'Acceso Vascular', valor: texto('accesovascular'), ancho: 160 },
  { titulo: 'Número de Formulario', valor: texto('numeroformulario'), ancho: 180 },
  { titulo: 'Periodo', valor: (p) => formatearPeriodo(p.fechainicioperiodo, p.fechafinperiodo), ancho: 200 },
  { titulo: 'Sesiones Autorizadas Mes', valor: texto('sesionesautorizadasmes'), ancho: 160 },
  { titulo: 'Observaciones', valor: texto('observaciones'), ancho: 220 },
];

// Pacientes (Reporte de Pacientes): sin la columna "Sesiones Autorizadas Mes"
const pacientes = {
  clave: 'pacientes',
  titulo: 'Reporte de Pacientes',
  rutaDatos: '/pacientes',
  rutaCatalogos: '/pacientes/catalogos',
  rutaExcel: '/api/pacientes/excel',
  filtros: ['fechaInicio', 'fechaFin', 'formulario', 'estado', 'jornada', 'accesovascular', 'sexo', 'departamento'],
  columnas: COLUMNAS_PACIENTE.filter((c) => c.titulo !== 'Número Proveedor' && c.titulo !== 'Sesiones Autorizadas Mes'),
  detalle: { titulo: 'Detalle de Paciente', campos: CAMPOS_PACIENTE },
  listado: { titulo: 'Reporte de Pacientes', asunto: 'Listado Pacientes', columnas: LISTADO_PACIENTE },
  vacio: 'No se encontraron pacientes',
  avisos: { error: 'Error al buscar pacientes' },
};

const nuevoIngreso = {
  clave: 'nuevoingreso',
  titulo: 'Pacientes Nuevo Ingreso',
  rutaDatos: '/api/nuevoingreso',
  rutaCatalogos: '/api/nuevoingreso/catalogos',
  rutaExcel: '/api/nuevoingreso/excel',
  filtros: FILTROS_BASE,
  columnas: COLUMNAS_PACIENTE,
  detalle: { titulo: 'Detalle de Paciente (Nuevo Ingreso)', campos: CAMPOS_PACIENTE },
  listado: {
    titulo: 'Pacientes Nuevo Ingreso',
    asunto: 'Listado Pacientes Nuevo Ingreso',
    columnas: [...LISTADO_PACIENTE, { titulo: 'Estancia (D-M-A)', valor: estanciaCorte }],
  },
  vacio: 'No se encontraron pacientes',
};

// ---- Egresados: edad y estancia hasta la fecha de egreso
const edadEgreso = (p) => calcularEdadHasta(p.fechanacimiento, p.fechaegreso || null);
const estanciaEgreso = (p) => diferenciaDMA(p.fechaingreso, p.fechaegreso || null);

const egreso = {
  clave: 'egreso',
  titulo: 'Pacientes Egresados',
  rutaDatos: '/egreso',
  rutaCatalogos: '/egreso/catalogos',
  rutaExcel: '/api/egreso/excel',
  filtros: FILTROS_BASE,
  columnas: [
    { titulo: 'No. Afiliación', valor: texto('noafiliacion'), ancho: 140 },
    { titulo: 'Nombre Completo', valor: nombre, ancho: 220 },
    { titulo: 'Edad', valor: edadEgreso, ancho: 80 },
    { titulo: 'Estancia (D-M-A)', valor: estanciaEgreso, ancho: 120 },
    { titulo: 'Sexo', valor: texto('sexo'), ancho: 80 },
    { titulo: 'Jornada', valor: texto('jornada'), ancho: 120 },
    { titulo: 'Acceso Vascular', valor: texto('accesovascular'), ancho: 160 },
    { titulo: 'Departamento', valor: texto('departamento'), ancho: 160 },
    { titulo: 'Causa (desc.)', valor: texto('causa_descripcion'), ancho: 160 },
    { titulo: 'Descripción', valor: texto('descripcion'), ancho: 200 },
    { titulo: 'Fecha de Egreso', valor: fecha('fechaegreso'), ancho: 140 },
    { titulo: 'Observaciones', valor: texto('observaciones'), ancho: 220 },
  ],
  detalle: {
    titulo: 'Detalle de Paciente Egresado',
    campos: [
      { etiqueta: 'No. Afiliación', valor: texto('noafiliacion') },
      { etiqueta: 'Sexo', valor: texto('sexo') },
      { etiqueta: 'Nombre Completo', valor: nombre, completo: true },
      { etiqueta: 'Edad', valor: edadEgreso },
      { etiqueta: 'Fecha Nacimiento', valor: fecha('fechanacimiento') },
      { etiqueta: 'Fecha Ingreso', valor: fecha('fechaingreso') },
      { etiqueta: 'Fecha Egreso', valor: fecha('fechaegreso') },
      { etiqueta: 'Estancia (D-M-A)', valor: estanciaEgreso },
      { etiqueta: 'Causa de Egreso', valor: texto('causa_descripcion'), completo: true },
      { etiqueta: 'Jornada', valor: texto('jornada') },
      { etiqueta: 'Acceso Vascular', valor: texto('accesovascular') },
      { etiqueta: 'Departamento', valor: texto('departamento') },
      { etiqueta: 'Descripción', valor: texto('descripcion'), completo: true },
      { etiqueta: 'Observaciones', valor: texto('observaciones'), completo: true },
    ],
  },
  listado: {
    titulo: 'Listado de Egresos',
    asunto: 'Listado Egresos',
    columnas: [
      { titulo: 'No. Afiliación', valor: texto('noafiliacion') },
      { titulo: 'Nombre Completo', valor: nombre },
      { titulo: 'Sexo', valor: texto('sexo') },
      { titulo: 'Jornada', valor: texto('jornada') },
      { titulo: 'Acceso', valor: texto('accesovascular') },
      { titulo: 'Departamento', valor: texto('departamento') },
      { titulo: 'Causa (desc.)', valor: texto('causa_descripcion') },
      { titulo: 'Descripción', valor: texto('descripcion') },
      { titulo: 'Fecha Egreso', valor: fecha('fechaegreso') },
      { titulo: 'Observaciones', valor: texto('observaciones') },
    ],
  },
  vacio: 'No se encontraron egresos',
};

// ---- Fallecidos: la edad es la que tenía al fallecer
const edadFallecido = (p) => calcularEdadHasta(p.fechanacimiento, p.fechafallecido || null);
const sinRegistro = (campo) => (p) => p[campo] || 'Sin registro';

const fallecidos = {
  clave: 'fallecidos',
  titulo: 'Pacientes Fallecidos',
  colorTitulo: 'text-red-700',
  rutaDatos: '/fallecidos',
  rutaCatalogos: '/fallecidos/catalogos',
  rutaExcel: '/fallecidos/excel',
  excelConBaseUrl: true,
  etiquetasFecha: ['Fecha Inicio', 'Fecha Fin'],
  filtros: FILTROS_BASE,
  columnas: [
    { titulo: 'No. Afiliación', valor: texto('noafiliacion'), ancho: 140 },
    { titulo: 'Nombre Completo', valor: nombre, ancho: 220 },
    { titulo: 'Edad', valor: edadFallecido, ancho: 80 },
    { titulo: 'Fecha de Nacimiento', valor: fecha('fechanacimiento'), ancho: 140 },
    { titulo: 'Sexo', valor: texto('sexo'), ancho: 80 },
    { titulo: 'Jornada', valor: texto('jornada'), ancho: 120 },
    { titulo: 'Acceso', valor: texto('accesovascular'), ancho: 160 },
    { titulo: 'Departamento', valor: texto('departamento'), ancho: 160 },
    { titulo: 'Fecha Ingreso', valor: fecha('fechaingreso'), ancho: 140 },
    { titulo: 'Comorbilidades', valor: sinRegistro('comorbilidades'), ancho: 200 },
    { titulo: 'Fecha Fallecimiento', valor: fecha('fechafallecido'), ancho: 160 },
    { titulo: 'Lugar de Fallecimiento', valor: sinRegistro('lugarfallecimiento'), ancho: 200 },
    { titulo: 'Causa de Fallecimiento', valor: sinRegistro('causafallecimiento'), ancho: 200 },
    { titulo: 'Observaciones', valor: texto('observaciones'), ancho: 220 },
  ],
  detalle: {
    titulo: 'Detalle de Paciente Fallecido',
    campos: [
      { etiqueta: 'No. Afiliación', valor: texto('noafiliacion') },
      { etiqueta: 'Sexo', valor: texto('sexo') },
      { etiqueta: 'Nombre Completo', valor: nombre, completo: true },
      { etiqueta: 'Edad', valor: edadFallecido },
      { etiqueta: 'Fecha Nacimiento', valor: fecha('fechanacimiento') },
      { etiqueta: 'Jornada', valor: texto('jornada') },
      { etiqueta: 'Acceso', valor: texto('accesovascular') },
      { etiqueta: 'Departamento', valor: texto('departamento') },
      { etiqueta: 'Fecha Ingreso', valor: fecha('fechaingreso') },
      { etiqueta: 'Fecha Fallecimiento', valor: fecha('fechafallecido') },
      { etiqueta: 'Comorbilidades', valor: texto('comorbilidades'), completo: true },
      { etiqueta: 'Lugar Fallecimiento', valor: texto('lugarfallecimiento') },
      { etiqueta: 'Causa Fallecimiento', valor: texto('causafallecimiento') },
      { etiqueta: 'Observaciones', valor: texto('observaciones'), completo: true },
    ],
  },
  listado: {
    titulo: 'Pacientes Fallecidos',
    asunto: 'Listado Pacientes Fallecidos',
    columnas: [
      { titulo: 'No. Afiliación', valor: texto('noafiliacion') },
      { titulo: 'Nombre', valor: nombre },
      { titulo: 'Sexo', valor: texto('sexo') },
      { titulo: 'Jornada', valor: texto('jornada') },
      { titulo: 'Acceso', valor: texto('accesovascular') },
      { titulo: 'Departamento', valor: texto('departamento') },
      { titulo: 'Fecha Ingreso', valor: fecha('fechaingreso') },
      { titulo: 'Fecha Fallecimiento', valor: fecha('fechafallecido') },
      { titulo: 'Comorbilidades', valor: texto('comorbilidades') },
      { titulo: 'Lugar Fallecimiento', valor: texto('lugarfallecimiento') },
      { titulo: 'Causa Fallecimiento', valor: texto('causafallecimiento') },
      { titulo: 'Observaciones', valor: texto('observaciones') },
    ],
  },
  vacio: 'No se encontraron pacientes',
  avisos: {
    sinResultados: 'No se encontraron pacientes fallecidos con los filtros seleccionados.',
    error: 'Error al buscar pacientes fallecidos.',
    excel: 'Exportación a Excel iniciada. Si no se descarga, revise el bloqueador de ventanas emergentes.',
  },
};

export const REPORTES = { pacientes, nuevoIngreso, egreso, fallecidos };
