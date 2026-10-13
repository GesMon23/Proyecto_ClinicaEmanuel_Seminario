// Reporte PDF del paciente (jsPDF): encabezado con logo y QR, foto, datos personales y resumen de cada sección.
import jsPDF from 'jspdf';
import logoClinica from '@/assets/logoClinica2.png';
import api, { encabezadoSesion } from '@/config/api';
import { formatearFecha, calcularEstanciaRango } from '@/utils/fechas';
import { estadoNutricional } from '@/utils/imc';
import { calcularEdad } from './calculos';

// `datos` trae las listas ya cargadas de cada pestaña (referencias, nutricion, psicologia, formularios, turnos, faltistas, laboratorios)
export async function generarReportePaciente(paciente, datos = {}) {
    const { referencias, nutricion, psicologia, formularios, turnos, faltistas, laboratorios } = datos;
    if (!paciente) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const verde = '#2d6a4f';
    // Usar fuente incorporada segura (helvetica) para evitar errores de cmap
    doc.setFont('helvetica', 'normal');

    // Helper para obtener un PNG de QR en base64 (con múltiples fallbacks y validación de imagen)
    const getQRBase64 = async (text) => {
        const normText = (text ?? '').toString().trim().replace(/\s+/g, ' ');
        const toBase64 = async (resp) => {
            const ct = resp.headers.get('content-type') || '';
            if (!ct.startsWith('image/')) return null;
            const blob = await resp.blob();
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        };
        const size = 300; // mayor resolución para mejor legibilidad al escalar en PDF
        // Solo el QR del propio backend: el texto lleva No. de afiliación y DPI, así que nunca se envía a
        // servicios externos (antes había respaldo en quickchart.io, qrserver.com y Google Charts)
        try {
            const url = `/api/qr?size=${size}&text=${encodeURIComponent(normText)}`;
            const resp = await fetch(url, { cache: 'no-store', headers: encabezadoSesion() });
            if (resp.ok) {
                const b64 = await toBase64(resp);
                if (b64) return b64;
            }
        } catch { /* se omite este elemento del PDF */ }
        return null;
    };

    // Encabezado con logo, título y QR
    // Logo (asegúrate de tener el logo en base64 o usa una imagen pública accesible)
    const logoImg = await getLogoBase64(); // función auxiliar para obtener el logo en base64
    // URL fija para abrir directamente la consulta del paciente por no_afiliacion
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://localhost:3000';
    const qp = [];
    const noaf = (paciente?.no_afiliacion ?? '').toString().trim();
    const dpi = (paciente?.dpi ?? '').toString().trim();
    if (noaf) qp.push(`noafiliacion=${encodeURIComponent(noaf)}`);
    if (dpi) qp.push(`dpi=${encodeURIComponent(dpi)}`);
    const qrTarget = `${origin}/layout/consulta-pacientes${qp.length ? `?${qp.join('&')}` : ''}`;
    const qrImgData = await getQRBase64(qrTarget);
    if (logoImg) {
        // Logo ligeramente más largo
        const logoW = 90, logoH = 60; // respeta el ajuste actual
        const logoX = 40;
        const logoY = 30;
        doc.addImage(logoImg, 'PNG', logoX, logoY, logoW, logoH, undefined, 'FAST');
    }
    // Título principal centrado
    doc.setFont(undefined, 'bold');
    doc.setFontSize(24);
    doc.setTextColor(verde);
    doc.text('Reporte de Paciente', pageWidth / 2, 70, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.setDrawColor(verde);
    doc.setLineWidth(1.6);
    doc.line(40, 95, pageWidth - 40, 95);
    // QR en la esquina superior derecha del encabezado (primera página)
    if (qrImgData) {
        const qrSize = 60;
        const qrX = pageWidth - 40 - qrSize; // margen derecho 40
        const qrY = 25; // cerca del borde superior
        doc.addImage(qrImgData, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');
    }

    // Foto del paciente
    let fotoY = 120;
    let fotoX = 40;
    let fotoPaciente = await getFotoPacienteBase64(paciente);
    const frameW = 110;
    const frameH = 130;
    if (fotoPaciente) {
        try {
            const img = new Image();
            img.src = fotoPaciente;
            await new Promise(res => { img.onload = () => res(); img.onerror = () => res(); });
            const iw = img.naturalWidth || 1;
            const ih = img.naturalHeight || 1;
            const r = Math.min(frameW / iw, frameH / ih);
            const dw = Math.max(1, Math.floor(iw * r));
            const dh = Math.max(1, Math.floor(ih * r));
            const dx = fotoX + Math.floor((frameW - dw) / 2);
            const dy = fotoY + Math.floor((frameH - dh) / 2);
            doc.addImage(fotoPaciente, 'JPEG', dx, dy, dw, dh, undefined, 'FAST');
            // Borde acoplado al tamaño real de la foto en verde (sin radio)
            doc.setDrawColor(45, 106, 79);
            doc.setLineWidth(1);
            doc.rect(dx, dy, dw, dh);
        } catch { /* se omite este elemento del PDF */ }
    } else {
        // Marco placeholder con borde verde y texto (sin radio)
        doc.setDrawColor(45, 106, 79);
        doc.setLineWidth(1);
        doc.rect(fotoX, fotoY, frameW, frameH);
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text('Sin Foto', fotoX + frameW / 2, fotoY + frameH / 2, { align: 'center' });
        doc.setTextColor(0,0,0);
    }
    // Datos personales en una sola columna (vertical), letra más pequeña y tabulado
    doc.setFontSize(8);
    doc.setTextColor(verde);
    let y = fotoY;
    const colX = fotoX + 120; // a la derecha de la foto
    const labelPad = 120; // separación etiqueta -> valor
    const lineH = 12; // altura de línea compacta

    const nombreCompleto = `${paciente.primer_nombre || ''} ${paciente.segundo_nombre || ''} ${paciente.otros_nombres || ''} ${paciente.primer_apellido || ''} ${paciente.segundo_apellido || ''} ${paciente.apellido_casada || ''}`.replace(/ +/g, ' ').trim();

    const printPair = (label, value, boldLabel = false) => {
        doc.setTextColor(verde);
        if (boldLabel) doc.setFont(undefined, 'bold');
        doc.text(label, colX, y);
        if (boldLabel) doc.setFont(undefined, 'normal');
        doc.setTextColor(0,0,0);
        doc.text(String(value ?? ''), colX + labelPad, y);
        y += lineH;
    };

    printPair('Nombre:', nombreCompleto, true);
    printPair('No. Afiliación:', `${paciente.no_afiliacion || ''}`, true);
    printPair('DPI:', `${paciente.dpi || ''}`, true);
    printPair('Fecha Nacimiento:', `${formatearFecha(paciente.fecha_nacimiento) || ''}`, true);
    printPair('Edad:', `${calcularEdad(paciente.fecha_nacimiento)}`, true);
    printPair('Sexo:', `${paciente.sexo || ''}`, true);
    printPair('Fecha Ingreso:', `${formatearFecha(paciente.fecha_ingreso) || ''}`, true);
    printPair('Estancia Programa:', `${calcularEstanciaRango(paciente.fecha_ingreso)}` , true);
    printPair('Jornada:', `${paciente.jornada_descripcion || ''}`, true);
    printPair('Sesiones Autorizadas:', `${paciente.sesiones_autorizadas_mes || ''}`, true);
    printPair('Dirección:', `${paciente.direccion || ''}`, true);

    // Observaciones removidas del reporte
    const afterColsY = y + 2;

    // Secciones con soporte multi-página
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftX = 40;
    const rightX = pageWidth - 40;
    let yCursor = Math.max(afterColsY + 30, 280);

    // Encabezado/pie para páginas adicionales
    const drawPageHeader = () => {
        if (logoImg) {
            const logoW = 90, logoH = 70; // respeta el ajuste actual
            const logoX = 40, logoY = 30;
            doc.addImage(logoImg, 'PNG', logoX, logoY, logoW, logoH, undefined, 'FAST');
        }
        doc.setFont(undefined, 'bold');
        doc.setFontSize(24);
        doc.setTextColor(verde);
        doc.text('Reporte de Paciente', pageWidth / 2, 70, { align: 'center' });
        // QR en la esquina superior derecha del encabezado (todas las páginas)
        if (qrImgData) {
            const qrSize = 60;
            const qrX = pageWidth - 40 - qrSize; // margen derecho 40
            const qrY = 25; // cerca del borde superior
            doc.addImage(qrImgData, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');
        }
        doc.setFont(undefined, 'normal');
        doc.setDrawColor(verde);
        doc.setLineWidth(1.6);
        doc.line(40, 95, pageWidth - 40, 95);
    };
    const drawPageFooter = () => {
        // No-op: el pie de página paginado se dibuja al final para todas las páginas
    };
    const addPage = () => {
        // cerrar la página actual con pie
        drawPageFooter();
        doc.addPage();
        drawPageHeader();
        yCursor = 110;
    };

    // Utilidad para asegurar espacio, si no cabe, nueva página
    const ensureSpace = (needed) => {
        if (yCursor + needed <= pageHeight - 60) return true;
        addPage();
        return true;
    };

    const drawSectionTitle = (title) => {
        ensureSpace(30);
        // Barra verde del ancho de la tabla
        doc.setFontSize(11);
        const padX = 8;
        const th = 16;
        const tableWidth = rightX - leftX;
        doc.setFillColor(45, 106, 79); // verde
        doc.setDrawColor(45, 106, 79);
        doc.rect(leftX, yCursor - (th - 6), tableWidth, th, 'F');
        doc.setTextColor(255,255,255);
        doc.text(title, leftX + padX, yCursor + 2);
        // subrayado fino
        doc.setDrawColor(209, 250, 229);
        doc.setLineWidth(0.6);
        doc.line(leftX, yCursor + 8, rightX, yCursor + 8);
        yCursor += 12;
        doc.setFontSize(8.5);
        doc.setTextColor(0,0,0);
        return true;
    };

    const endSection = () => { ensureSpace(44); yCursor += 44; };

    // Tabla con encabezado, cebra y bordes por celda
    const drawTable = (title, headers, rows, aligns = [], options = {}) => {
        const { skipEndSpacing = false } = options;
        const tableWidth = rightX - leftX;
        const colCount = headers.length;
        const colWidth = tableWidth / colCount;
        const headerH = 14;
        const rowH = 12;
        const needed = 30 /*title*/ + headerH + 12;
        ensureSpace(needed);

        // Título
        if (!drawSectionTitle(title)) return false;

        // Encabezado
        doc.setFillColor(241, 245, 249); // bg header
        doc.setDrawColor(203, 213, 225);
        doc.rect(leftX, yCursor, tableWidth, headerH, 'F');
        doc.setFont(undefined, 'bold');
        headers.forEach((h, i) => {
            const cellX = leftX + (i * colWidth);
            const text = String(h);
            const tw = doc.getTextWidth(text);
            const textX = cellX + (colWidth - tw) / 2; // centrar encabezado
            const textY = yCursor + headerH - 4;
            doc.text(text, textX, textY);
        });
        // borde superior
        doc.rect(leftX, yCursor, tableWidth, headerH);
        doc.setFont(undefined, 'normal');
        yCursor += headerH;

        // Filas
        doc.setFontSize(8);
        rows.forEach((r, idx) => {
            // zebra
            if (yCursor + rowH > pageHeight - 60) {
                addPage();
                // repetir encabezado de sección como continuación
                drawSectionTitle(`${title} (cont.)`);
                // repetir encabezado de tabla (centrado)
                doc.setFillColor(241, 245, 249);
                doc.setDrawColor(203, 213, 225);
                doc.rect(leftX, yCursor, tableWidth, headerH, 'F');
                doc.setFont(undefined, 'bold');
                headers.forEach((h, i) => {
                    const cellX = leftX + (i * colWidth);
                    const text = String(h);
                    const tw = doc.getTextWidth(text);
                    const textX = cellX + (colWidth - tw) / 2; // centrar encabezado
                    const textY = yCursor + headerH - 4;
                    doc.text(text, textX, textY);
                });
                doc.rect(leftX, yCursor, tableWidth, headerH);
                doc.setFont(undefined, 'normal');
                yCursor += headerH;
                doc.setFontSize(8);
            }
            const rowY = yCursor;
            if (idx % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(leftX, rowY, tableWidth, rowH, 'F');
            }
            // celdas y textos
            r.forEach((cell, i) => {
                const cellX = leftX + (i * colWidth);
                const text = String(cell ?? '');
                const pad = 4;
                let textX = cellX + pad;
                if (aligns[i] === 'center') {
                    const tw = doc.getTextWidth(text);
                    textX = cellX + (colWidth - tw) / 2;
                } else if (aligns[i] === 'right') {
                    const tw = doc.getTextWidth(text);
                    textX = cellX + colWidth - tw - pad;
                }
                const textY = rowY + rowH - 4;
                doc.text(text, textX, textY);
                // borde de celda
                doc.setDrawColor(226, 232, 240);
                doc.rect(cellX, rowY, colWidth, rowH);
            });
            yCursor += rowH;
        });

        if (!skipEndSpacing) endSection();
        return true;
    };

    // Turnos: Últimos 5 por fecha, mostrando ID, Clínica y Fecha
    try {
        const sortedTurnos = (turnos || []).slice().sort((a, b) => {
            const da = a.fecha_turno ? new Date(a.fecha_turno).getTime() : 0;
            const db = b.fecha_turno ? new Date(b.fecha_turno).getTime() : 0;
            return db - da; // descendente
        });
        const turnosRows = sortedTurnos.slice(0, 5).map(t => [
            t.id_turno_cod || t.id_turno || '',
            t.nombre_clinica || '',
            formatearFecha(t.fecha_turno)
        ]);
        if (turnosRows.length) drawTable('Turnos', ['ID','Clínica','Fecha'], turnosRows, ['center','center','center']);
    } catch { /* se omite este elemento del PDF */ }

    // Faltistas: Últimos 5 por fecha, mostrando Fecha Falta, Clínica y Motivo
    try {
        const sortedFaltas = (faltistas || []).slice().sort((a, b) => {
            const da = a.fechafalta || a.fecha_falta || a.fecha || '';
            const db = b.fechafalta || b.fecha_falta || b.fecha || '';
            const ta = da ? new Date(da).getTime() : 0;
            const tb = db ? new Date(db).getTime() : 0;
            return tb - ta; // descendente
        });
        const faltasRows = sortedFaltas.slice(0, 5).map(f => [
            formatearFecha(f.fechafalta || f.fecha_falta),
            f.clinica || f.nombre_clinica || f.id_clinica || '',
            f.motivo_falta || f.Motivo_falta || f.motivofalta || ''
        ]);
        if (faltasRows.length) drawTable('Faltistas', ['Fecha Falta','Clínica','Motivo'], faltasRows, ['center','center','left']);
    } catch { /* se omite este elemento del PDF */ }

    // Formularios: Últimos 5 por fecha (fin o inicio), mostrando Número, Sesiones Autorizadas y Periodo
    try {
        const sortedForms = (formularios || []).slice().sort((a, b) => {
            const da = a.fin_prest_servicios || a.inicio_prest_servicios || '';
            const db = b.fin_prest_servicios || b.inicio_prest_servicios || '';
            const ta = da ? new Date(da).getTime() : 0;
            const tb = db ? new Date(db).getTime() : 0;
            return tb - ta; // descendente
        });
        const formRows = sortedForms.slice(0, 5).map(fm => [
            fm.numero_formulario || '',
            fm.sesiones_autorizadas_mes ?? '',
            `${formatearFecha(fm.inicio_prest_servicios) || ''} - ${formatearFecha(fm.fin_prest_servicios) || ''}`
        ]);
        if (formRows.length) drawTable('Formularios', ['Número','Autorizadas','Periodo'], formRows, ['center','center','center']);
    } catch { /* se omite este elemento del PDF */ }

    // Referencias: Últimos 3 por fecha
    try {
        const refSorted = (referencias || []).slice().sort((a, b) => {
            const da = a.fecha_referencia ? new Date(a.fecha_referencia).getTime() : (a.fecha_creacion ? new Date(a.fecha_creacion).getTime() : 0);
            const db = b.fecha_referencia ? new Date(b.fecha_referencia).getTime() : (b.fecha_creacion ? new Date(b.fecha_creacion).getTime() : 0);
            return db - da;
        });
        const refRows = refSorted.slice(0, 5).map(r => [
            r.id_referencia || '',
            formatearFecha(r.fecha_referencia),
            r.especialidad_referencia || '',
            r.motivo_traslado || '',
            r.nombre_medico || r.id_medico || ''
        ]);
        if (refRows.length) drawTable('Referencias', ['ID','Fecha','Especialidad','Motivo','Médico'], refRows, ['center','center','center','center','center']);
    } catch { /* se omite este elemento del PDF */ }

    // Nutrición (unificada): mostrar solamente el último registro como pares Campo/Valor
    try {
        if (Array.isArray(nutricion) && nutricion.length > 0) {
            const latestNut = nutricion[0];
            const nutRows = [
                ['ID Informe', latestNut.id_informe || ''],
                ['Fecha', formatearFecha(latestNut.fecha_creacion)],
                ['Usuario', latestNut.usuario_creacion || ''],
                ['Motivo', latestNut.motivo_consulta || ''],
                ['Estado Nutricional', estadoNutricional(latestNut)],
                ['IMC', latestNut.imc ?? ''],
                ['Altura (cm)', latestNut.altura_cm ?? ''],
                ['Peso (kg)', latestNut.peso_kg ?? ''],
                ['Observaciones', latestNut.observaciones || ''],
            ].filter(r => String(r[1]) !== '');
            if (nutRows.length) drawTable('Nutrición', ['Campo','Valor'], nutRows, ['center','left']);
        }
    } catch { /* se omite este elemento del PDF */ }

    // Psicología (unificada): mostrar solamente el último registro como pares Campo/Valor (sin KDQOL)
    try {
        const psiSorted = (psicologia || []).slice().sort((a,b) => {
            const fa = a.fecha_creacion || a.fecha || a.fecha_informe || '';
            const fb = b.fecha_creacion || b.fecha || b.fecha_informe || '';
            const da = fa ? new Date(fa).getTime() : 0;
            const db = fb ? new Date(fb).getTime() : 0;
            return db - da;
        });
        if (Array.isArray(psiSorted) && psiSorted.length > 0) {
            const latestPsi = psiSorted[0];
            const fechaPsi = latestPsi.fecha_creacion || latestPsi.fecha || latestPsi.fecha_informe || '';
            const psiRows = [
                ['ID Informe', latestPsi.id_informe || ''],
                ['Fecha', formatearFecha(fechaPsi)],
                ['Tipo', latestPsi.tipo_consulta || ''],
                ['Atención', latestPsi.tipo_atencion || ''],
                ['Motivo', latestPsi.motivo_consulta || ''],
                ['Pronóstico', latestPsi.pronostico || ''],
                ['Observaciones', latestPsi.observaciones || ''],
            ].filter(r => String(r[1]) !== '');
            if (psiRows.length) drawTable('Psicología', ['Campo','Valor'], psiRows, ['center','left']);
        }
    } catch { /* se omite este elemento del PDF */ }

    // KDQOL: último registro (como antes), debajo de Psicología
    try {
        const psiSorted = (psicologia || []).slice().sort((a,b) => {
            const fa = a.fecha_creacion || a.fecha || a.fecha_informe || '';
            const fb = b.fecha_creacion || b.fecha || b.fecha_informe || '';
            const da = fa ? new Date(fa).getTime() : 0;
            const db = fb ? new Date(fb).getTime() : 0;
            return db - da;
        });
        if (Array.isArray(psiSorted) && psiSorted.length > 0) {
            const latestPsi = psiSorted[0];
            let kdqolObj = null;
            try {
                kdqolObj = typeof latestPsi.kdqol === 'string' ? JSON.parse(latestPsi.kdqol) : latestPsi.kdqol;
            } catch { kdqolObj = null; }
            const dims = [
                { key: 'fisico_mental', label: 'Físico y Mental' },
                { key: 'enfermedad_renal', label: 'Enfermedad Renal' },
                { key: 'sintomas_problemas', label: 'Síntomas y Problemas' },
                { key: 'efectos_enfermedad', label: 'Efectos de la Enfermedad' },
                { key: 'vida_diaria', label: 'Vida Diaria' },
                // alternativas posibles en el payload
                { key: 'puntaje_fisico', label: 'Puntaje Físico' },
                { key: 'puntaje_mental', label: 'Puntaje Mental' },
                { key: 'puntaje_sintomas', label: 'Puntaje Síntomas' },
                { key: 'puntaje_carga', label: 'Puntaje Carga' },
                { key: 'puntaje_efectos', label: 'Puntaje Efectos' },
            ];
            const getNum = (v) => {
                const n = typeof v === 'string' ? parseFloat(v) : v;
                return isNaN(n) ? null : n;
            };
            const kdqolRows = [];
            let sum = 0, count = 0;
            const pushDim = (obj) => {
                dims.forEach(d => {
                    const num = getNum(obj?.[d.key]);
                    if (num != null) {
                        kdqolRows.push({ label: d.label, value: num });
                        sum += num;
                        count += 1;
                    }
                });
            };
            if (kdqolObj && typeof kdqolObj === 'object') {
                pushDim(kdqolObj);
            }
            if (!kdqolRows.length) {
                pushDim(latestPsi || {});
            }
            if (kdqolRows.length) {
                // Dibujar tabla KDQOL sin espaciar al final, para colocar la nota inmediatamente debajo
                drawTable('KDQOL', ['Dimensión','Puntaje'], kdqolRows, ['center','center'], { skipEndSpacing: true });
                const promedioVal = count > 0 ? (sum / count) : null;
                if (promedioVal != null) {
                    yCursor += 8; // separacion suficiente para no tapar el borde inferior de la tabla
                    const note = `Nota: Promedio KDQOL: ${promedioVal.toFixed(2)}`;
                    doc.setFont(undefined, 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(0, 0, 0);
                    doc.text(note, leftX, yCursor); // alineado a la izquierda de la tabla
                    yCursor += 12;
                    doc.setFont(undefined, 'normal');
                }
                // Ahora sí cerrar la sección dejando el espacio estándar
                endSection();
            }
        }
    } catch { /* se omite este elemento del PDF */ }

    // Laboratorio: último registro (Fecha, Periodo, Examen) + últimos parámetros del paciente
    try {
        const pickDate = (it) => it.fecha_laboratorio || it.fecha || it.fecha_creacion || '';
        const latest = (laboratorios || []).slice().sort((a,b) => {
            const da = pickDate(a) ? new Date(pickDate(a)).getTime() : 0;
            const db = pickDate(b) ? new Date(pickDate(b)).getTime() : 0;
            return db - da;
        })[0];
        if (latest) {
            // Cargar últimos parámetros del paciente (por parámetro)
            let prevMap = new Map(); // parametro -> { valor, fecha }
            try {
                const afili = latest.no_afiliacion || latest.noafiliacion || '';
                if (afili) {
                    const { data } = await api.get(`/laboratorios/${afili}/parametros/ultimo`);
                    const lista = Array.isArray(data?.data) ? data.data : [];
                    for (const p of lista) {
                        const key = String(p.parametro ?? '').trim();
                        const f = p.fecha_laboratorio || p.fecha_registro || p.fecha_creacion || '';
                        const fechaPrev = formatearFecha(f);
                        const valorPrev = p.valor != null ? String(p.valor) : '';
                        if (key) prevMap.set(key, { valor: valorPrev, fecha: fechaPrev });
                    }
                }
            } catch { /* se omite este elemento del PDF */ }
            // Encabezado breve del último laboratorio
            const miniRows = [[
                formatearFecha(pickDate(latest)),
                latest.periodicidad || '',
                latest.examen_realizado ? 'Sí' : 'No'
            ]];
            drawTable('Último Laboratorio Registrado', ['Fecha','Periodo','Examen'], miniRows, ['center','center','center']);

            // Detalle: últimos parámetros registrados del paciente
            try {
                const prevRows = Array.from(prevMap.entries())
                    .filter(([k, v]) => k && v && (v.valor !== undefined || v.fecha !== undefined))
                    .map(([k, v]) => [k, v.valor || '', v.fecha || ''])
                    .sort((a, b) => a[0].localeCompare(b[0], 'es'));
                if (prevRows.length) {
                    drawTable('Últimos parámetros del paciente', ['Parámetro','Valor','Fecha'], prevRows, ['center','center','center']);
                }
            } catch { /* se omite este elemento del PDF */ }
        }
    } catch { /* se omite este elemento del PDF */ }

    // QR ya se muestra en el encabezado de cada página

    // Pie de página: paginación y fecha de generación en cada página
    try {
        const totalPages = (doc.getNumberOfPages ? doc.getNumberOfPages() : doc.internal.getNumberOfPages());
        const gen = new Date();
        const dd = String(gen.getDate()).padStart(2, '0');
        const mm = String(gen.getMonth() + 1).padStart(2, '0');
        const yyyy = gen.getFullYear();
        const hh = String(gen.getHours()).padStart(2, '0');
        const min = String(gen.getMinutes()).padStart(2, '0');
        const genStr = `${dd}/${mm}/${yyyy} ${hh}:${min}`;

        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            // línea divisoria
            doc.setDrawColor(200);
            doc.setLineWidth(0.5);
            doc.line(40, pageHeight - 50, pageWidth - 40, pageHeight - 50);
            // Fecha (izquierda)
            doc.setFontSize(9);
            doc.setTextColor(80);
            doc.setFont(undefined, 'bold');
            doc.text(`Generado: ${genStr}`, 40, pageHeight - 36);
            // Título del sistema (centro)
            doc.setTextColor(0, 128, 0);
            doc.text('Sistema de Gestión de Pacientes', pageWidth / 2, pageHeight - 36, { align: 'center' });
            // Página (derecha)
            doc.setTextColor(80);
            doc.text(`Página ${p} de ${totalPages}`, pageWidth - 40, pageHeight - 36, { align: 'right' });
            doc.setFont(undefined, 'normal');
        }
    } catch { /* se omite este elemento del PDF */ }

    doc.save(`reporte_paciente_${paciente.no_afiliacion}.pdf`);
}

// Función auxiliar para obtener el logo en base64
async function getLogoBase64() {
    try {
        const response = await fetch(logoClinica);
        const blob = await response.blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

// Función auxiliar para obtener la foto del paciente en base64
async function getFotoPacienteBase64(paciente) {
    if (!paciente) return null;
    try {
        const id = (paciente.no_afiliacion || '').toString().trim();
        let response = null;
        // 1) Intentar endpoint resolutivo por id
        if (id) {
            try { response = await fetch(`/api/foto/${encodeURIComponent(id)}?${Date.now()}`, { cache: 'no-store', headers: encabezadoSesion() }); } catch { /* se omite este elemento del PDF */ }
        }
        // 2) Fallback a filename
        if (!response || !response.ok) {
            const filename = (paciente.url_foto || '').toString().split(/[\\/]/).pop();
            if (!filename) return null;
            response = await fetch(`/api/fotos/${filename}?${Date.now()}`, { cache: 'no-store', headers: encabezadoSesion() });
            if (!response.ok) return null;
        }
        const blob = await response.blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}
