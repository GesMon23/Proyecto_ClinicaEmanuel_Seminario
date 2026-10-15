// Definición de cada pantalla de consulta de historiales (nutrición, psicología, laboratorios, referencias).
// ConsultaHistorial arma la pantalla a partir de esto.
import { createElement } from 'react';
import api from '@/config/api';
import { formatearFecha } from '@/utils/fechas';
import { estadoNutricional } from '@/utils/imc';
import { EtiquetaIMC } from '../IndicadorIMC';
import { nombreCompleto, textoPositivoNegativo } from '../consultaPacientes/calculos';
import {
  DetalleLaboratorioAuto, DetalleNutricion, DetallePsicologia, DetalleReferencia,
} from '../consultaPacientes/detalles';

const texto = (campo) => (r) => r[campo] ?? '';
const fecha = (campo) => (r) => formatearFecha(r[campo]);
const sexo = (r) => r.sexo ?? r.Sexo ?? '';
const nombrePaciente = (r) => nombreCompleto(r);

// Filtros comunes
const DESDE = { nombre: 'desde', param: 'desde', tipo: 'desde', etiqueta: 'Desde', ancho: 'lg:col-span-1' };
const HASTA = { nombre: 'hasta', param: 'hasta', tipo: 'hasta', etiqueta: 'Hasta', ancho: 'lg:col-span-1' };
const AFILIACION = (marcador = 'Ingrese número de afiliación') =>
  ({ nombre: 'noAfiliacion', param: 'noafiliacion', tipo: 'texto', etiqueta: 'No. Afiliación', marcador });
const SEXO = { nombre: 'sexo', param: 'sexo', tipo: 'select', etiqueta: 'Sexo', todos: 'Todos', opciones: [['M', 'Masculino'], ['F', 'Femenino']] };

const nutricion = {
  titulo: 'Consulta de Nutrición',
  rutaDatos: '/nutricion/historial',
  filtros: [
    DESDE, HASTA, AFILIACION(),
    { nombre: 'idInforme', param: 'idinforme', tipo: 'texto', etiqueta: 'No. Informe', marcador: 'Ingrese el ID de informe' },
    SEXO,
  ],
  columnas: [
    { titulo: 'No. Afiliación', valor: texto('no_afiliacion') },
    { titulo: 'Paciente', valor: nombrePaciente },
    { titulo: 'Sexo', valor: sexo },
    { titulo: 'ID Informe', valor: texto('id_informe') },
    { titulo: 'Fecha', valor: fecha('fecha_creacion') },
    { titulo: 'Motivo', valor: texto('motivo_consulta') },
    // `celda` es lo que se ve en la tabla; `valor` (texto) se usa al imprimir el listado
    { titulo: 'Estado Nutricional', valor: estadoNutricional, celda: (r) => createElement(EtiquetaIMC, { imc: r.imc, estado: r.estado_nutricional }) },
    { titulo: 'Altura (cm)', valor: texto('altura_cm') },
    { titulo: 'Peso (kg)', valor: texto('peso_kg') },
    { titulo: 'IMC', valor: texto('imc') },
    { titulo: 'Usuario', valor: texto('usuario_creacion') },
  ],
  clave: (r, i) => r.id_informe || i,
  listado: { titulo: 'Listado de Informes de Nutrición', asunto: 'Listado Informe Nutrición' },
  Detalle: DetalleNutricion,
  vacio: 'No hay informes para mostrar.',
};

const psicologia = {
  titulo: 'Consulta de Psicología',
  rutaDatos: '/psicologia/historial',
  filtros: nutricion.filtros,
  columnas: [
    { titulo: 'No. Afiliación', valor: texto('no_afiliacion') },
    { titulo: 'Paciente', valor: nombrePaciente },
    { titulo: 'Sexo', valor: sexo },
    { titulo: 'ID Informe', valor: texto('id_informe') },
    { titulo: 'Fecha', valor: fecha('fecha_creacion') },
    { titulo: 'Motivo', valor: texto('motivo_consulta') },
    { titulo: 'Tipo Consulta', valor: texto('tipo_consulta') },
    { titulo: 'Tipo Atención', valor: texto('tipo_atencion') },
    { titulo: 'Pronóstico', valor: texto('pronostico_paciente') },
    { titulo: 'Usuario', valor: texto('usuario_creacion') },
  ],
  clave: (r, i) => r.id_informe || i,
  listado: { titulo: 'Listado de Informes de Psicología', asunto: 'Listado Informes Psicología' },
  Detalle: DetallePsicologia,
  vacio: 'No hay informes para mostrar.',
};

