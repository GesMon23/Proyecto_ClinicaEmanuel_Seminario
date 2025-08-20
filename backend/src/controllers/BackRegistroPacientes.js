// Configuración de la base de datos
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
    host: 'localhost',
    database: 'db_clinicaemanuel',
    user: 'postgres',
    password: 'root'
});


app.get('/departamentos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM FN_mostrar_departamentos()');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener departamentos.' });
    }
});

app.get('/accesos-vasculares', async (req, res) => {
    try {
        const result = await pool.query('SELECT * from FN_mostrar_accesos_vascular()');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener accesos vasculares.' });
    }
});

app.get('/jornadas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * from FN_mostrar_jornadas()');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener jornadas.' });
    }
});

// Registrar nuevo paciente - Versión corregida
app.post('/pacientes', async (req, res) => {
    const client = await pool.connect();
    try {
        const { photo, ...pacienteData } = req.body;
        console.log('Datos recibidos:', pacienteData);

        // === Validación de campos obligatorios ===
        const requiredFields = [
            'noafiliacion', 'dpi', 'nopacienteproveedor', 'primernombre',
            'primerapellido', 'fechanacimiento', 'sexo', 'direccion',
            'fechaingreso', 'iddepartamento', 'idacceso',
            'idjornada', 'usuario_creacion'
        ];

        const missing = requiredFields.filter(f => !pacienteData[f]);
        if (missing.length > 0) {
            return res.status(400).json({ error: `Faltan campos: ${missing.join(', ')}` });
        }

        // === Procesar foto si viene en base64 ===
        let urlFoto = null;
        if (photo) {
            let base64Data, ext = 'jpg';
            if (photo.startsWith('data:image/png')) {
                base64Data = photo.replace(/^data:image\/png;base64,/, '');
                ext = 'png';
            } else {
                base64Data = photo.replace(/^data:image\/jpeg;base64,/, '');
            }
            const fileName = `${pacienteData.noafiliacion}.${ext}`;
            const filePath = path.join(__dirname, 'fotos', fileName);
            await fs.promises.writeFile(filePath, base64Data, 'base64');
            urlFoto = fileName;
        }

        // Forzar estado fijo a 1
        pacienteData.idestado = 1;

        await client.query('BEGIN');

        // === Verificación de claves foráneas ===
        const foreignKeyChecks = [
            { table: 'tbl_departamentos', field: 'iddepartamento', value: pacienteData.iddepartamento },
            { table: 'tbl_estadospaciente', field: 'idestado', value: pacienteData.idestado },
            { table: 'tbl_accesovascular', field: 'idacceso', value: pacienteData.idacceso },
            { table: 'tbl_jornadas', field: 'idjornada', value: pacienteData.idjornada }
        ];

        for (const check of foreignKeyChecks) {
            const exists = await client.query(
                `SELECT 1 FROM ${check.table} WHERE ${check.field} = $1`,
                [check.value]
            );
            if (exists.rows.length === 0) {
                throw new Error(`No existe registro en ${check.table} con ${check.field} = ${check.value}`);
            }
        }

        // === Llamar al Stored Procedure ===
        await client.query(
            `CALL sp_insertar_paciente(
                $1,$2,$3,$4,$5,$6,$7,$8,$9,
                $10,$11,$12,$13,$14,$15,$16,
                $17,$18,$19,$20
            )`,
            [
                pacienteData.noafiliacion,
                pacienteData.dpi,
                pacienteData.nopacienteproveedor,
                pacienteData.primernombre,
                pacienteData.segundonombre || null,
                pacienteData.otrosnombres || null,
                pacienteData.primerapellido,
                pacienteData.segundoapellido || null,
                pacienteData.apellidocasada || null,
                pacienteData.fechanacimiento,
                pacienteData.sexo,
                pacienteData.direccion,
                pacienteData.fechaingreso,
                pacienteData.iddepartamento,
                pacienteData.idacceso,
                pacienteData.numeroformulario || null,
                pacienteData.idjornada,
                pacienteData.sesionesautorizadasmes || null,
                urlFoto,
                pacienteData.usuario_creacion
            ]
        );

        // === Generar carné PDF ===
        const carnetsDir = path.join(__dirname, 'carnets');
        if (!fs.existsSync(carnetsDir)) {
            fs.mkdirSync(carnetsDir);
        }
        const carnetFileName = `${pacienteData.noafiliacion}_carnet.pdf`;
        const carnetPath = path.join(carnetsDir, carnetFileName);
        const doc = new PDFDocument({ size: [350, 260] });
        const writeStream = fs.createWriteStream(carnetPath);
        doc.pipe(writeStream);

        // Logo clínica
        const logoPath = path.join(__dirname, 'assets', 'img', 'logoClinica.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 15, 10, { width: 60 });
        }

        // Título
        doc.fontSize(16).text('Carné de Paciente', 90, 15, { align: 'left', bold: true });
        doc.moveDown();

        // Foto paciente
        if (urlFoto && fs.existsSync(path.join(__dirname, 'fotos', urlFoto))) {
            doc.image(path.join(__dirname, 'fotos', urlFoto), 260, 15, { width: 70, height: 70 });
        } else {
            doc.rect(260, 15, 70, 70).stroke();
            doc.fontSize(10).text('Sin Foto', 265, 50);
        }

        // Datos
        doc.fontSize(10).text(`Nombres: ${pacienteData.primernombre} ${pacienteData.segundonombre || ''} ${pacienteData.otrosnombres || ''}`, 15, 90);
        doc.text(`Apellidos: ${pacienteData.primerapellido} ${pacienteData.segundoapellido || ''} ${pacienteData.apellidocasada || ''}`, 15, 105);
        doc.text(`No. Afiliación: ${pacienteData.noafiliacion}`, 15, 120);
        doc.text(`DPI: ${pacienteData.dpi}`, 15, 135);
        doc.text(`Dirección: ${pacienteData.direccion}`, 15, 150, { width: 220 });
        doc.text(`Fecha Nacimiento: ${pacienteData.fechanacimiento}`, 15, 165);
        doc.text(`Sexo: ${pacienteData.sexo}`, 15, 180);
        doc.text(`Fecha Ingreso: ${pacienteData.fechaingreso}`, 15, 195);

        doc.end();

        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        await client.query('COMMIT');

        res.status(201).json({ 
            success: true, 
            message: 'Paciente registrado exitosamente', 
            carnet: `/carnets/${carnetFileName}` 
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en registro de paciente:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar paciente',
            detail: error.message
        });
    } finally {
        client.release();
    }
});



