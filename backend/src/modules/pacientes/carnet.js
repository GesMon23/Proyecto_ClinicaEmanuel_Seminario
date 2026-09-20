// Generación del carné de paciente en PDF (PDFKit + QR). Movido tal cual desde BackRegistroPacientes.api.js.
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const LOGO_PATH = path.join(__dirname, '../../../assets/img/logoClinica.png');

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

module.exports = { generarCarnetPDF };
