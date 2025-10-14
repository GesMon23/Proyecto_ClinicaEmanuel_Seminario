const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const { runWithUser } = require('../db');

// Directorio de fotos
const FOTOS_DIR = path.join(__dirname, '../../fotos');
if (!fs.existsSync(FOTOS_DIR)) {
  fs.mkdirSync(FOTOS_DIR, { recursive: true });
}
const LOGO_PATH = path.join(__dirname, '../../assets/img/logoClinica.png');

// Catálogos via SP + cursor (ya creados por ti)
router.get('/departamentos', async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cursorName = 'cur_departamentos_lista_reg';
    await client.query('CALL public.sp_departamentos_lista($1)', [cursorName]);
    const r = await client.query(`FETCH ALL FROM "${cursorName}"`);
    await client.query('COMMIT');
    return res.json(r.rows || []);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ error: 'Error al obtener departamentos' });
  } finally {
    client.release();
  }
});

router.get('/accesos-vasculares', async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cursorName = 'cur_accesos_vasc_reg';
    await client.query('CALL public.sp_accesos_vasculares_activos($1)', [cursorName]);
    const r = await client.query(`FETCH ALL FROM "${cursorName}"`);
    await client.query('COMMIT');
    return res.json(r.rows || []);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ error: 'Error al obtener accesos vasculares' });
  } finally {
    client.release();
  }
});

router.get('/jornadas', async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cursorName = 'cur_jornadas_act_reg';
    await client.query('CALL public.sp_jornadas_activas($1)', [cursorName]);
    const r = await client.query(`FETCH ALL FROM "${cursorName}"`);
    await client.query('COMMIT');
    return res.json(r.rows || []);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ error: 'Error al obtener jornadas' });
  } finally {
    client.release();
  }
});

// Búsquedas de existencia (unicidad)
router.get('/pacientes/existe/dpi/:dpi', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cursorName = 'cur_existe_dpi';
    await client.query('CALL public.sp_pacientes_existe_dpi($1, $2)', [req.params.dpi, cursorName]);
    const r = await client.query(`FETCH ALL FROM "${cursorName}"`);
    await client.query('COMMIT');
    const existe = r.rows?.[0]?.existe === true;
    if (!existe) return res.status(404).json({ error: 'Paciente no encontrado.' });
    return res.json({ ok: true });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ error: 'Error al buscar paciente por DPI.' });
  } finally {
    client.release();
  }
});

router.get('/pacientes/existe/noafiliacion/:noafiliacion', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cursorName = 'cur_existe_noaf';
    await client.query('CALL public.sp_pacientes_existe_noafiliacion($1, $2)', [req.params.noafiliacion, cursorName]);
    const r = await client.query(`FETCH ALL FROM "${cursorName}"`);
    await client.query('COMMIT');
    const existe = r.rows?.[0]?.existe === true;
    if (!existe) return res.status(404).json({ error: 'Paciente no encontrado.' });
    return res.json({ ok: true });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ error: 'Error al obtener paciente.' });
  } finally {
    client.release();
  }
});

