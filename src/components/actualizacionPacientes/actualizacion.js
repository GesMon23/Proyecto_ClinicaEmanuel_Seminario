// Reglas de la actualización de pacientes (sin React).
import api from '@/config/api';

// 'YYYY-MM-DDTHH:mm...' -> 'YYYY-MM-DD' (valor de un input date)
export const fechaParaInput = (fecha) => (fecha ? String(fecha).split('T')[0].split(' ')[0] : '');

// Un paciente egresado o fallecido no se puede actualizar. Devuelve el mensaje o null.
export function motivoNoActualizable(p) {
  const idEstado = Number(p.id_estado ?? p.idestado ?? p.estado_id ?? 0);
  const idCausa = Number(p.id_causa ?? p.idcausa ?? 0);
  const estado = String(p.estado_descripcion ?? p.estado ?? '').toLowerCase();
  const causa = String(p.causaegreso_descripcion ?? p.causa_egreso_descripcion ?? p.descripcion ?? '').toLowerCase();
  const egresado = idEstado === 3 || estado.includes('egres');
  const fallecido = idEstado === 5 || idCausa === 1 || estado.includes('falle') || causa.includes('falle') || causa.includes('defunc');
  // Respaldo: buscar las palabras clave en cualquier texto del registro
  const porTexto = !egresado && !fallecido
    && /\bfalle|defunc|egres/.test(Object.values(p).filter((v) => typeof v === 'string').join(' ').toLowerCase());
  if (fallecido) return 'No se puede actualizar un paciente fallecido.';
  if (egresado || porTexto) return 'No se puede actualizar un paciente egresado.';
  return null;
}

// Ruta de la API para la foto (se muestra con FotoPaciente, que envía la sesión). El backend la resuelve con la
// url_foto guardada o el archivo <afiliación>.<ext>. El No. de afiliación va completo: antes se le quitaban las
// letras (123AA -> 123) y se buscaba la foto de otro paciente.
export function urlDeFoto(paciente) {
  const naf = String(paciente?.no_afiliacion || '').trim();
  return naf ? `/foto/${encodeURIComponent(naf)}?v=${Date.now()}` : null;
}

// Busca el paciente y lo deja listo para editar. Devuelve { paciente } o { mensaje } si no se puede continuar.
export async function buscarParaActualizar({ noafiliacion, dpi }) {
  const noaf = noafiliacion.trim();
  const dpiTexto = dpi.trim();
  if (!noaf && !dpiTexto) return { mensaje: 'Debe ingresar el número de afiliación o el DPI' };

  const { data } = await api.get(`/Apacientes/actualizacion?${noaf ? `no_afiliacion=${noaf}` : `dpi=${dpiTexto}`}`);
  if (!data.length) return { mensaje: 'Paciente no encontrado' };

  const paciente = data[0];
  const motivo = motivoNoActualizable(paciente);
  if (motivo) return { mensaje: motivo };

  // Ruta para mostrar la foto actual (si no existe, FotoPaciente muestra el avatar)
  const url = urlDeFoto(paciente);
  paciente.url_foto = url || null;
  paciente.urlfoto = url || null;
  return { paciente };
}

const limpio = (v) => (v ?? '').toString().trim();

// Lista de campos con problema (vacía si el formulario es válido)
export function erroresDelFormulario(f) {
  const errores = [];
  if (!/^\d{13}$/.test(limpio(f.dpi))) errores.push('DPI debe contener exactamente 13 dígitos numéricos.');
  if (!limpio(f.primer_nombre)) errores.push('Primer Nombre es obligatorio.');
  if (!limpio(f.primer_apellido)) errores.push('Primer Apellido es obligatorio.');
  if (!limpio(f.sexo)) errores.push('Sexo es obligatorio.');
  if (!limpio(f.fecha_nacimiento)) errores.push('Fecha de Nacimiento es obligatoria.');
  if (!limpio(f.direccion)) errores.push('Dirección es obligatoria.');
  if (!f.id_departamento) errores.push('Departamento es obligatorio.');
  if (!f.id_jornada) errores.push('Jornada es obligatoria.');
  if (!f.id_acceso) errores.push('Acceso Vascular es obligatorio.');
  return errores;
}

export const armarActualizacion = (f) => ({
  dpi: f.dpi || '',
  primer_nombre: f.primer_nombre || '',
  segundo_nombre: f.segundo_nombre || '',
  otros_nombres: f.otros_nombres || '',
  primer_apellido: f.primer_apellido || '',
  segundo_apellido: f.segundo_apellido || '',
  apellido_casada: f.apellido_casada || '',
  edad: f.edad || null,
  fecha_nacimiento: f.fecha_nacimiento || null,
  sexo: f.sexo || '',
  direccion: f.direccion || '',
  fecha_ingreso: f.fecha_ingreso || null,
  id_departamento: f.id_departamento || null,
  id_acceso: f.id_acceso || null,
  numero_formulario_activo: f.numero_formulario_activo || '',
  id_jornada: f.id_jornada || null,
  sesiones_autorizadas_mes: f.sesiones_autorizadas_mes || null,
});

// Sube la foto tomada con la cámara (data URL); devuelve la URL guardada o lanza Error
export async function subirFoto(noAfiliacion, dataUrl) {
  const naf = String(noAfiliacion || '').trim();
  const { data } = await api.post(`/Aupload-foto/${encodeURIComponent(naf)}`, { imagenBase64: dataUrl });
  if (!data || !data.success) throw new Error('Error al subir la foto.');
  return data.url;
}

// Actualiza el paciente (el No. de afiliación va exacto: algunos llevan sufijo como 'PG'); devuelve la respuesta del backend
export const guardarActualizacion = (noAfiliacion, payload) =>
  api.put(`/Apacientes/${encodeURIComponent(String(noAfiliacion || '').trim())}`, payload).then((r) => r.data);

export async function cargarCatalogos() {
  const [departamentos, accesos, jornadas] = await Promise.all([
    api.get('/Adepartamento'),
    api.get('/Aaccesos-vascular'),
    api.get('/Ajornada'),
  ]);
  return { departamentos: departamentos.data, accesos: accesos.data, jornadas: jornadas.data };
}
