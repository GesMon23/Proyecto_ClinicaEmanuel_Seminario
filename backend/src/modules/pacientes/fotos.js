// Fotos de pacientes en disco (backend/fotos): un archivo <no_afiliacion>.<ext> por paciente.
const fs = require('fs');
const path = require('path');
const { HttpError } = require('../../shared/http');

const FOTOS_DIR = path.join(__dirname, '../../../fotos');
if (!fs.existsSync(FOTOS_DIR)) {
  fs.mkdirSync(FOTOS_DIR, { recursive: true });
}

// El nombre del archivo sale del No. de afiliación (que llega en la URL y Express decodifica, p. ej. %2F -> /):
// solo letras, dígitos, guion y guion bajo, para que nunca apunte fuera de la carpeta de fotos
const AFILIACION_SEGURA = /^[A-Za-z0-9_-]{1,40}$/;
function nombreSeguro(noAfiliacion) {
  const id = String(noAfiliacion ?? '').trim();
  if (!AFILIACION_SEGURA.test(id)) throw new HttpError(400, { detail: 'Número de afiliación inválido para la foto.' });
  return id;
}

// Devuelve la ruta solo si queda dentro de FOTOS_DIR
const RAIZ = path.resolve(FOTOS_DIR) + path.sep;
const dentroDeFotos = (ruta) => (path.resolve(ruta).startsWith(RAIZ) ? ruta : null);

// Registro de paciente: acepta una data URL (png/jpeg/jpg/webp) o base64 crudo. Si algo falla devuelve
// null (el registro continúa sin foto).
function guardarFotoRegistro(noAfiliacion, raw) {
  try {
    const texto = String(raw);
    let ext = 'jpg';
    let base64;
    const m = texto.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
    if (m) {
      ext = m[1].toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      base64 = m[2];
    } else {
      base64 = texto;
    }
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) ext = 'jpg';
    const nombre = `${nombreSeguro(noAfiliacion)}.${ext}`;
    fs.writeFileSync(path.join(FOTOS_DIR, nombre), Buffer.from(base64, 'base64'));
    return nombre;
  } catch (err) {
    console.warn('[fotos] No se pudo guardar la foto:', err.message);
    return null;
  }
}

// Actualización de foto: solo data URL png/jpeg/jpg; devuelve el nombre del archivo o lanza HttpError 400
function guardarFotoActualizacion(noAfiliacion, imagenBase64) {
  if (!imagenBase64) throw new HttpError(400, { detail: 'No se recibió la imagen.' });
  const m = String(imagenBase64).match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
  if (!m) throw new HttpError(400, { detail: 'Formato de imagen inválido.' });
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const nombre = `${nombreSeguro(noAfiliacion)}.${ext}`;
  fs.writeFileSync(path.join(FOTOS_DIR, nombre), Buffer.from(m[2], 'base64'));
  return nombre;
}

// ¿Existe la foto? Con un id sin extensión busca cualquier archivo que empiece con ese id
function existeFoto(filename) {
  const nombre = String(filename || '');
  if (!nombre.includes('.')) {
    try {
      return fs.readdirSync(FOTOS_DIR).some((f) => path.parse(f).name.startsWith(nombre));
    } catch (_) {
      return false;
    }
  }
  const ruta = dentroDeFotos(path.join(FOTOS_DIR, nombre));
  return Boolean(ruta) && fs.existsSync(ruta);
}

// Ruta de la foto de un paciente tolerando sufijos/espacios en el nombre ("id AF.jpg"); null si no hay
function rutaFotoPorId(id) {
  try {
    const archivos = fs.readdirSync(FOTOS_DIR);
    for (const ext of ['jpg', 'jpeg', 'png', 'JPG', 'JPEG', 'PNG']) {
      const nombre = `${id}.${ext}`;
      if (archivos.includes(nombre)) return dentroDeFotos(path.join(FOTOS_DIR, nombre));
    }
    const hit = archivos.find((f) => path.parse(f).name.startsWith(id));
    if (hit) return dentroDeFotos(path.join(FOTOS_DIR, hit));
  } catch (_) { /* sin carpeta legible: no hay foto */ }
  return null;
}

// Resuelve la ruta real de la foto de un paciente (url_foto guardada, variantes de extensión o búsqueda por nombre)
function resolverRutaFoto(paciente, noafiliacion) {
    const baseDir = FOTOS_DIR;
    const candidates = [];
    let url = paciente?.urlfoto || paciente?.url_foto || null;
    if (url) {
        try {
            // Si es URL absoluta, tomar el basename; si tiene prefijo /fotos/, limpiarlo
            if (/^https?:\/\//i.test(String(url))) {
                try {
                    const u = new URL(String(url));
                    url = decodeURIComponent(path.basename(u.pathname));
                } catch (_) {}
            } else {
                url = String(url).replace(/^\/+/, '').replace(/^fotos\//i, '');
            }
            if (url) candidates.push(path.join(baseDir, url));
        } catch (_) {}
    }
    // Probar variantes de extensión y mayúsculas/minúsculas
    const exts = ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG', '.WEBP'];
    for (const ext of exts) candidates.push(path.join(baseDir, `${noafiliacion}${ext}`));
    // Intento final: escanear el directorio y buscar por nombre (sin extensión), case-insensitive
    try {
        const files = fs.readdirSync(baseDir);
        const hit = files.find(f => (path.parse(f).name || '').toLowerCase() === String(noafiliacion).toLowerCase());
        if (hit) candidates.push(path.join(baseDir, hit));
    } catch (_) {}
    for (const cand of candidates) {
        try { if (cand && dentroDeFotos(cand) && fs.existsSync(cand)) return cand; } catch (_) {}
    }
    return null;
}

module.exports = { FOTOS_DIR, guardarFotoRegistro, guardarFotoActualizacion, existeFoto, rutaFotoPorId, resolverRutaFoto, nombreSeguro };