// Registro de paciente (usa runWithUser para auditoría y guardar foto si viene)
router.post('/pacientes', async (req, res) => {
  try {
    const b = req.body || {};
    const nz = v => (v === undefined || v === null || v === '' ? null : v);

    const noaf = String(b.noafiliacion || b.noAfiliacion || '').trim();
    let savedFileName = null;
    if (noaf && (b.photo || b.imagenBase64)) {
      try {
        const raw = String(b.photo || b.imagenBase64);
        let base64, ext = 'jpg';
        const m = raw.match(/^data:image\/[\w+.-]+;base64,(.+)$/i);
        if (m) {
          ext = m[1].toLowerCase();
          if (ext === 'jpeg') ext = 'jpg';
          base64 = m[2];
        } else {
          base64 = raw;
        }
        if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) ext = 'jpg';
        savedFileName = `${noaf}.${ext}`;
        fs.writeFileSync(path.join(FOTOS_DIR, savedFileName), Buffer.from(base64, 'base64'));
      } catch (e) {
        console.warn('[POST /pacientes] No se pudo guardar la foto:', e.message);
        savedFileName = null;
      }
    }

    // Calcular edad si viene fecha de nacimiento
    const fnac = b.fechaNacimiento || b.fechanacimiento || null;
    let edad = null;
    if (fnac) {
      const d = new Date(fnac);
      if (!isNaN(d)) {
        const hoy = new Date();
        edad = hoy.getFullYear() - d.getFullYear() - (hoy.getMonth() < d.getMonth() || (hoy.getMonth() === d.getMonth() && hoy.getDate() < d.getDate()) ? 1 : 0);
      }
    }

    // Resolver actor
    let userName = 'web';
    try {
      const auth = req.headers.authorization || '';
      if (auth.startsWith('Bearer ')) {
        const token = auth.slice(7);
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
        userName = payload?.nombre_usuario || String(payload?.sub || 'web');
      }
    } catch (_) {}

    // Llamar SP con cursor dentro de runWithUser
    const rows = await runWithUser(String(userName), async (client) => {
      await client.query('BEGIN');
      const cursorName = 'cur_paciente_insertar';
      await client.query('CALL public.sp_paciente_insertar($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)', [
        nz(noaf),
        nz(b.dpi),
        nz(b.nopacienteproveedor),
        nz(b.primernombre),
        nz(b.segundonombre),
        nz(b.otrosnombres),
        nz(b.primerapellido),
        nz(b.segundoapellido),
        nz(b.apellidocasada),
        nz(edad),
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
        savedFileName,
        null, // usuario_creacion (opcional)
        nz(b.fechainicioperiodo),
        nz(b.fechafinperiodo),
        String(userName),
        cursorName
      ]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      await client.query('COMMIT');
      return fetchRes.rows;
    });

    return res.status(201).json({
      ok: true,
      noafiliacion: rows?.[0]?.noafiliacion || noaf,
      carnetUrl: `/carnet/forzar/${encodeURIComponent(noaf)}`,
    });
  } catch (err) {
    console.error('[POST /pacientes] ERROR:', err.message, err.code);
    if (err.code === '23505') return res.status(409).json({ error: 'no_afiliacion o dpi ya existe' });
    return res.status(500).json({ error: 'Error al registrar el paciente' });
  }
});

