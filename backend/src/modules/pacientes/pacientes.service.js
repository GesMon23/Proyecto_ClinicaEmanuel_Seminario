// Casos de uso de pacientes: registro, actualización, egreso, reingreso y formularios.
const fs = require('fs');
const path = require('path');
const repo = require('./pacientes.repository');
const fotos = require('./fotos');
const { generarCarnetPDF } = require('./carnet');
const { HttpError } = require('../../shared/http');

const nz = (v) => (v === undefined || v === null || v === '' ? null : v);
const soloDigitos = (v) => String(v || '').replace(/\D+/g, '').trim();

// ---------------------------------------------------------------- Registro

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const d = new Date(fechaNacimiento);
  if (isNaN(d)) return null;
  const hoy = new Date();
  const cumplioAnio = hoy.getMonth() > d.getMonth() || (hoy.getMonth() === d.getMonth() && hoy.getDate() >= d.getDate());
  return hoy.getFullYear() - d.getFullYear() - (cumplioAnio ? 0 : 1);
}

async function existePorDpi(dpi) {
  if (!(await repo.existeDpi(dpi))) throw new HttpError(404, { error: 'Paciente no encontrado.' });
  return { ok: true };
}

async function existePorNoAfiliacion(noAfiliacion) {
  if (!(await repo.existeNoAfiliacion(noAfiliacion))) throw new HttpError(404, { error: 'Paciente no encontrado.' });
  return { ok: true };
}

// Registra al paciente (y, en la base, genera sus turnos de Hemodiálisis según período y jornada)
async function registrarPaciente(b, actor) {
  const noaf = String(b.noafiliacion || b.noAfiliacion || '').trim();
  let archivoFoto = null;
  if (noaf && (b.photo || b.imagenBase64)) {
    archivoFoto = fotos.guardarFotoRegistro(noaf, b.photo || b.imagenBase64);
  }
  const fnac = b.fechaNacimiento || b.fechanacimiento || null;

  const filas = await repo.insertarPaciente([
    nz(noaf),
    nz(b.dpi),
    nz(b.nopacienteproveedor),
    nz(b.primernombre),
    nz(b.segundonombre),
    nz(b.otrosnombres),
    nz(b.primerapellido),
    nz(b.segundoapellido),
    nz(b.apellidocasada),
    nz(calcularEdad(fnac)),
    nz(fnac),
    nz(b.sexo),
    nz(b.direccion),
    nz(b.fechaIngreso || b.fechaingreso),
    (b.idDepartamento === undefined || b.idDepartamento === null || b.idDepartamento === '') ? null : String(b.idDepartamento).trim(),
    b.idEstado ? Number(b.idEstado) : 1,
    b.idAcceso ? Number(b.idAcceso) : null,
    nz(b.numeroFormulario),
    b.idJornada ? Number(b.idJornada) : null,
    b.sesionesAutorizadasMes ? Number(b.sesionesAutorizadasMes) : null,
    archivoFoto,
    null, // usuario_creacion heredado (el SP usa p_user_name)
    nz(b.fechainicioperiodo),
    nz(b.fechafinperiodo),
    String(actor),
  ], actor);

  return {
    ok: true,
    noafiliacion: filas?.[0]?.noafiliacion || noaf,
    carnetUrl: `/carnet/forzar/${encodeURIComponent(noaf)}`,
  };
}

