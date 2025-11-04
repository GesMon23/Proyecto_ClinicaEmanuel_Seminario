require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const jwt = require('jsonwebtoken');
const { runWithUser } = require('./src/db');

const nz = (v) => (v === undefined || v === null || v === '' ? null : v);

// Configuración de CORS y JSON body parsing
const allowedOrigins = new Set([
  // prod (HTTP y HTTPS)
  'http://172.235.145.142',
  'https://172.235.145.142',
  'http://clinicaemanuel.com.gt',
  'https://clinicaemanuel.com.gt',

  'http://172.235.145.142:3000',
  'http://clinicaemanuel.com.gt:3000',

  // desarrollo local
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

app.use(cors({
    origin: (origin, callback) => {
        // Permitir tools como curl/postman (sin origin) y los orígenes de la lista
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));

// (Desmontado) Router legacy de actualización masiva para evitar conflicto de rutas
// const updateMasivoPacientesRouter = require('./update-masivo-pacientes');
// Importar router de login/roles centralizado
const backLoginRouter = require('./BackLogin');

const backGestionTurnosRouter = require('./src/controllers/BackGestionTurno');
const backFallecidosReportesRouter = require('./src/controllers/BackFallecidosReportes');
// Importar router de registro de formularios
const backRegistroFormulariosRouter = require('./src/controllers/BackRegistroFormularios');
// Importar router de registro de empleados
const backRegistroEmpleadosRouter = require('./src/controllers/BackRegistroEmpleados');
// Importar router de gestión de empleados (listar/editar/estado)
const backGestionEmpleadosRouter = require('./src/controllers/BackGestionEmpleados');
// Importar router de creación de usuarios (empleados sin usuario, etc.)
const backCreacionUsuariosRouter = require('./src/controllers/BackCreacionUsuarios');
// Importar router de roles por usuario (búsqueda, listar y actualizar roles)
const backRolesUsuariosRouter = require('./src/controllers/BackRolesUsuarios');
// Importar router de psicología
const backPsicologiaRouter = require('./src/controllers/BackPsicologia');
// Importar router de consulta de psicología
const backConsultaPsicologiaRouter = require('./src/controllers/BackConsultaPsicologia');

const backNU = require('./src/controllers/BackNU');
// Importar router de nutrición
const backNutricionRouter = require('./src/controllers/BackNutricion');
// Importar router de consulta de nutrición (historial, filtros)
const backConsultaNutricionRouter = require('./src/controllers/BackConsultaNutricion');
// Importar router de registro de referencias
const backRegistroReferenciasRouter = require('./src/controllers/BackRegistroReferencias');
// Importar router de consulta de referencias
const backConsultaReferenciasRouter = require('./src/controllers/BackConsultaReferencias');
// Importar router de consulta de laboratorios
const backConsultaLaboratoriosRouter = require('./src/controllers/BackConsultaLaboratorios');
// Importar router de catálogos
const backCatalogosRouter = require('./src/controllers/BackCatalogos');
// Importar router de reporte de pacientes
const backPacientesReporteRouter = require('./src/controllers/BackPacientesReporte');
// Importar router de estadísticas resumen
const backEstadisticasResumenRouter = require('./src/controllers/BackEstadisticasResumen');

const backReporteFaltistasRouter = require('./src/controllers/BackReporteFaltistas');

const backNuevoIngresoReportesRouter = require('./src/controllers/BackNuevoIngresoReportes');
// Importar otros routers usados más abajo
// Usar router de consulta de laboratorios
app.use(backConsultaLaboratoriosRouter);
const backActualizacionPacientes = require('./src/controllers/BackActualizacionPacientes');
const backEgresoPacientes = require('./src/controllers/BackEgresoPacientes');
const backReingresoPacientesRouter = require('./src/controllers/BackReingresoPacientes');

const backEgresoReportesRouter = require('./src/controllers/BackEgresoReportes');

// Importar router de consulta de pacientes
const backConsultaPacientesRouter = require('./src/controllers/BackConsultaPacientes');
// Registrar API específica para Registro de Pacientes (endpoints usados por RegistroPacientes.jsx)
const backRegistroPacientesApiRouter = require('./src/controllers/BackRegistroPacientes.api');
// Importar router de registro de laboratorios
const backRegistroLaboratoriosRouter = require('./src/controllers/BackRegistroLaboratorios');

// Pool compartido
const pool = require('./db/pool');

// Asegurarnos de que la carpeta 'fotos' existe y servir estáticos
const fotosDir = path.join(__dirname, 'fotos');
if (!fs.existsSync(fotosDir)) {
    fs.mkdirSync(fotosDir);
}

app.use(backGestionTurnosRouter);

app.use(backConsultaLaboratoriosRouter);

app.use(backPacientesReporteRouter);
app.use(backFallecidosReportesRouter);
app.use(backEstadisticasResumenRouter);
app.use('/fotos', express.static(fotosDir));
// (Desmontado) Usar el router legacy para actualización masiva de pacientes
// app.use(updateMasivoPacientesRouter);
// Usar router de login/roles (centralizado en BackLogin.js)
app.use(backLoginRouter);
// Exponer también bajo prefijo /api para el frontend que usa baseURL '/api'
app.use('/api', backLoginRouter);
// Usar router de registro de formularios
app.use(backRegistroFormulariosRouter);
// Usar router de registro de empleados
app.use(backRegistroEmpleadosRouter);
// Usar router de gestión de empleados (GET/PUT/PATCH)
app.use(backGestionEmpleadosRouter);
// Usar router de creación de usuarios
app.use(backCreacionUsuariosRouter);
// Usar router de roles por usuario
app.use(backRolesUsuariosRouter);
// Usar router de psicología
app.use('/api/psicologia', backPsicologiaRouter);
// Usar router de consulta de psicología (endpoints GET de historial)
app.use('/api/psicologia', backConsultaPsicologiaRouter);

app.use(backNU);
// Usar router de nutrición
app.use('/api/nutricion', backNutricionRouter);
// Usar router de consulta de nutrición
app.use('/api/nutricion', backConsultaNutricionRouter);
// Usar router de registro de referencias
app.use(backRegistroReferenciasRouter);
// Usar router de Nuevo Ingreso Reportes (expone /api/nuevoingreso y /api/nuevoingreso/excel)
app.use(backNuevoIngresoReportesRouter);
// Usar router de consulta de referencias
app.use(backConsultaReferenciasRouter);
// Usar router de catálogos
app.use(backCatalogosRouter);
// Otros routers existentes
app.use(backActualizacionPacientes);
app.use('/api',backEgresoPacientes);
app.use('/api/reingreso', backReingresoPacientesRouter);
// Usar router de consulta de pacientes
app.use(backConsultaPacientesRouter);
app.use(backRegistroPacientesApiRouter);
// Usar router de registro/listado de laboratorios
app.use('/laboratorios', backRegistroLaboratoriosRouter);


app.use(backReporteFaltistasRouter);

app.use(backEgresoReportesRouter);

app.post('/upload-foto/:noAfiliacion', async (req, res) => {
    const { noAfiliacion } = req.params;
    const { imagenBase64 } = req.body;
    if (!imagenBase64) {
        return res.status(400).json({ detail: 'No se recibió la imagen.' });
    }
    try {
        // Decodificar base64
        const matches = imagenBase64.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
        if (!matches) {
            return res.status(400).json({ detail: 'Formato de imagen inválido.' });
        }
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const data = matches[2];
        const buffer = Buffer.from(data, 'base64');
        const filename = `${noAfiliacion}.${ext}`;
        const filePath = path.join(fotosDir, filename);
        // Guardar/reemplazar archivo
        fs.writeFileSync(filePath, buffer);

        // Actualizar urlfoto en la base de datos
        await pool.query('UPDATE public.tbl_pacientes SET url_foto = $1 WHERE no_afiliacion = $2', [filename, noAfiliacion]);
        res.json({ success: true, url: `/fotos/${filename}` });
    } catch (err) {
        console.error('Error al subir foto:', err);
        res.status(500).json({ detail: 'Error al guardar la foto.' });
    }
});

// Configuración de la base de datos
const ExcelJS = require("exceljs");


const definirCarnetPaciente = async (pacienteData, fotoPath, carnetPath) => {
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const path = require('path');
    const QRCode = require('qrcode');
    // Tamaño A4 vertical
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const writeStream = fs.createWriteStream(carnetPath);
    doc.pipe(writeStream);

    // Logo en la esquina superior izquierda
    const logoPath = path.join(__dirname, 'assets', 'img', 'logoClinica.png');
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 30, 25, { width: 60 });
    }
    // Título alineado a la izquierda
    doc.font('Helvetica-Bold').fontSize(22).fillColor('black').text('Carné de Paciente', 110, 35, { align: 'left' });

    // Foto del paciente en la esquina superior derecha
    if (fotoPath && fs.existsSync(fotoPath)) {
        // Marco blanco
        doc.rect(430, 25, 90, 70).fillAndStroke('white', '#bbb');
        doc.image(fotoPath, 432, 27, { fit: [86, 66], align: 'center', valign: 'center' });
    } else {
        doc.rect(430, 25, 90, 70).fillAndStroke('white', '#bbb');
        doc.font('Helvetica').fontSize(12).fillColor('#888').text('Sin Foto', 450, 60);
    }

    // QR debajo de la foto
    const qrUrl = `http://localhost:3000/layout/consulta-pacientes?noafiliacion=${encodeURIComponent(pacienteData.noafiliacion)}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 70 });
    doc.image(Buffer.from(qrDataUrl.split(",")[1], 'base64'), 450, 105, { width: 50, height: 50 });
    doc.font('Helvetica').fontSize(8).fillColor('black').text('Escanee para ver\ninformación', 445, 158, { width: 65, align: 'center' });

    // Bloque izquierdo: datos personales
    let datosY = 100;
    const nombreCompleto = `${[pacienteData.primernombre, pacienteData.segundonombre, pacienteData.otrosnombres].filter(Boolean).join(' ')}`.replace(/ +/g, ' ').trim();
    const apellidoCompleto = `${[pacienteData.primerapellido, pacienteData.segundoapellido, pacienteData.apellidocasada].filter(Boolean).join(' ')}`.replace(/ +/g, ' ').trim();
    doc.font('Helvetica').fontSize(11).fillColor('black');
    doc.text('Nombres:', 30, datosY, { continued: true });
    doc.font('Helvetica-Bold').text(nombreCompleto, { continued: false });
    datosY += 15;
    doc.font('Helvetica').text('Apellidos:', 30, datosY, { continued: true });
    doc.font('Helvetica-Bold').text(apellidoCompleto, { continued: false });
    datosY += 15;
    doc.font('Helvetica').text('Dirección:', 30, datosY, { continued: true });
    doc.font('Helvetica-Bold').text(`${pacienteData.direccion || ''}`, { continued: false });
    datosY += 15;
    doc.font('Helvetica').text('Fecha Nacimiento:', 30, datosY, { continued: true });
    doc.font('Helvetica-Bold').text(`${formatFecha(pacienteData.fechanacimiento)}`, { continued: false });
    datosY += 15;
    doc.font('Helvetica').text('Fecha Ingreso:', 30, datosY, { continued: true });
    doc.font('Helvetica-Bold').text(`${formatFecha(pacienteData.fechaingreso)}`, { continued: false });
    datosY += 15;
    doc.font('Helvetica').text('No. Afiliación:', 30, datosY, { continued: true });
    doc.font('Helvetica-Bold').text(`${pacienteData.noafiliacion || ''}`, { continued: false });
    datosY += 15;
    doc.font('Helvetica').text('DPI:', 30, datosY, { continued: true });
    doc.font('Helvetica-Bold').text(`${pacienteData.dpi || ''}`, { continued: false });
    datosY += 15;
    doc.font('Helvetica').text('Sexo:', 30, datosY, { continued: true });
    doc.font('Helvetica-Bold').text(`${pacienteData.sexo || ''}`, { continued: false });
    datosY += 20;
    // Fin de bloque de datos personales
    function formatFecha(fecha) {
        if (!fecha) return '';
        const d = new Date(fecha);
        if (isNaN(d)) return fecha;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }


    // Línea divisoria
    doc.moveTo(30, datosY + 18).lineTo(540, datosY + 18).lineWidth(1).strokeColor('black').stroke();

    // Tabla de firmas
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
    // Líneas horizontales
    for (let i = 0; i <= numRows + 1; i++) {
        const y = tableTop + i * rowHeight;
        doc.moveTo(colX[0], y).lineTo(colX[4], y).strokeColor('black').stroke();
    }
    // Líneas verticales
    for (let i = 0; i < colX.length; i++) {
        doc.moveTo(colX[i], tableTop).lineTo(colX[i], tableTop + (numRows + 1) * rowHeight).strokeColor('black').stroke();
    }



    doc.end();
    return new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
};

// ---------------------- Helpers de foto ----------------------
const resolveFotoPath = (paciente, noafiliacion) => {
    const baseDir = path.join(__dirname, 'fotos');
    const candidates = [];

    // 1) Si hay valor en DB, normalizarlo a un filename local
    if (paciente?.urlfoto) {
        let uf = String(paciente.urlfoto).trim();

        // URL completa -> tomar basename (/fotos/xxxx.jpg)
        if (/^https?:\/\//i.test(uf)) {
            try {
                const u = new URL(uf);
                uf = decodeURIComponent(path.basename(u.pathname));
            } catch { }
        } else {
            // Quitar / iniciales y el prefijo "fotos/"
            uf = uf.replace(/^\/+/, '').replace(/^fotos\//i, '');
        }

        if (uf) candidates.push(path.join(baseDir, uf));
    }

    // 2) Por número de afiliación con varias extensiones y mayúsculas/minúsculas
    const exts = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
    for (const ext of exts) {
        candidates.push(path.join(baseDir, `${noafiliacion}${ext}`));
    }

    // 3) Revisión final del directorio por si la extensión es rara
    try {
        const files = fs.readdirSync(baseDir);
        const hit = files.find(f => path.parse(f).name.toLowerCase() === String(noafiliacion).toLowerCase());
        if (hit) candidates.push(path.join(baseDir, hit));
    } catch { }

    // Devolver el primer candidato existente
    for (const c of candidates) {
        if (c && fs.existsSync(c)) return c;
    }
    return null;
};

const shouldRegenerateCarnet = (carnetPath, fotoPath) => {
    const pdfExists = fs.existsSync(carnetPath);
    if (!pdfExists) return true;
    if (fotoPath && fs.existsSync(fotoPath)) {
        try {
            const fotoM = fs.statSync(fotoPath).mtimeMs;
            const pdfM = fs.statSync(carnetPath).mtimeMs;
            return fotoM >= pdfM; // si la foto es igual o más nueva, regenerar
        } catch { return true; }
    }
    // Si no hay foto, no regenerar innecesariamente
    return false;
};

// Endpoint para obtener paciente por número de afiliación con descripciones de llaves foráneas
app.get('/pacientes/:noafiliacion', async (req, res) => {
    try {
        const query = `
                SELECT * FROM tbl_pacientes WHERE no_afiliacion = $1
            `;
        const result = await pool.query(query, [req.params.noafiliacion]);
        if (!result.rows.length) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error en /pacientes/:noafiliacion:', error);
        res.status(500).json({ error: 'Error al obtener paciente.', detalle: error.message });
    }
});
// Descargar carné PDF por número de afiliación (se regenera si la foto es más nueva)
app.get('/carnet/:noafiliacion', async (req, res) => {
    try {
        const noafiliacion = req.params.noafiliacion;

        // Carpeta de carnets
        const carnetDir = path.join(__dirname, 'carnets');
        if (!fs.existsSync(carnetDir)) fs.mkdirSync(carnetDir);
        const carnetPath = path.join(carnetDir, `${noafiliacion}_carnet.pdf`);

        // Traer datos del paciente
        const { rows } = await pool.query(`
        SELECT
            no_afiliacion  AS noafiliacion,
            dpi,
            no_paciente_proveedor AS nopacienteproveedor,
            primer_nombre   AS primernombre,
            segundo_nombre  AS segundonombre,
            otros_nombres   AS otrosnombres,
            primer_apellido AS primerapellido,
            segundo_apellido AS segundoapellido,
            apellido_casada AS apellidocasada,
            fecha_nacimiento AS fechanacimiento,
            fecha_ingreso    AS fechaingreso,
            sexo,
            direccion,
            url_foto AS urlfoto
        FROM public.tbl_pacientes
        WHERE no_afiliacion = $1
        `, [noafiliacion]);
        if (!rows.length) return res.status(404).json({ error: 'Paciente no encontrado.' });
        const paciente = rows[0];

        // Resolver ruta real de la foto (soporta /fotos/xxx.jpg, http://.../fotos/xxx.jpg, etc.)
        const fotoPath = resolveFotoPath(paciente, noafiliacion);

        // ¿Generar/regenerar?
        const mustRegenerate = shouldRegenerateCarnet(carnetPath, fotoPath);
        if (mustRegenerate) {
            await definirCarnetPaciente(paciente, fotoPath, carnetPath);
        }

        // Enviar el PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${noafiliacion}_carnet.pdf"`);
        fs.createReadStream(carnetPath)
            .on('error', (e) => res.status(500).json({ error: 'No se pudo leer el carné', detalle: e.message }))
            .pipe(res);
    } catch (error) {
        console.error('Error en GET /carnet/:noafiliacion:', error);
        res.status(500).json({ error: 'Error al descargar o generar el carné.', detalle: error.message });
    }
});
// Obtener clínicas
app.get('/clinicas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tbl_clinica');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});
// Obtener paciente por número de afiliación
app.get('/pacientes/:noAfiliacion', async (req, res) => {
    try {
        const { noAfiliacion } = req.params;
        const result = await pool.query(
            'SELECT * FROM tbl_pacientes WHERE no_Afiliacion = $1',
            [noAfiliacion]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ detail: "Paciente no encontrado" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});
// Endpoint para subir foto de paciente
app.post('/upload-photo', async (req, res) => {
    try {
        const { noAfiliacion, photo } = req.body;
        if (!noAfiliacion || !photo) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos' });
        }

        // 1) Verificar paciente
        const pacienteExiste = await pool.query(
            'SELECT 1 FROM public.tbl_pacientes WHERE no_afiliacion = $1',
            [noAfiliacion]
        );
        if (pacienteExiste.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
        }

        // 2) Normalizar base64 (acepta "data:image/..." o el base64 pelado)
        const base64 = photo.startsWith('data:image')
            ? photo.split(',')[1]
            : photo;
        if (!base64) return res.status(400).json({ success: false, message: 'Imagen vacía' });

        // 3) Guardar archivo
        const fileName = `${noAfiliacion}.jpg`;
        const filePath = path.join(fotosDir, fileName);
        fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));

        // 4) Actualizar DB
        await pool.query(
            'UPDATE public.tbl_pacientes SET url_foto = $1 WHERE no_afiliacion = $2',
            [fileName, noAfiliacion]
        );

        res.json({ success: true, url: `/fotos/${fileName}` });
    } catch (error) {
        console.error('Error al guardar la foto:', error);
        res.status(500).json({ success: false, message: 'Error interno al guardar la foto' });
    }
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
// Endpoint para generar y descargar carné PDF por número de afiliación
app.post('/definirCarnetPaciente', async (req, res) => {
    try {
        const pacienteData = req.body;
        const noAfiliacion = pacienteData.noafiliacion;
        const path = require('path');
        const fs = require('fs');
        // Ruta de la foto y del PDF
        // Usa el helper para localizar la foto con cualquier extensión o si viene como URL:
        const fotoPath = resolveFotoPath(
            { urlfoto: pacienteData?.urlfoto ?? pacienteData?.url_foto ?? null },
            noAfiliacion
        );
        const carnetDir = path.join(__dirname, 'carnets');
        if (!fs.existsSync(carnetDir)) {
            fs.mkdirSync(carnetDir);
        }
        const carnetPath = path.join(carnetDir, `${noAfiliacion}_carnet.pdf`);
        await definirCarnetPaciente(pacienteData, fotoPath, carnetPath);
        // Envía el PDF como respuesta
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${noAfiliacion}_carnet.pdf"`);
        res.status(200).sendFile(carnetPath);
    } catch (error) {
        console.error('Error al generar carné:', error);
        res.status(500).json({ error: 'Error al generar el carné.' });
    }
});


app.use(backCatalogosRouter);