// Endpoint para descargar carné PDF por número de afiliación (forzar regeneración)
app.get('/carnet/forzar/:noafiliacion', async (req, res) => {
    try {
        const noafiliacion = req.params.noafiliacion;
        // Obtener datos del paciente desde la base de datos
        const result = await pool.query('SELECT * FROM tbl_pacientes WHERE noafiliacion = $1', [noafiliacion]);
        if (!result.rows.length) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }
        const paciente = result.rows[0];
        // Obtener ruta de la foto si existe
        let fotoPath = null;
        if (paciente.urlfoto) {
            // Si la ruta es absoluta y existe, la usamos. Si no, buscamos en la carpeta fotos
            if (fs.existsSync(paciente.urlfoto)) {
                fotoPath = paciente.urlfoto;
            } else {
                const fotoEnFotos = path.join(__dirname, 'fotos', paciente.urlfoto);
                if (fs.existsSync(fotoEnFotos)) {
                    fotoPath = fotoEnFotos;
                } else {
                    // Buscar por nombre estándar (jpg/png)
                    const jpgPath = path.join(__dirname, 'fotos', `${noafiliacion}.jpg`);
                    const pngPath = path.join(__dirname, 'fotos', `${noafiliacion}.png`);
                    if (fs.existsSync(jpgPath)) {
                        fotoPath = jpgPath;
                    } else if (fs.existsSync(pngPath)) {
                        fotoPath = pngPath;
                    }
                }
            }
        } else {
            // Buscar por nombre estándar (jpg/png)
            const jpgPath = path.join(__dirname, 'fotos', `${noafiliacion}.jpg`);
            const pngPath = path.join(__dirname, 'fotos', `${noafiliacion}.png`);
            if (fs.existsSync(jpgPath)) {
                fotoPath = jpgPath;
            } else if (fs.existsSync(pngPath)) {
                fotoPath = pngPath;
            }
        }
        // Preparar datos para el carné (solo los campos requeridos)
        const pacienteData = {
            primernombre: paciente.primernombre,
            segundonombre: paciente.segundonombre,
            otrosnombres: paciente.otrosnombres,
            primerapellido: paciente.primerapellido,
            segundoapellido: paciente.segundoapellido,
            apellidocasada: paciente.apellidocasada,
            direccion: paciente.direccion,
            fechanacimiento: paciente.fechanacimiento,
            fechaingreso: paciente.fechaingreso,
            noafiliacion: paciente.noafiliacion,
            dpi: paciente.dpi,
            sexo: paciente.sexo
        };
        // Generar un archivo temporal
        const carnetPath = path.join(__dirname, 'tmp', `carnet_${noafiliacion}_${Date.now()}.pdf`);
        if (!fs.existsSync(path.join(__dirname, 'tmp'))) {
            fs.mkdirSync(path.join(__dirname, 'tmp'));
        }
        await definirCarnetPaciente(pacienteData, fotoPath, carnetPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="carnet_${noafiliacion}.pdf"`);
        const stream = fs.createReadStream(carnetPath);
        stream.pipe(res);
        stream.on('end', () => {
            fs.unlink(carnetPath, () => { });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al generar el carné.', detalle: error.message });
    }
});










// Endpoint para obtener medicos
app.get('/medicos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * from FN_mostrar_medicos()');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});


// Endpoint para registrar una nueva referencia
app.post('/api/referencias', async (req, res) => {
    const { noafiliacion, fechareferencia, motivotraslado, idmedico, especialidadreferencia } = req.body;
    if (!noafiliacion || !fechareferencia || !motivotraslado || !idmedico || !especialidadreferencia) {
        return res.status(400).json({ detail: 'Todos los campos son obligatorios.' });
    }
    try {
        // Obtener el último idreferencia
        const result = await pool.query('SELECT MAX(idreferencia) as maxid FROM tbl_referencias');
        const lastId = result.rows[0].maxid || 0;
        const newId = lastId + 1;
        await pool.query(
            `INSERT INTO tbl_referencias (idreferencia, noafiliacion, fechareferencia, motivotraslado, idmedico, especialidadreferencia)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [newId, noafiliacion, fechareferencia, motivotraslado, idmedico, especialidadreferencia]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error al registrar referencia:', err);
        res.status(500).json({ detail: 'Error al registrar referencia.' });
    }
});