// Genera el PDF del carné en un archivo temporal; devuelve su ruta. El llamador lo envía y lo borra.
async function generarCarnet(noAfiliacion) {
  const noaf = String(noAfiliacion || '').trim();
  const filas = await repo.carnetDatos(noaf);
  const paciente = filas[0];
  if (!paciente) throw new HttpError(404, { error: 'Paciente no encontrado' });

  const rutaFoto = paciente.urlfoto ? path.join(fotos.FOTOS_DIR, paciente.urlfoto) : null;
  const tmpDir = path.join(__dirname, '../../../tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const rutaCarnet = path.join(tmpDir, `carnet_${noaf}.pdf`);

  try {
    await generarCarnetPDF(paciente, rutaFoto, rutaCarnet);
  } catch (err) {
    console.error('Error generando carnet:', err);
    throw new HttpError(500, { error: 'Error al generar el carné.' });
  }
  return { noaf, rutaCarnet };
}

// ------------------------------------------------------------ Actualización

async function pacienteParaActualizacion(dpi, noAfiliacion) {
  if (!dpi && !noAfiliacion) throw new HttpError(400, { error: 'Debe proporcionar dpi o no_afiliacion.' });
  return repo.pacienteParaActualizacion(dpi, noAfiliacion);
}

// Si la jornada cambió, los turnos Creada de Hemodiálisis se mueven a los días de la nueva jornada.
// Solo hace falta en los UPDATE directos: el procedimiento sp_actualizar_paciente_por_noafiliacion ya lo hace.
async function reprogramarSiCambioJornada(noAfiliacion, jornadaAnterior, jornadaNueva, actor) {
  const nueva = (jornadaNueva === undefined || jornadaNueva === null || jornadaNueva === '') ? null : Number(jornadaNueva);
  const anterior = (jornadaAnterior === undefined || jornadaAnterior === null) ? null : Number(jornadaAnterior);
  if (nueva === null || Number.isNaN(nueva) || nueva === anterior) return;
  try {
    await repo.reprogramarTurnosPorJornada(noAfiliacion, actor);
  } catch (err) {
    console.error('[pacientes] No se pudieron reprogramar los turnos tras el cambio de jornada:', err.message);
  }
}

const DPI_DUPLICADO = 'El DPI ya está registrado para otro paciente.';

// Actualiza un paciente. Devuelve { success, paciente }; lanza HttpError para 400/404/409.
async function actualizarPaciente(noAfiliacion, datos, actor) {
  let dpiActual = null;
  let jornadaAnterior = null;
  try {
    const basicos = await repo.datosBasicos(noAfiliacion);
    dpiActual = basicos?.dpi ? soloDigitos(basicos.dpi) : null;
    jornadaAnterior = basicos?.id_jornada ?? null;
  } catch (_) { /* si falla, el procedimiento decide */ }

  const dpiNuevo = datos.dpi ? soloDigitos(datos.dpi) : null;
  const mismoPaciente = async () => {
    const titulares = (await repo.titularesDeDpi(dpiNuevo)).map(soloDigitos);
    return titulares.includes(soloDigitos(noAfiliacion));
  };

  // Prevalidación: DPI único (solo si intenta cambiarlo respecto al actual)
  try {
    if (dpiNuevo && dpiNuevo.length === 13 && dpiNuevo !== dpiActual) {
      const titulares = await repo.titularesDeDpi(dpiNuevo);
      if (titulares.length > 0 && !(await mismoPaciente())) {
        throw new HttpError(409, { success: false, detail: DPI_DUPLICADO });
      }
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    // si falla la prevalidación, continuar y que el SP decida
  }

  const actualizarSinTocarDpi = async () => {
    const fila = await repo.actualizarDirecto(noAfiliacion, datos);
    await reprogramarSiCambioJornada(noAfiliacion, jornadaAnterior, datos.id_jornada, actor);
    return { success: true, paciente: fila };
  };

  // DPI sin cambios: UPDATE directo (no pasa por el procedimiento)
  try {
    if (dpiActual && dpiNuevo && dpiActual === dpiNuevo) return await actualizarSinTocarDpi();
  } catch (_) { /* continuar con el SP */ }

  try {
    const filas = await repo.actualizarConProcedimiento([
      noAfiliacion, datos.dpi, datos.primer_nombre, datos.segundo_nombre, datos.otros_nombres,
      datos.primer_apellido, datos.segundo_apellido, datos.apellido_casada, datos.edad,
      datos.fecha_nacimiento, datos.sexo, datos.direccion, datos.fecha_ingreso, datos.id_departamento,
      datos.id_acceso, datos.numero_formulario_activo, datos.id_jornada, datos.sesiones_autorizadas_mes,
      datos.url_foto, String(actor),
    ]);
    if (filas.length === 0) throw new HttpError(404, { success: false, detail: 'Paciente no encontrado' });
    return { success: true, paciente: filas[0] };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const duplicado = err && (err.code === '23505' || /ya est[aá] registrado para otro paciente/i.test(err.message || ''));
    if (duplicado) {
      try {
        if (dpiNuevo && await mismoPaciente()) return await actualizarSinTocarDpi(); // el DPI es de este mismo paciente
      } catch (_) { /* seguir con el 409 */ }
      throw new HttpError(409, { success: false, detail: DPI_DUPLICADO });
    }
    if (err && /DPI inv[aá]lido/i.test(err.message || '')) {
      throw new HttpError(400, { success: false, detail: 'DPI inválido: debe contener exactamente 13 dígitos numéricos.' });
    }
    console.error(err);
    throw new HttpError(500, { success: false, detail: 'Error al actualizar paciente' });
  }
}

async function subirFoto(noAfiliacion, imagenBase64, actor) {
  const nombre = fotos.guardarFotoActualizacion(noAfiliacion, imagenBase64);
  await repo.actualizarFoto(noAfiliacion, nombre, actor);
  return { success: true, url: nombre };
}

// ------------------------------------------------------------------ Egreso

async function pacientesParaEgreso({ dpi, noafiliacion }) {
  if (!dpi && !noafiliacion) throw new HttpError(400, { error: 'Debe proporcionar dpi o no_afiliacion.' });
  return repo.pacientesParaEgreso(dpi, noafiliacion);
}

// PUT /pacientes/:noAfiliacion: egreso (desdeEgreso) o actualización de reingreso (el resto)
async function actualizarDesdeEgresoOReingreso(noAfiliacion, body, actor) {
  const modo = body.desdeEgreso && !body.desdeReingreso ? 'egreso' : 'reingreso';
  const paciente = await repo.actualizarPorEgresoOReingreso({ noAfiliacion, modo, datos: body }, actor);
  if (!paciente) throw new HttpError(404, { detail: 'Paciente no encontrado' });
  return { success: true, message: 'Paciente actualizado exitosamente', paciente };
}

async function registrarEgreso(body, actor) {
  const r = await repo.registrarEgreso(body, actor);
  return { success: true, message: 'Proceso Exitoso!!', egreso: r.insert, paciente: r.update };
}

// --------------------------------------------------------------- Reingreso

async function pacientesParaReingreso({ noafiliacion, dpi }) {
  if (!noafiliacion && !dpi) throw new HttpError(400, { error: 'Debe proporcionar noafiliacion o dpi.' });
  return repo.pacientesParaReingreso(dpi, noafiliacion);
}

async function registrarReingreso(b, actor) {
  const noAfiliacion = String(b.noAfiliacion || '').trim();
  const numeroFormulario = String(b.numeroFormulario || '').trim();
  const fechaReingreso = String(b.fechaReingreso || '').trim();
  if (!noAfiliacion || !numeroFormulario || !fechaReingreso) {
    throw new HttpError(400, { success: false, error: 'noAfiliacion, numeroFormulario y fechaReingreso son obligatorios.' });
  }
  const filas = await repo.insertarReingreso({
    noAfiliacion,
    numeroFormulario,
    sesionesMes: (b.sesionesAutorizadasMes !== undefined && b.sesionesAutorizadasMes !== null && b.sesionesAutorizadasMes !== '')
      ? Number(b.sesionesAutorizadasMes) : null,
    inicioPrest: (b.inicioPrestServicios ? String(b.inicioPrestServicios).trim() : null) || null,
    finPrest: (b.finPrestServicios ? String(b.finPrestServicios).trim() : null) || null,
    fechaReingreso,
    observaciones: (b.observaciones ?? '').trim() || null,
  }, actor);
  return { success: true, paciente: filas?.[0] || null };
}

async function registrarHistorialReingreso(b, actor) {
  if (!b.no_afiliacion || !b.numero_formulario) {
    throw new HttpError(400, { error: 'no_afiliacion y numero_formulario son obligatorios' });
  }
  const filas = await repo.insertarHistorialReingreso({
    noAfiliacion: String(b.no_afiliacion).trim(),
    numeroFormulario: String(b.numero_formulario).trim(),
    fechaReingreso: b.fecha_reingreso,
    observaciones: b.observaciones,
  }, actor);
  return filas?.[0] || null;
}

// -------------------------------------------------------------- Formularios

// No se permiten formularios para pacientes egresados o fallecidos ni inexistentes
function motivoBloqueo(paciente) {
  if (!paciente) return 'Paciente no encontrado';
  const idEstado = Number(paciente.id_estado ?? paciente.idestado ?? 0);
  const idCausa = Number(paciente.id_causa ?? paciente.idcausa ?? 0);
  const estadoDesc = String(paciente.estado_descripcion ?? paciente.estado ?? '').toLowerCase();
  const causaDesc = String(paciente.causaegreso_descripcion ?? paciente.causa_egreso_descripcion ?? paciente.descripcion ?? '').toLowerCase();
  const esEgresado = idEstado === 3 || estadoDesc.includes('egres');
  const esFallecido = idCausa === 1 || estadoDesc.includes('fallec') || causaDesc.includes('fallec');
  if (esFallecido) return 'Fallecido';
  if (esEgresado) return 'Egresado';
  return null;
}

async function registrarFormularios(pacientes, actor) {
  if (!Array.isArray(pacientes) || pacientes.length === 0) {
    throw new HttpError(400, { error: 'Debe enviar un arreglo de pacientes.' });
  }

  const afiliaciones = pacientes
    .map((p) => String(p?.noafiliacion || p?.no_afiliacion || '').trim())
    .filter(Boolean);
  let filas;
  try {
    filas = await repo.pacientesPorAfiliacion(afiliaciones);
  } catch (err) {
    throw new HttpError(500, { error: 'Error al validar estado de pacientes.', detalle: err.message });
  }
  const bloqueados = [];
  afiliaciones.forEach((af, i) => {
    const motivo = motivoBloqueo(filas[i]);
    if (motivo) bloqueados.push({ noafiliacion: af, motivo });
  });
  if (bloqueados.length > 0) {
    throw new HttpError(400, {
      error: 'Hay pacientes que no pueden recibir registro de formulario por estado Egresado o Fallecido.',
      bloqueados,
    });
  }

  await repo.registrarFormularios(JSON.stringify(pacientes), actor);
  return { success: true, mensaje: 'Pacientes actualizados e historial registrado correctamente.' };
}

async function tablaFormularios(noAfiliacion) {
  const filas = await repo.tablaFormularios(String(noAfiliacion || '').trim());
  if (filas.length === 0) throw new HttpError(404, { error: 'Paciente no encontrado.' });
  return filas[0];
}

module.exports = {
  existePorDpi, existePorNoAfiliacion, registrarPaciente, generarCarnet,
  pacienteParaActualizacion, actualizarPaciente, subirFoto,
  pacientesParaEgreso, actualizarDesdeEgresoOReingreso, registrarEgreso,
  pacientesParaReingreso, registrarReingreso, registrarHistorialReingreso,
  registrarFormularios, tablaFormularios,
  calcularEdad,
};
