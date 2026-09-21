// Reglas del egreso de pacientes (sin React).
import api from '@/config/api';
import { resolverArchivoFoto } from '../pacientes/fotos';

export const FORM_VACIO = {
  causaegreso: '',
  descripcion: '',
  fechaegreso: '',
  numerocasoconcluido: '',
  observaciones: '',
  fechafallecimiento: '',
  comorbilidades: '',
  lugarfallecimiento: '',
  causafallecimiento: '',
};

// Un paciente egresado o fallecido no puede egresar de nuevo
export function estaInactivo(p) {
  const id = Number(p.idestado ?? p.id_estado ?? 0);
  const estado = String(p.estado_descripcion ?? p.estado ?? '').toLowerCase();
  return id === 3 || id === 5 || estado.includes('egres') || estado.includes('falle');
}

export const causaEsFallecimiento = (causas, idCausa) => {
  const causa = causas.find((c) => String(c.id_causa) === String(idCausa));
  return Boolean(causa && causa.descripcion && causa.descripcion.toLowerCase().includes('fallecimiento'));
};

// Mensaje del primer problema del formulario, o null si está completo
export function problemaDelFormulario(form, esFallecimiento) {
  if (!form.causaegreso) return 'Debe seleccionar la causa de egreso';
  if (!esFallecimiento && !form.fechaegreso) return 'Debe ingresar la fecha de egreso';
  if (!esFallecimiento && !form.descripcion) return 'Debe ingresar una descripción';
  if (esFallecimiento && (!form.fechafallecimiento || !form.lugarfallecimiento || !form.causafallecimiento)) {
    return 'Debe completar todos los campos de fallecimiento (excepto Comorbilidades que es opcional)';
  }
  return null;
}

export const armarEgreso = (noAfiliacion, form) => ({
  no_afiliacion: noAfiliacion,
  id_causa_egreso: form.causaegreso,
  descripcion: form.descripcion,
  fecha_egreso: form.fechaegreso,
  observaciones: form.observaciones,
  fechafallecimiento: form.fechafallecimiento,
  comorbilidades: form.comorbilidades,
  lugarfallecimiento: form.lugarfallecimiento,
  causafallecimiento: form.causafallecimiento,
});

// Ficha para la tarjeta del paciente (con la foto ya resuelta)
export async function fichaDePaciente(p) {
  const noAfiliacion = p.no_afiliacion || p.noafiliacion || '';
  return {
    nombre: `${p.primer_nombre || ''} ${p.segundo_nombre || ''} ${p.otros_nombres || ''} ${p.primer_apellido || ''} ${p.segundo_apellido || ''} ${p.apellido_casada || ''}`.replace(/ +/g, ' ').trim(),
    noAfiliacion,
    dpi: p.dpi,
    sexo: p.sexo,
    archivoFoto: await resolverArchivoFoto(noAfiliacion, p.url_foto || p.urlfoto),
    versionFoto: Date.now(),
    detalles: [
      { label: 'No. Paciente Proveedor', value: p.no_paciente_proveedor },
      { label: 'Dirección', value: p.direccion },
      { label: 'Departamento', value: p.departamento_nombre },
      { label: 'Estado', value: p.estado_descripcion },
      { label: 'Jornada', value: p.jornada_descripcion },
      { label: 'Acceso Vascular', value: p.acceso_descripcion },
    ],
    observaciones: p.observaciones,
  };
}

export const cargarCausasEgreso = () => api.get('/causas_egreso').then((r) => r.data).catch(() => []);
