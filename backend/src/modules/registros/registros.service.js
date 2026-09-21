// Casos de uso de los registros clínicos. Cada uno conserva el formato de error que consume su pantalla:
// nutrición, psicología y laboratorios responden { error }; referencias responde { detail }.
const repo = require('./registros.repository');
const { motivoBloqueo } = require('../pacientes/pacientes.service');
const { HttpError } = require('../../shared/http');
const { payloadFromRequest, actorFromRequest } = require('../../shared/auth');

// Un paciente inexistente, egresado o fallecido no admite registros nuevos.
// `clave` es la propiedad del cuerpo de error ('error' o 'detail'); `que` completa "No se puede registrar ...".
async function validarPacienteActivo(noAfiliacion, { clave, que }) {
  let paciente;
  try {
    paciente = await repo.pacientePorAfiliacion(noAfiliacion);
  } catch {
    throw new HttpError(500, { [clave]: 'Error al validar estado del paciente.' });
  }
  const motivo = motivoBloqueo(paciente);
  if (motivo === 'Paciente no encontrado') {
    throw new HttpError(404, { [clave]: clave === 'detail' ? 'Paciente no encontrado.' : 'Paciente no encontrado' });
  }
  if (motivo) {
    throw new HttpError(400, { [clave]: `No se puede registrar ${que} para pacientes egresados o fallecidos.` });
  }
}

const nombreActor = async (req) => (await repo.resolverActor(payloadFromRequest(req))) || 'sistema';

// ---------------------------------------------------------------- Nutrición

async function guardarNutricion(req) {
  const b = req.body || {};
  await validarPacienteActivo(b.no_afiliacion, { clave: 'error', que: 'nutrición' });
  const params = [b.no_afiliacion, b.motivo_consulta, b.altura_cm, b.peso_kg, b.observaciones || null, await nombreActor(req)];
  try {
    return await repo.guardarNutricion(params, actorFromRequest(req));
  } catch (err) {
    if (err.code === 'P0001') {
      if (/Paciente no encontrado/i.test(err.message)) throw new HttpError(404, { error: 'Paciente no encontrado' });
      throw new HttpError(400, { error: err.message });
    }
    throw err;
  }
}

// ---------------------------------------------------------------- Psicología

const sinAcentos = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '');

function esSi(valor) {
  if (typeof valor === 'boolean') return valor;
  return sinAcentos(String(valor || '')).trim().toLowerCase() === 'si';
}

function enteroONulo(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = parseInt(valor, 10);
  return Number.isFinite(n) ? n : null;
}

const textoONulo = (valor) => (valor || '').trim() || null;

async function guardarPsicologia(req) {
  const b = req.body || {};
  const actorNombre = await nombreActor(req);
  await validarPacienteActivo(b.no_afiliacion, { clave: 'error', que: 'psicología' });
  const params = [
    b.no_afiliacion || null,
    textoONulo(b.motivo_consulta),
    textoONulo(b.tipo_consulta),
    textoONulo(b.tipo_atencion),
    textoONulo(b.pronostico_paciente),
    esSi(b.aplicacion_kdqol),
    enteroONulo(b.fisico_mental),
    enteroONulo(b.enfermedad_renal),
    enteroONulo(b.sintomas_problemas),
    enteroONulo(b.efectos_enfermedad),
    enteroONulo(b.vida_diaria),
    textoONulo(b.observaciones),
    actorNombre,
  ];
  try {
    const resultado = await repo.guardarPsicologia(params, actorFromRequest(req));
    return { informe: resultado?.informe || null, kdqol: resultado?.kdqol || null };
  } catch (err) {
    if (err.code === 'P0001' && /Paciente no encontrado/i.test(err.message)) {
      throw new HttpError(404, { error: 'Paciente no encontrado' });
    }
    throw err;
  }
}

// -------------------------------------------------------------- Laboratorios

async function guardarLaboratorio(req) {
  const b = req.body || {};
  if (!b.no_afiliacion || !b.idperlaboratorio || !b.fecha_laboratorio) {
    throw new HttpError(400, { error: 'no_afiliacion, idperlaboratorio y fecha_laboratorio son requeridos' });
  }
  await validarPacienteActivo(b.no_afiliacion, { clave: 'error', que: 'laboratorios' });
  const params = [
    b.no_afiliacion,
    b.idperlaboratorio,
    b.fecha_laboratorio,
    b.infeccion_acceso ?? null,
    b.complicacion_acceso ?? null,
    b.observacion ?? null,
    b.examen_realizado ?? null,
    b.causa_no_realizado ?? null,
    b.virologia ?? null,
    b.antigeno_hepatitis_c ?? null,
    b.antigeno_superficie ?? null,
    b.hiv ?? null,
    b.fecha_registro ?? new Date().toISOString(),
    JSON.stringify(Array.isArray(b.parametros) ? b.parametros : []),
  ];
  try {
    const fila = await repo.insertarLaboratorio(params, actorFromRequest(req));
    return { idlaboratorio: fila.idlaboratorio || null, parametros_insertados: fila.parametros_insertados || 0 };
  } catch (err) {
    if (err.code === 'P0001') throw new HttpError(400, { error: err.message });
    throw err;
  }
}

// --------------------------------------------------------------- Referencias

async function registrarReferencia(req) {
  const b = req.body || {};
  if (!b.noafiliacion || !b.fechareferencia || !b.motivotraslado || !b.idmedico || !b.especialidadreferencia) {
    throw new HttpError(400, { detail: 'Todos los campos son obligatorios.' });
  }
  const noAfiliacion = String(b.noafiliacion).trim();
  await validarPacienteActivo(noAfiliacion, { clave: 'detail', que: 'referencias' });
  const params = [
    noAfiliacion,
    b.fechareferencia,
    String(b.motivotraslado).trim(),
    Number(b.idmedico),
    String(b.especialidadreferencia).trim(),
    await nombreActor(req),
  ];
  try {
    const filas = await repo.registrarReferencia(params, actorFromRequest(req));
    return filas[0] || null;
  } catch (err) {
    const msg = err?.message || '';
    if (/Paciente no encontrado/i.test(msg)) throw new HttpError(404, { detail: 'Paciente no encontrado.' });
    if (/id_medico invalido/i.test(msg)) throw new HttpError(400, { detail: 'ID de médico inválido.' });
    throw err;
  }
}

// ------------------------------------------------------------------ Médicos

async function listarMedicos() {
  const filas = await repo.medicos();
  return filas.map((r) => {
    const id = r.idmedico ?? r.id_medico ?? r.id ?? r.iddoctor ?? r.id_doctor ?? null;
    const nombre = r.nombrecompleto ?? r.nombre_completo ?? r.nombre ?? r.nombremedico ?? r.nombre_medico ?? null;
    return { idmedico: id, nombrecompleto: nombre ?? (id != null ? String(id) : '') };
  });
}

module.exports = {
  validarPacienteActivo, esSi, enteroONulo, textoONulo,
  guardarNutricion, guardarPsicologia, guardarLaboratorio, registrarReferencia, listarMedicos,
  laboratoriosPorAfiliacion: repo.laboratoriosPorAfiliacion,
  parametrosUltimoLaboratorio: repo.parametrosUltimoLaboratorio,
};
