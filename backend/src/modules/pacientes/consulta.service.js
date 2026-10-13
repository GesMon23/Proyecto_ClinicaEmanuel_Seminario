// Casos de uso de la pantalla Consulta de Pacientes.
const fs = require('fs');
const path = require('path');
const repo = require('./consulta.repository');
const fotos = require('./fotos');
const { definirCarnetPaciente } = require('./carnet');
const { HttpError } = require('../../shared/http');

// Homologa los nombres de columna de los laboratorios (con o sin guion bajo)
const normalizarLaboratorio = (r) => ({
  no_afiliacion: r.no_afiliacion ?? r.noafiliacion ?? null,
  primer_nombre: r.primer_nombre ?? r.primernombre ?? null,
  segundo_nombre: r.segundo_nombre ?? r.segundonombre ?? null,
  primer_apellido: r.primer_apellido ?? r.primerapellido ?? null,
  segundo_apellido: r.segundo_apellido ?? r.segundoapellido ?? null,
  sexo: r.sexo ?? null,
  id_laboratorio: r.id_laboratorio ?? r.idlaboratorio ?? null,
  fecha_laboratorio: r.fecha_laboratorio ?? r.fecha ?? null,
  periodicidad: r.periodicidad ?? null,
  examen_realizado: r.examen_realizado ?? r.examen ?? null,
  virologia: r.virologia ?? null,
  hiv: r.hiv ?? null,
  usuario_creacion: r.usuario_creacion ?? null,
  parametros: r.parametros ?? null,
});

const laboratoriosPorAfiliacion = async (noAfiliacion) => (await repo.laboratorios(noAfiliacion)).map(normalizarLaboratorio);

async function laboratoriosPorDpi(dpi) {
  const noAfiliacion = await repo.noAfiliacionDeDpi(dpi);
  return noAfiliacion ? laboratoriosPorAfiliacion(noAfiliacion) : [];
}

async function faltistasPorDpi(dpi) {
  const noAfiliacion = await repo.noAfiliacionDeDpi(dpi);
  return noAfiliacion ? repo.faltistas(noAfiliacion) : [];
}

async function pacientePorAfiliacion(noAfiliacion) {
  const paciente = await repo.pacientePorAfiliacion(noAfiliacion);
  if (!paciente) throw new HttpError(404, { error: 'Paciente no encontrado.' });
  return paciente;
}

async function pacientePorDpi(dpi) {
  const paciente = await repo.pacientePorDpi(dpi);
  if (!paciente) throw new HttpError(404, { error: 'Paciente no encontrado.' });
  return paciente;
}

async function crearHistorialFormulario(body) {
  if (!body.no_afiliacion || !body.numero_formulario) {
    throw new HttpError(400, { error: 'no_afiliacion y numero_formulario son obligatorios' });
  }
  return repo.crearHistorialFormulario(body);
}

async function crearEgreso(body) {
  if (!body.no_afiliacion || !body.id_causa_egreso) {
    throw new HttpError(400, { error: 'no_afiliacion e id_causa_egreso son obligatorios' });
  }
  return repo.crearEgreso(body);
}

// ---- Fotos ----
const idSinExtension = (raw) => String(raw || '').trim().replace(/\.[a-zA-Z0-9]+$/, '');

async function verificarFoto(rawId, conDebug) {
  const id = idSinExtension(rawId);
  const urlFoto = await repo.urlFoto(id);
  const ruta = fotos.resolverRutaFoto({ urlfoto: urlFoto }, id);
  if (ruta) {
    const filename = path.basename(ruta);
    return {
      exists: true,
      filename,
      url: `/fotos/${filename}`,
      ...(conDebug ? { resolvedFrom: urlFoto || null, absolutePath: ruta } : {}),
    };
  }
  return { exists: false, ...(conDebug ? { resolvedFrom: urlFoto || null } : {}) };
}

// Ruta de la foto a servir; lanza 404 si no existe
async function rutaFotoParaServir(rawId) {
  const id = idSinExtension(rawId);
  const ruta = fotos.resolverRutaFoto({ urlfoto: await repo.urlFoto(id) }, id);
  if (!ruta) throw new HttpError(404, { error: 'Foto no encontrada' });
  return ruta;
}

// Foto para la pantalla de TV (pública): solo la del paciente en atención; cualquier otra responde 404
// (igual que una foto inexistente, para no revelar qué afiliaciones existen)
async function rutaFotoEnAtencion(rawId) {
  const id = idSinExtension(rawId);
  if (!id || !(await repo.enAtencion(id))) throw new HttpError(404, { error: 'Foto no encontrada' });
  return rutaFotoParaServir(id);
}

// ---- Carné ----
// Foto del carné: url_foto (ruta absoluta o dentro de /fotos) o <no_afiliacion>.jpg / .png
function rutaFotoDeCarnet(paciente, noAfiliacion) {
  const estandar = () => {
    for (const ext of ['jpg', 'png']) {
      const ruta = path.join(fotos.FOTOS_DIR, `${noAfiliacion}.${ext}`);
      if (fs.existsSync(ruta)) return ruta;
    }
    return null;
  };
  if (!paciente.url_foto) return estandar();
  if (fs.existsSync(paciente.url_foto)) return paciente.url_foto;
  const enFotos = path.join(fotos.FOTOS_DIR, paciente.url_foto);
  return fs.existsSync(enFotos) ? enFotos : estandar();
}

// Genera el PDF del carné en un archivo temporal; devuelve su ruta. El llamador lo envía y lo borra.
async function generarCarnet(noAfiliacion, baseFrontend) {
  const paciente = await repo.filaPaciente(noAfiliacion);
  if (!paciente) throw new HttpError(404, { error: 'Paciente no encontrado' });

  const datos = {
    primer_nombre: paciente.primer_nombre,
    segundo_nombre: paciente.segundo_nombre,
    otros_nombres: paciente.otros_nombres,
    primer_apellido: paciente.primer_apellido,
    segundo_apellido: paciente.segundo_apellido,
    apellido_casada: paciente.apellido_casada,
    direccion: paciente.direccion,
    fecha_nacimiento: paciente.fecha_nacimiento,
    fecha_ingreso: paciente.fecha_ingreso,
    no_afiliacion: paciente.no_afiliacion,
    dpi: paciente.dpi,
    sexo: paciente.sexo,
  };

  const tmpDir = path.join(__dirname, '../../../tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const rutaCarnet = path.join(tmpDir, `carnet_${noAfiliacion}_${Date.now()}.pdf`);
  await definirCarnetPaciente(datos, rutaFotoDeCarnet(paciente, noAfiliacion), rutaCarnet, baseFrontend);
  return rutaCarnet;
}

module.exports = {
  laboratoriosPorAfiliacion, laboratoriosPorDpi, faltistasPorDpi,
  pacientePorAfiliacion, pacientePorDpi, crearHistorialFormulario, crearEgreso,
  verificarFoto, rutaFotoParaServir, rutaFotoEnAtencion, generarCarnet,
  normalizarLaboratorio,
};
