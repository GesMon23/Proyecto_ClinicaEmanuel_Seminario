// Generación del carné de paciente en PDF (PDFKit + QR): A4 vertical con logo, foto, QR, datos y tabla de
// firmas. Movido tal cual desde BackConsultaPacientes.js (es el que atiende /carnet/forzar/:noafiliacion).
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const LOGO_PATH = path.join(__dirname, '../../../assets/img/logoClinica.png');

async function definirCarnetPaciente(paciente, fotoPath, outputPath, baseFrontend) {
    // Helper para obtener campos compatibles (con o sin guion bajo)
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

    const baseFront = baseFrontend || process.env.FRONTEND_URL || 'http://localhost:3000';
    const queryParts = [];
    if (noafiliacion) queryParts.push(`noafiliacion=${encodeURIComponent(noafiliacion)}`);
    if (dpi) queryParts.push(`dpi=${encodeURIComponent(dpi)}`);
    const queryStr = queryParts.join('&');
    const qrUrl = `${baseFront}/layout/consulta-pacientes${queryStr ? `?${queryStr}` : ''}`;

    // Generar QR como dataURL
    let qrDataUrl = null;
    try {
        qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 70 });
    } catch (_) {}

    const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 40, bufferPages: true });
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Logo en la esquina superior izquierda
    const logoPath = LOGO_PATH; // ../../assets/img/logoClinica.png
    if (fs.existsSync(logoPath)) {
        try { doc.image(logoPath, 28, 18, { width: 88 }); } catch (_) {}
    }
    // Medidas de página y márgenes
    const pageWidth = doc.page.width;
    const ml = doc.page.margins?.left ?? 40;
    const mr = doc.page.margins?.right ?? 40;

    // Título centrado (verde institucional)
    doc.font('Helvetica-Bold').fontSize(30).fillColor('#2d6a4f').text('Carné de Paciente', ml, 28, { align: 'center', width: pageWidth - ml - mr });

    // QR a la derecha del título
    if (qrDataUrl) {
        try {
            const buf = Buffer.from(qrDataUrl.split(',')[1], 'base64');
            const qrW = 60;
            const qrX = pageWidth - mr - qrW;
            const qrY = 25;
            doc.image(buf, qrX, qrY, { width: qrW, height: qrW });
        } catch (_) {}
    }

    // Línea separadora verde (como en el reporte)
    doc.moveTo(ml, 95).lineTo(pageWidth - mr, 95).lineWidth(1.5).strokeColor('#2d6a4f').stroke();

    // Foto del paciente (bajar para no superponer con encabezado/QR) y hacerla un poco más grande
    try {
        // +20% de tamaño y acercar la foto a la línea del encabezado
        const frameX = 405, frameY = 110, frameW = 144, frameH = 110;
        if (fotoPath && fs.existsSync(fotoPath)) {
            // Dibujar la foto ocupando exactamente el marco
            try {
                doc.image(fotoPath, frameX, frameY, { width: frameW, height: frameH });
            } catch (_) {
                // Fallback si falla dimensiones exactas
                doc.image(fotoPath, frameX, frameY, { fit: [frameW, frameH] });
            }
            // Borde verde por encima, pegado al contorno de la foto
            doc.lineWidth(1).strokeColor('#2d6a4f');
            doc.rect(frameX, frameY, frameW, frameH).stroke();
        } else {
            // Marco placeholder con borde verde y texto
            doc.lineWidth(1).strokeColor('#2d6a4f');
            doc.rect(frameX, frameY, frameW, frameH).stroke();
            doc.font('Helvetica').fontSize(10).fillColor('#888').text('Sin Foto', frameX, frameY + frameH / 2 - 5, { width: frameW, align: 'center' });
        }
    } catch (_) {
        // Si falla la imagen, seguir sin romper el PDF
    }

    // Bloque izquierdo: datos personales (acercar al encabezado)
    let datosY = 110;
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

    // Datos personales un poco más grandes
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#2d6a4f');
    doc.text('Nombres:', 30, datosY, { continued: true });
    doc.font('Helvetica').fontSize(13).fillColor('black').text(nombreCompleto, { continued: false });
    datosY += 20;
    doc.font('Helvetica-Bold').fillColor('#2d6a4f').text('Apellidos:', 30, datosY, { continued: true });
    doc.font('Helvetica').fillColor('black').text(apellidoCompleto, { continued: false });
    datosY += 20;
    doc.font('Helvetica-Bold').fillColor('#2d6a4f').text('Dirección:', 30, datosY, { continued: true });
    doc.font('Helvetica').fillColor('black').text(direccion || '', { continued: false });
    datosY += 20;
    doc.font('Helvetica-Bold').fillColor('#2d6a4f').text('Fecha Nacimiento:', 30, datosY, { continued: true });
    doc.font('Helvetica').fillColor('black').text(formatFecha(fechanacimiento), { continued: false });
    datosY += 20;
    doc.font('Helvetica-Bold').fillColor('#2d6a4f').text('Fecha Ingreso:', 30, datosY, { continued: true });
    doc.font('Helvetica').fillColor('black').text(formatFecha(fechaingreso), { continued: false });
    datosY += 20;
    doc.font('Helvetica-Bold').fillColor('#2d6a4f').text('No. Afiliación:', 30, datosY, { continued: true });
    doc.font('Helvetica').fillColor('black').text(noafiliacion || '', { continued: false });
    datosY += 20;
    doc.font('Helvetica-Bold').fillColor('#2d6a4f').text('DPI:', 30, datosY, { continued: true });
    doc.font('Helvetica').fillColor('black').text(dpi || '', { continued: false });
    datosY += 20;
    doc.font('Helvetica-Bold').fillColor('#2d6a4f').text('Sexo:', 30, datosY, { continued: true });
    doc.font('Helvetica').fillColor('black').text(sexo || '', { continued: false });
    datosY += 26;

    // Línea divisoria (aún más cerca de los datos)
    doc.moveTo(30, datosY + 10).lineTo(540, datosY + 10).lineWidth(1).strokeColor('black').stroke();

    // Tabla de firmas (más próxima a los datos) y ajuste dinámico para 1 sola página
    const tableTop = datosY + 22;
    const colX = [30, 105, 210, 390, 540];
    const rowHeight = 28; // filas más altas
    // calcular cuántas filas caben hasta el pie sin provocar salto de página
    const pageH = doc.page.height;
    const footerReserve = 90; // reserva para pie de página y margen inferior
    const maxHeight = pageH - footerReserve - tableTop;
    let numRows = Math.floor((maxHeight - rowHeight) / rowHeight);
    // límites razonables
    if (!isFinite(numRows) || numRows < 8) numRows = 8;
    if (numRows > 16) numRows = 16;
    // Verificación estricta para no forzar salto: reducir hasta que la última línea de la tabla quede por encima del pie
    const pageBottomLimit = pageH - 70; // margen extra para evitar que cualquier texto del pie provoque salto
    while (tableTop + (numRows + 1) * rowHeight > pageBottomLimit && numRows > 8) {
        numRows--;
    }
    // Encabezado con fondo verde y texto blanco
    const headerH = rowHeight;
    const tableRight = colX[4];
    doc.save();
    doc.lineWidth(1).strokeColor('#2d6a4f').fillColor('#2d6a4f');
    doc.rect(colX[0], tableTop, tableRight - colX[0], headerH).fill();
    doc.font('Helvetica-Bold').fontSize(11).fillColor('white');
    doc.text('Fecha', colX[0] + 2, tableTop + 10, { width: colX[1] - colX[0] - 4, align: 'center' });
    doc.text('Hora', colX[1] + 2, tableTop + 10, { width: colX[2] - colX[1] - 4, align: 'center' });
    doc.text('Observaciones', colX[2] + 2, tableTop + 10, { width: colX[3] - colX[2] - 4, align: 'center' });
    doc.text('Firma', colX[3] + 2, tableTop + 10, { width: colX[4] - colX[3] - 4, align: 'center' });
    doc.restore();

    // Franjas alternadas en filas del cuerpo
    for (let r = 1; r <= numRows; r++) {
        const y = tableTop + r * rowHeight;
        if (r % 2 === 1) {
            doc.save();
            doc.fillColor('#f5f7f9');
            doc.rect(colX[0], y, tableRight - colX[0], rowHeight).fill();
            doc.restore();
        }
    }

    // Rejilla: líneas gris claro y borde exterior verde
    doc.lineWidth(0.8).strokeColor('#a3a3a3');
    for (let i = 0; i <= numRows + 1; i++) {
        const y = tableTop + i * rowHeight;
        doc.moveTo(colX[0], y).lineTo(tableRight, y).stroke();
    }
    for (let i = 0; i < colX.length; i++) {
        doc.moveTo(colX[i], tableTop).lineTo(colX[i], tableTop + (numRows + 1) * rowHeight).stroke();
    }
    // Borde exterior
    doc.lineWidth(1.2).strokeColor('#2d6a4f')
       .rect(colX[0], tableTop, tableRight - colX[0], (numRows + 1) * rowHeight).stroke();

    // Pie de página (igual al Reporte): línea divisoria + fecha generación + título sistema (centro) + paginación (derecha)
    try {
        const gen = new Date();
        const dd = String(gen.getDate()).padStart(2, '0');
        const mm = String(gen.getMonth() + 1).padStart(2, '0');
        const yyyy = gen.getFullYear();
        const hh = String(gen.getHours()).padStart(2, '0');
        const min = String(gen.getMinutes()).padStart(2, '0');
        const genStr = `${dd}/${mm}/${yyyy} ${hh}:${min}`;

        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
            doc.switchToPage(range.start + i);
            const pw = doc.page.width;
            const ph = doc.page.height;
            const left = 40, right = pw - 40;
            // línea divisoria (gris, ancho 0.5)
            doc.save();
            doc.lineWidth(0.5).strokeColor('#c8c8c8')
               .moveTo(left, ph - 50).lineTo(right, ph - 50).stroke();
            // textos (negrita, tamaños y colores como en Reporte)
            doc.font('Helvetica-Bold').fontSize(9);
            // Fecha (izquierda) gris 80
            doc.fillColor('#505050').text(`Generado: ${genStr}`, left, ph - 36, { width: 200, align: 'left', lineBreak: false, wordWrap: false, height: 12, paragraphGap: 0, ellipsis: false });
            // Título del sistema (centro) verde
            doc.fillColor('#008000').text('Sistema de Gestión de Pacientes', left, ph - 36, { width: pw - 80, align: 'center', lineBreak: false, wordWrap: false, height: 12, paragraphGap: 0, ellipsis: false });
            // Página (derecha) gris 80
            doc.fillColor('#505050').text(`Página ${i + 1} de ${range.count}`, left, ph - 36, { width: pw - 80, align: 'right', lineBreak: false, wordWrap: false, height: 12, paragraphGap: 0, ellipsis: false });
            doc.restore();
        }
    } catch (_) {}

    doc.end();

    return new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
}

module.exports = { definirCarnetPaciente };
