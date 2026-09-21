// Reglas del registro de pacientes (sin React): formulario, validaciones, payload y carné.
import api from '@/config/api';

export const FORM_VACIO = {
  noAfiliacion: '',
  dpi: '',
  noPacienteProveedor: '',
  primerNombre: '',
  segundoNombre: '',
  otrosNombres: '',
  primerApellido: '',
  segundoApellido: '',
  apellidoCasada: '',
  fechaNacimiento: '',
  sexo: '',
  direccion: '',
  fechaIngreso: '',
  idDepartamento: '',
  idAcceso: '',
  numeroFormulario: '',
  periodoInicio: '',
  periodoFin: '',
  idjornada: '',
  sesionesAutorizadasMes: '',
};

const CAMPOS_OBLIGATORIOS = [
  'noAfiliacion', 'dpi', 'noPacienteProveedor', 'primerNombre', 'primerApellido', 'sexo', 'direccion', 'fechaIngreso',
  'idDepartamento', 'idAcceso', 'numeroFormulario', 'periodoInicio', 'periodoFin', 'idjornada', 'sesionesAutorizadasMes',
];

// 'YYYY-MM-DD' -> 'DD/MM/YYYY' sin pasar por Date
export function formatFechaYMDToDMY(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

// Cambio de un campo; el apellido de casada solo aplica al género Femenino
export function aplicarCambio(form, name, value) {
  if (name === 'sexo' && value !== 'Femenino') return { ...form, sexo: value, apellidoCasada: '' };
  return { ...form, [name]: value };
}

// Lanza Error con el mensaje para el usuario si el formulario no es válido
export function validarFormulario(form) {
  if (CAMPOS_OBLIGATORIOS.some((campo) => !String(form[campo] ?? '').trim())) {
    throw new Error('Todos los campos marcados con * son obligatorios');
  }
  if (!/^\d{13}$/.test(String(form.dpi).trim())) throw new Error('El DPI debe tener 13 dígitos (solo números).');
  if (form.periodoFin < form.periodoInicio) throw new Error("La fecha 'Hasta' del período no puede ser anterior a 'Del'.");
}

// El backend responde 404 cuando el valor NO existe (o sea, está disponible)
async function estaDisponible(ruta) {
  try {
    await api.get(ruta);
    return { disponible: false };
  } catch (err) {
    if (err?.response?.status === 404) return { disponible: true };
    return { error: true };
  }
}

// Mensaje de error si el DPI o el No. de afiliación ya existen (o no se pudo validar); null si están libres
export async function verificarUnicidad({ dpi, noAfiliacion }) {
  const porDpi = await estaDisponible(`/pacientes/existe/dpi/${dpi}`);
  if (porDpi.error) return 'No se pudo validar el DPI. Inténtelo de nuevo.';
  if (!porDpi.disponible) return 'El DPI ya está registrado para otro paciente.';

  const porAfiliacion = await estaDisponible(`/pacientes/existe/noafiliacion/${encodeURIComponent(noAfiliacion)}`);
  if (porAfiliacion.error) return 'No se pudo validar el Número de Afiliación. Inténtelo de nuevo.';
  if (!porAfiliacion.disponible) return 'El Número de Afiliación ya está registrado.';
  return null;
}

// Cuerpo de POST /pacientes (mantiene las claves que espera el backend)
export function armarPaciente(form, foto) {
  const texto = (v) => v?.trim() || null;
  return {
    noafiliacion: String(form.noAfiliacion).trim(), // texto para no perder ceros
    dpi: String(form.dpi).trim(),
    nopacienteproveedor: String(form.noPacienteProveedor).trim(),

    primernombre: String(form.primerNombre).trim(),
    segundonombre: texto(form.segundoNombre),
    otrosnombres: texto(form.otrosNombres),
    primerapellido: String(form.primerApellido).trim(),
    segundoapellido: texto(form.segundoApellido),
    apellidocasada: form.sexo === 'Femenino' ? texto(form.apellidoCasada) : null,

    fechaNacimiento: form.fechaNacimiento || null,
    sexo: String(form.sexo),
    direccion: String(form.direccion).trim(),
    fechaIngreso: form.fechaIngreso,
    idDepartamento: form.idDepartamento ? String(form.idDepartamento) : null,
    idAcceso: form.idAcceso ? Number(form.idAcceso) : null,
    numeroFormulario: texto(form.numeroFormulario),

    periodoprestservicios: `Del ${formatFechaYMDToDMY(form.periodoInicio)} al ${formatFechaYMDToDMY(form.periodoFin)}`,
    fechainicioperiodo: form.periodoInicio || null,
    fechafinperiodo: form.periodoFin || null,

    idJornada: form.idjornada ? Number(form.idjornada) : null,
    sesionesAutorizadasMes: form.sesionesAutorizadasMes ? Number(form.sesionesAutorizadasMes) : null,

    usuario_creacion: 'web',
    photo: foto || null,
  };
}

// Mensaje legible de un error de axios (lista de errores, { error } o el cuerpo tal cual)
export function mensajeDeError(error) {
  const data = error?.response?.data;
  if (data) {
    if (Array.isArray(data.errors)) return data.errors.join('\n');
    if (typeof data.error === 'string') return data.error;
    try { return JSON.stringify(data); } catch { /* se usa el mensaje del error */ }
  }
  return error?.message ?? 'Error desconocido';
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Descarga el carné con reintentos cortos (por si el servidor aún lo está generando)
export async function descargarCarnetConReintento(noAfiliacion, intentos = 3) {
  const id = String(noAfiliacion).trim();
  let ultimo;
  for (let i = 0; i < intentos; i++) {
    try {
      const { data } = await api.get(`/carnet/forzar/${encodeURIComponent(id)}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id}_carnet.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return;
    } catch (e) {
      ultimo = e;
      await esperar(600 + i * 300);
    }
  }
  throw ultimo;
}