// Generación de carné (similar al existente en server.js)
async function generarCarnetPDF(paciente, fotoPath, outputPath) {
  const firstNonEmpty = (...vals) => vals.find(v => v !== undefined && v !== null && String(v).trim() !== '') || '';
  const primernombre = firstNonEmpty(paciente.primernombre, paciente.primer_nombre);
  const segundonombre = firstNonEmpty(paciente.segundonombre, paciente.segundo_nombre);
  const otrosnombres = firstNonEmpty(paciente.otrosnombres, paciente.otros_nombres);
  const primerapellido = firstNonEmpty(paciente.primerapellido, paciente.primer_apellido);
  const segundoapellido = firstNonEmpty(paciente.segundoapellido, paciente.segundo_apellido);
  const apellidocasada = firstNonEmpty(paciente.apellidocasada, paciente.apellido_casada);
  const direccion = firstNonEmpty(paciente.direccion);
  const fechanacimiento = firstNonEmpty(paciente.fechanacimiento, paciente.fecha_nacimiento);
  const fechaingreso = firstNonEmpty(paciente.fechaingreso, paciente.fecha_ingreso);
  const noafiliacion = firstNonEmpty(paciente.noafiliacion, paciente.no_afiliacion);
  const dpi = firstNonEmpty(paciente.dpi);
  const sexo = firstNonEmpty(paciente.sexo);

  const baseFrontend = process.env.FRONTEND_URL || 'http://localhost:3000';
  const qrUrl = `${baseFrontend}/layout/consulta-pacientes?noafiliacion=${encodeURIComponent(noafiliacion)}`;

  let qrDataUrl = null;
  try { qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 70 }); } catch (_) {}

  const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 40 });
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  if (fs.existsSync(LOGO_PATH)) { try { doc.image(LOGO_PATH, 30, 25, { width: 60 }); } catch (_) {} }
  doc.font('Helvetica-Bold').fontSize(22).fillColor('black').text('Carné de Paciente', 110, 35, { align: 'left' });

  try {
    if (fotoPath && fs.existsSync(fotoPath)) {
      doc.rect(430, 25, 90, 70).fillAndStroke('white', '#bbb');
      doc.image(fotoPath, 432, 27, { width: 86, height: 66, fit: [86, 66] });
    } else {
      doc.rect(430, 25, 90, 70).fillAndStroke('white', '#bbb');
      doc.font('Helvetica').fontSize(12).fillColor('#888').text('Sin Foto', 450, 60);
    }
  } catch (_) {}

  if (qrDataUrl) {
    try {
      const buf = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      doc.image(buf, 450, 105, { width: 50, height: 50 });
      doc.font('Helvetica').fontSize(8).fillColor('black').text('Escanee para ver\ninformación', 445, 158, { width: 65, align: 'center' });
    } catch (_) {}
  }

  let datosY = 100;
  const nombreCompleto = `${[primernombre, segundonombre, otrosnombres].filter(Boolean).join(' ')}`.replace(/ +/g, ' ').trim();
  const apellidoCompleto = `${[primerapellido, segundoapellido, apellidocasada].filter(Boolean).join(' ')}`.replace(/ +/g, ' ').trim();
  const formatFecha = (fecha) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    if (isNaN(d)) return String(fecha);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  doc.font('Helvetica').fontSize(11).fillColor('black');
  doc.text('Nombres:', 30, datosY, { continued: true });
  doc.font('Helvetica-Bold').text(nombreCompleto); datosY += 15;
  doc.font('Helvetica').text('Apellidos:', 30, datosY, { continued: true });
  doc.font('Helvetica-Bold').text(apellidoCompleto); datosY += 15;
  doc.font('Helvetica').text('Dirección:', 30, datosY, { continued: true });
  doc.font('Helvetica-Bold').text(direccion || ''); datosY += 15;
  doc.font('Helvetica').text('Fecha Nacimiento:', 30, datosY, { continued: true });
  doc.font('Helvetica-Bold').text(formatFecha(fechanacimiento)); datosY += 15;
  doc.font('Helvetica').text('Fecha Ingreso:', 30, datosY, { continued: true });
  doc.font('Helvetica-Bold').text(formatFecha(fechaingreso)); datosY += 15;
  doc.font('Helvetica').text('No. Afiliación:', 30, datosY, { continued: true });
  doc.font('Helvetica-Bold').text(noafiliacion || ''); datosY += 15;
  doc.font('Helvetica').text('DPI:', 30, datosY, { continued: true });
  doc.font('Helvetica-Bold').text(dpi || ''); datosY += 15;
  doc.font('Helvetica').text('Sexo:', 30, datosY, { continued: true });
  doc.font('Helvetica-Bold').text(sexo || ''); datosY += 20;

  // línea divisoria
  doc.moveTo(30, datosY + 18).lineTo(540, datosY + 18).lineWidth(1).strokeColor('black').stroke();

  // tabla simple de firmas (plantilla)
  const tableTop = datosY + 35;
  const colX = [30, 105, 210, 390, 540];
  const rowHeight = 24;
  const numRows = 16;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('black');
  doc.text('Fecha', colX[0] + 2, tableTop + 7, { width: colX[1] - colX[0] - 4, align: 'center' });
  doc.text('Hora', colX[1] + 2, tableTop + 7, { width: colX[2] - colX[1] - 4, align: 'center' });
  doc.text('Observaciones', colX[2] + 2, tableTop + 7, { width: colX[3] - colX[2] - 4, align: 'center' });
  doc.text('Firma', colX[3] + 2, tableTop + 7, { width: colX[4] - colX[3] - 4, align: 'center' });
  doc.font('Helvetica').fillColor('black');
  for (let i = 0; i <= numRows + 1; i++) {
    const y = tableTop + i * rowHeight;
    doc.moveTo(colX[0], y).lineTo(colX[4], y).strokeColor('black').stroke();
  }
  for (let i = 0; i < colX.length; i++) {
    doc.moveTo(colX[i], tableTop).lineTo(colX[i], tableTop + (numRows + 1) * rowHeight).strokeColor('black').stroke();
  }

  doc.end();
  return new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

router.get('/carnet/forzar/:noafiliacion', async (req, res) => {
  const client = await pool.connect();
  try {
    const noaf = String(req.params.noafiliacion || '').trim();
    await client.query('BEGIN');
    const cursorName = 'cur_paciente_carnet';
    await client.query('CALL public.sp_paciente_carnet_datos($1, $2)', [noaf, cursorName]);
    const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
    await client.query('COMMIT');
    const paciente = fetchRes.rows?.[0];
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });

    const fotoFilename = paciente.urlfoto ? path.join(FOTOS_DIR, paciente.urlfoto) : null;
    const tmpDir = path.join(__dirname, '../../tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const carnetPath = path.join(tmpDir, `carnet_${noaf}.pdf`);

    try { await generarCarnetPDF(paciente, fotoFilename, carnetPath); } catch (e) {
      console.error('Error generando carnet:', e);
      return res.status(500).json({ error: 'Error al generar el carné.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${noaf}_carnet.pdf"`);
    const stream = fs.createReadStream(carnetPath);
    stream.on('end', () => { try { fs.unlinkSync(carnetPath); } catch { } });
    stream.pipe(res);
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Error en GET /carnet/forzar/:noafiliacion:', error);
    res.status(500).json({ error: 'Error al generar el carné.', detalle: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
