// Reglas del reingreso de pacientes (sin React).
import api from '@/config/api';
import { resolverArchivoFoto } from '../pacientes/fotos';

export const FORM_VACIO = {
  numeroformulario: '',
  fechaReingreso: '',
  observaciones: '',
  inicioPrestServicios: '',
  finPrestServicios: '',
  sesionesAutorizadasMes: '',
};

// Las columnas llegan con o sin guion bajo según el procedimiento: se unifican
export const normalizarPaciente = (r) => ({
  idpaciente: r.idpaciente ?? r.id_paciente ?? null,
  noafiliacion: r.noafiliacion ?? r.no_afiliacion ?? '',
  dpi: r.dpi ?? '',
  nopacienteproveedor: r.nopacienteproveedor ?? r.no_paciente_proveedor ?? '',
  primernombre: r.primernombre ?? r.primer_nombre ?? '',
  segundonombre: r.segundonombre ?? r.segundo_nombre ?? '',
  otrosnombres: r.otrosnombres ?? r.otros_nombres ?? '',
  primerapellido: r.primerapellido ?? r.primer_apellido ?? '',
  segundoapellido: r.segundoapellido ?? r.segundo_apellido ?? '',
  apellidacasada: r.apellidacasada ?? r.apellido_casada ?? '',
  sexo: r.sexo ?? '',
  direccion: r.direccion ?? '',
  idestado: r.idestado ?? r.id_estado ?? null,
  idcausa: r.idcausa ?? r.id_causa ?? null,
  causaegreso_descripcion: r.causaegreso_descripcion ?? r.causa_egreso_descripcion ?? r.causa_descripcion ?? r.descripcion ?? r.descripcionEgreso ?? '',
  departamento_nombre: r.departamento_nombre ?? r.departamento ?? '',
  estado_descripcion: r.estado_descripcion ?? r.estado ?? '',
  jornada_descripcion: r.jornada_descripcion ?? r.jornada ?? '',
  acceso_descripcion: r.acceso_descripcion ?? r.acceso ?? '',
  urlfoto: r.urlfoto ?? r.url_foto ?? null,
  observaciones: r.observaciones,
});

// Si a la ficha le faltan datos descriptivos se completan con la consulta de egreso
async function completarDetalles(p) {
  const falta = !p.departamento_nombre || !p.estado_descripcion || !p.jornada_descripcion || !p.acceso_descripcion || !p.direccion;
  if (!falta || !p.noafiliacion) return p;
  try {
    const { data } = await api.get('/pacientes/egreso', { params: { noafiliacion: p.noafiliacion } });
    const eg = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!eg) return p;
    return {
      ...p,
      direccion: p.direccion || eg.direccion || '',
      departamento_nombre: p.departamento_nombre || eg.departamento_nombre || '',
      estado_descripcion: p.estado_descripcion || eg.estado_descripcion || '',
      jornada_descripcion: p.jornada_descripcion || eg.jornada_descripcion || '',
      acceso_descripcion: p.acceso_descripcion || eg.acceso_descripcion || '',
    };
  } catch {
    return p; // se sigue con los datos que hay
  }
}

// Busca pacientes candidatos a reingreso: [{ ficha (para la tarjeta), ...campos normalizados }]
export async function buscarCandidatos(params) {
  const { data } = await api.get('/pacientes/reingreso', { params });
  return Promise.all((Array.isArray(data) ? data : []).map(async (raw) => {
    const p = await completarDetalles(normalizarPaciente(raw));
    return {
      ...p,
      ficha: {
        nombre: `${p.primernombre} ${p.segundonombre} ${p.otrosnombres} ${p.primerapellido} ${p.segundoapellido} ${p.apellidacasada}`.replace(/ +/g, ' ').trim(),
        noAfiliacion: p.noafiliacion,
        dpi: p.dpi,
        sexo: p.sexo,
        archivoFoto: await resolverArchivoFoto(p.noafiliacion, p.urlfoto),
        versionFoto: Date.now(),
        detalles: [
          { label: 'No. Paciente Proveedor', value: p.nopacienteproveedor },
          { label: 'Dirección', value: p.direccion },
          { label: 'Departamento', value: p.departamento_nombre },
          { label: 'Estado', value: p.estado_descripcion },
          { label: 'Jornada', value: p.jornada_descripcion },
          { label: 'Acceso Vascular', value: p.acceso_descripcion },
        ],
        observaciones: p.observaciones,
      },
    };
  }));
}

export const esFallecido = (p) => Number(p.idcausa) === 1 || (p.causaegreso_descripcion || '').toLowerCase().includes('fallec');

// Solo pueden reingresar los egresados (estado 3) que no fallecieron
export function clasificar(pacientes) {
  const fallecidos = pacientes.filter(esFallecido);
  const elegibles = pacientes.filter((p) => Number(p.idestado) === 3 && !fallecidos.includes(p));
  return { fallecidos, elegibles };
}

const fechaValida = (texto) => Boolean(texto) && !Number.isNaN(new Date(texto).getTime());

export function formularioValido(f) {
  if (!f?.numeroformulario || !fechaValida(f.fechaReingreso)) return false;
  if (!fechaValida(f.inicioPrestServicios) || !fechaValida(f.finPrestServicios)) return false;
  if (new Date(f.inicioPrestServicios).getTime() > new Date(f.finPrestServicios).getTime()) return false;
  if (f.sesionesAutorizadasMes === '') return false;
  const sesiones = Number(f.sesionesAutorizadasMes);
  return !Number.isNaN(sesiones) && sesiones >= 1;
}

export const armarReingreso = (p, f) => ({
  noAfiliacion: p.noafiliacion,
  numeroFormulario: f.numeroformulario,
  fechaReingreso: f.fechaReingreso,
  observaciones: f.observaciones || '',
  inicioPrestServicios: f.inicioPrestServicios || null,
  finPrestServicios: f.finPrestServicios || null,
  sesionesAutorizadasMes: f.sesionesAutorizadasMes === '' ? null : Number(f.sesionesAutorizadasMes),
  usuario: 'web',
});

export const claveDe = (p) => p.idpaciente ?? p.noafiliacion ?? p.dpi ?? `${p.primernombre}-${p.dpi || ''}`;