const laboratorios = {
  titulo: 'Consulta de Laboratorios',
  rutaDatos: '/api/laboratorios/historial',
  catalogos: async () => {
    try {
      const { data } = await api.get('/api/laboratorios/catalogos');
      return { periodicidades: data?.periodicidades || [], sexos: data?.sexos || [] };
    } catch {
      return { periodicidades: [], sexos: [] };
    }
  },
  filtros: [
    DESDE, HASTA, { ...AFILIACION(), ancho: 'lg:col-span-2' },
    { nombre: 'periodicidad', param: 'periodicidad', tipo: 'select', etiqueta: 'Periodicidad', todos: 'Todas', catalogo: 'periodicidades' },
    { nombre: 'idLaboratorio', param: 'idlaboratorio', tipo: 'texto', etiqueta: 'No. Laboratorio', marcador: 'Ingrese el ID de laboratorio' },
    { nombre: 'sexo', param: 'sexo', tipo: 'select', etiqueta: 'Sexo', todos: 'Todos', catalogo: 'sexos' },
  ],
  columnas: [
    { titulo: 'No. Afiliación', valor: texto('no_afiliacion') },
    { titulo: 'Paciente', valor: nombrePaciente },
    { titulo: 'Sexo', valor: sexo },
    { titulo: 'ID Laboratorio', valor: texto('id_laboratorio') },
    { titulo: 'Fecha', valor: fecha('fecha_laboratorio') },
    { titulo: 'Periodicidad', valor: texto('periodicidad') },
    { titulo: 'Examen', valor: (r) => (r.examen_realizado ? 'Sí' : 'No') },
    { titulo: 'Virología', valor: texto('virologia') },
    { titulo: 'HIV', valor: (r) => (r.hiv == null || r.hiv === '' ? '' : textoPositivoNegativo(r.hiv)) },
    { titulo: 'Usuario', valor: texto('usuario_creacion') },
  ],
  clave: (r, i) => r.id_laboratorio || i,
  listado: { titulo: 'Listado de Laboratorios', asunto: 'Listado de Laboratorios' },
  Detalle: DetalleLaboratorioAuto,
  vacio: 'No hay registros para mostrar.',
};

const referencias = {
  titulo: 'Consulta de Referencias',
  rutaDatos: '/api/referencias/consulta',
  formato: 'lista',           // el backend responde con el arreglo directamente
  cargaInicial: true,
  catalogos: async () => {
    try {
      const { data } = await api.get('/medicos');
      return { medicos: (data || []).map((m) => [String(m.idmedico), m.nombrecompleto]) };
    } catch {
      return { medicos: [] };
    }
  },
  filtros: [
    DESDE, HASTA,
    { nombre: 'idMedico', param: 'idmedico', tipo: 'select', etiqueta: 'ID Médico', todos: 'Todos', catalogo: 'medicos' },
    AFILIACION('Número de afiliación'),
    { nombre: 'idReferencia', param: 'idreferencia', tipo: 'texto', etiqueta: 'No. Informe', marcador: 'ID de referencia' },
    SEXO,
  ],
  // Búsqueda rápida sobre lo ya cargado (no vuelve a consultar)
  busquedaRapida: { etiqueta: 'Búsqueda rápida', marcador: 'Afiliación, paciente, motivo...', valor: (r) => [r.noafiliacion, nombrePaciente(r), r.nombremedico, r.especialidadreferencia, r.motivotraslado, r.sexo] },
  columnas: [
    { titulo: 'ID Referencia', valor: texto('idreferencia') },
    { titulo: 'No. Afiliación', valor: texto('noafiliacion') },
    { titulo: 'Paciente', valor: nombrePaciente },
    { titulo: 'Sexo', valor: texto('sexo') },
    { titulo: 'Fecha Referencia', valor: fecha('fechareferencia') },
    { titulo: 'Motivo Traslado', valor: texto('motivotraslado') },
    { titulo: 'Médico', valor: texto('nombremedico') },
    { titulo: 'Especialidad', valor: texto('especialidadreferencia') },
  ],
  clave: (r, i) => r.idreferencia || i,
  listado: { titulo: 'Listado de Referencias', asunto: 'Listado Referencias' },
  Detalle: DetalleReferencia,
  vacio: 'No se encontraron referencias.',
};

export const CONSULTAS = { nutricion, psicologia, laboratorios, referencias };
