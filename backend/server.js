const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
// Importar router para actualización masiva de pacientes
const updateMasivoPacientesRouter = require('./update-masivo-pacientes');

// Definir colores usados en el PDF
const VERDE = '#16a085';
const ROJO = '#e74c3c';

app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));

// Asegurarnos de que la carpeta 'fotos' existe
const fotosDir = path.join(__dirname, 'fotos');
if (!fs.existsSync(fotosDir)) {
    fs.mkdirSync(fotosDir);
}

// Servir archivos estáticos desde la carpeta 'fotos'
app.use('/fotos', express.static(fotosDir));
// Usar el router para actualización masiva de pacientes
app.use(updateMasivoPacientesRouter);

// Endpoint para subir/reemplazar foto de paciente
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
        await pool.query('UPDATE tbl_pacientes SET urlfoto = $1 WHERE noafiliacion = $2', [filename, noAfiliacion]);
        res.json({ success: true, url: `/fotos/${filename}` });
    } catch (err) {
        console.error('Error al subir foto:', err);
        res.status(500).json({ detail: 'Error al guardar la foto.' });
    }
});


// Endpoint para verificar si existe una foto
// Endpoint para actualizar el estado de un turno llamado a 6
app.put('/turnoLlamado/:idturno', async (req, res) => {
    const { idturno } = req.params;
    const { idturnoestado } = req.body;
    try {
        // Si no se manda un estado, por defecto 6 (como antes)
        const nuevoEstado = idturnoestado ? parseInt(idturnoestado, 10) : 6;
        await pool.query('UPDATE tbl_turnos SET idturnoestado = $1 WHERE idturno = $2', [nuevoEstado, idturno]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error al actualizar el estado del turno:', error);
        res.status(500).json({ error: 'Error al actualizar el estado del turno.' });
    }
});

// Endpoint para obtener el turno llamado actual
app.get('/turnoLlamado', async (req, res) => {
    try {
        // Buscar el turno más reciente cuyo idturnoestado = 3
        const result = await pool.query(`
            SELECT 
                t.idturno,
                CONCAT(p.primernombre, ' ', COALESCE(p.segundonombre, ''), ' ', COALESCE(p.primerapellido, ''), ' ', COALESCE(p.segundoapellido, '')) AS nombrepaciente,
                c.descripcion AS nombreclinica,
                p.urlfoto
            FROM tbl_turnos t
            INNER JOIN tbl_pacientes p ON t.noafiliacion = p.noafiliacion
            INNER JOIN tbl_clinica c ON t.idclinica = c.idsala
            WHERE t.idturnoestado = 3
            ORDER BY t.fechacreacion DESC
            LIMIT 1
        `);
        if (result.rows.length === 0) {
            return res.json(null);
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener turno llamado:', error);
        res.status(500).json({ error: 'Error al obtener turno llamado.' });
    }
});

// Endpoint para verificar si existe una foto
app.get('/check-photo/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'fotos', filename);

    if (fs.existsSync(filePath)) {
        res.json({ exists: true });
    } else {
        res.json({ exists: false });
    }
});


// Configuración de la base de datos
const ExcelJS = require("exceljs");
const pool = new Pool({
    host: 'localhost',
    database: 'db_clinicaemanuel',
    user: 'postgres',
    password: 'root'
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

// Endpoint para consultar referencias
app.get('/api/referencias', async (req, res) => {
    try {
        let baseQuery = `
            SELECT r.idreferencia, r.noafiliacion, p.primernombre, p.segundonombre, p.primerapellido, p.segundoapellido,
                   r.fechareferencia, r.motivotraslado, r.idmedico, m.nombrecompleto AS nombremedico, r.especialidadreferencia
            FROM tbl_referencias r
            LEFT JOIN tbl_pacientes p ON r.noafiliacion = p.noafiliacion
            LEFT JOIN tbl_medicos m ON r.idmedico = m.idmedico
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;
        if (req.query.desde) {
            baseQuery += ` AND r.fechareferencia >= $${idx}`;
            params.push(req.query.desde);
            idx++;
        }
        if (req.query.hasta) {
            baseQuery += ` AND r.fechareferencia <= $${idx}`;
            params.push(req.query.hasta);
            idx++;
        }
        if (req.query.idmedico) {
            baseQuery += ` AND r.idmedico = $${idx}`;
            params.push(req.query.idmedico);
            idx++;
        }
        baseQuery += ' ORDER BY r.idreferencia DESC';
        const result = await pool.query(baseQuery, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error al consultar referencias:', err);
        res.status(500).json({ detail: 'Error al consultar referencias.' });
    }
});

// Endpoint para obtener departamentos
app.get('/medicos', async (req, res) => {
    try {
        const result = await pool.query('SELECT idmedico, nombrecompleto FROM tbl_medicos WHERE estado = true ORDER BY nombrecompleto ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

app.get('/departamentos', async (req, res) => {
    try {
        const result = await pool.query('SELECT iddepartamento, nombre FROM tbl_departamentos ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener departamentos.' });
    }
});

// Endpoint para buscar pacientes para egreso
app.get('/api/pacientes/egreso', async (req, res) => {
    const { dpi, noafiliacion } = req.query;
    let baseQuery = `
        SELECT 
    pac.noafiliacion, pac.dpi, pac.nopacienteproveedor, pac.primernombre, pac.segundonombre, pac.otrosnombres, pac.primerapellido, pac.segundoapellido, pac.apellidocasada, pac.fechanacimiento, pac.sexo, pac.direccion, pac.fechaegreso, pac.nocasoconcluido, pac.idcausa, pac.causaegreso, 
    cau.descripcion as causaegreso_descripcion,
    pac.urlfoto, pac.iddepartamento, dep.nombre as departamento_nombre, pac.idestado, est.descripcion as estado_descripcion,
    pac.idacceso, acc.descripcion as acceso_descripcion,
    pac.idjornada, jor.descripcion as jornada_descripcion,
    pac.fechainicioperiodo, pac.fechafinperiodo, pac.sesionesautorizadasmes AS sesionesautorizadas, pac.observaciones
FROM tbl_pacientes pac
LEFT JOIN tbl_causaegreso cau ON pac.idcausa = cau.idcausa
LEFT JOIN tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
LEFT JOIN tbl_estadospaciente est ON pac.idestado = est.idestado
LEFT JOIN tbl_accesovascular acc ON pac.idacceso = acc.idacceso
LEFT JOIN tbl_jornadas jor ON pac.idjornada = jor.idjornada
WHERE pac.idestado != 3`;
    let params = [];
    if (dpi) {
        baseQuery += ' AND pac.dpi = $1';
        params.push(dpi);
    } else if (noafiliacion) {
        baseQuery += ' AND pac.noafiliacion = $1';
        params.push(noafiliacion);
    } else {
        return res.status(400).json({ error: 'Debe proporcionar dpi o noafiliacion.' });
    }
    try {
        const result = await pool.query(baseQuery, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar pacientes para egreso.', detalle: error.message });
    }
});

// Endpoint para buscar pacientes para reingreso
app.get('/api/pacientes/reingreso', async (req, res) => {
    const { dpi, noafiliacion } = req.query;
    let baseQuery = `
        SELECT pac.noafiliacion, pac.dpi, pac.nopacienteproveedor, pac.primernombre, pac.segundonombre, pac.otrosnombres, pac.primerapellido, pac.segundoapellido, pac.apellidocasada, 
        pac.fechanacimiento, pac.sexo, pac.direccion, pac.fechaegreso, pac.idcausa, pac.causaegreso, cau.descripcion as descripcionEgreso, pac.urlfoto, pac.iddepartamento, pac.idestado, 
        pac.fechainicioperiodo, pac.fechafinperiodo, pac.sesionesautorizadasmes AS sesionesautorizadas, pac.observaciones 
        FROM tbl_pacientes pac LEFT JOIN tbl_causaegreso cau ON 
        pac.idcausa = cau.idcausa WHERE pac.idestado = 3 AND pac.idcausa != 1`;
    let params = [];
    if (dpi) {
        baseQuery += ' AND pac.dpi = $1';
        params.push(dpi);
    } else if (noafiliacion) {
        baseQuery += ' AND pac.noafiliacion = $1';
        params.push(noafiliacion);
    } else {
        return res.status(400).json({ error: 'Debe proporcionar dpi o noafiliacion.' });
    }

    try {
        const result = await pool.query(baseQuery, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar pacientes para reingreso.', detalle: error.message });
    }
});

// Endpoint para exportar reporte de pacientes NUEVO INGRESO en Excel

// Endpoint para exportar reporte de egresos en Excel
app.get('/api/reportes/egreso/excel', async (req, res) => {
    try {
        const { fechainicio, fechafin } = req.query;
        let baseQuery = `
            SELECT 
            pac.noafiliacion as noafiliacion,
            pac.dpi as dpi,
            pac.nopacienteproveedor as nointernoproveedor,
            CONCAT_WS(' ', pac.primernombre, pac.segundonombre, pac.otrosnombres, pac.primerapellido, pac.segundoapellido, pac.apellidocasada) as NombreCompleto,
            TO_CHAR(pac.fechanacimiento, 'YYYY-MM-DD') as FechaNacimiento,
            pac.sexo as Sexo,
            pac.direccion as Direccion,
            dep.nombre as Departamento,
            TO_CHAR(pac.fechaingreso, 'YYYY-MM-DD') as FechaIngreso,
            est.descripcion as EstadoPaciente,
            jor.descripcion as Jornada,
            acc.descripcion as AccesoVascular,
            pac.nocasoconcluido as nocasoconcluido,
            pac.numeroformulario as NumeroFormulario,
            TO_CHAR(pac.fechainicioperiodo, 'YYYY-MM-DD') as fechainicioperiodo,
            TO_CHAR(pac.fechafinperiodo, 'YYYY-MM-DD') as fechafinperiodo,
            pac.sesionesautorizadasmes as NumeroSesionesAutorizadasMes,
            pac.sesionesrealizadasmes as NumeroSesionesRealizadasMes,
            pac.observaciones as Observaciones,
            pac.fechanacimiento as fechanacimiento_raw,
    pac.idcausa as idcausa,
    cau.descripcion as causaegreso,
    TO_CHAR(pac.fechaegreso,'YYYY-MM-DD') as fechaegreso
        FROM tbl_pacientes pac
        LEFT JOIN tbl_estadospaciente est ON pac.idestado = est.idestado
        LEFT JOIN tbl_accesovascular acc ON pac.idacceso = acc.idacceso
        LEFT JOIN tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
        LEFT JOIN tbl_jornadas jor ON pac.idjornada = jor.idjornada
LEFT JOIN tbl_causaegreso cau ON pac.idcausa = cau.idcausa
        WHERE est.descripcion = 'Egreso'`;

        let params = [];
        let idx = 1;
        if (fechainicio) {
            baseQuery += ` AND pac.fechainicioperiodo >= $${idx}`;
            params.push(fechainicio);
            idx++;
        }
        if (fechafin) {
            baseQuery += ` AND pac.fechainicioperiodo <= $${idx}`;
            params.push(fechafin);
            idx++;
        }
        baseQuery += ' ORDER BY pac.fechainicioperiodo DESC LIMIT 100';
        const result = await pool.query(baseQuery, params);
        const pacientes = result.rows.map(p => {
            // Calcular edad
            let edad = '';
            if (p.fechanacimiento_raw) {
                const fechaNac = new Date(p.fechanacimiento_raw);
                const hoy = new Date();
                let anios = hoy.getFullYear() - fechaNac.getFullYear();
                const m = hoy.getMonth() - fechaNac.getMonth();
                if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
                    anios--;
                }
                edad = anios;
            }
            // Periodo
            let periodo = '';
            if (p.fechainicioperiodo && p.fechafinperiodo) {
                periodo = `${p.fechainicioperiodo} al ${p.fechafinperiodo}`;
            }
            return {
                noafiliacion: p.noafiliacion,
                dpi: p.dpi,
                nointernoproveedor: p.nointernoproveedor,
                NombreCompleto: p.nombrecompleto,
                Edad: edad,
                FechaNacimiento: p.fechanacimiento,
                Sexo: p.sexo,
                Direccion: p.direccion,
                NumeroFormulario: p.NumeroFormulario,
                Departamento: p.departamento,
                FechaIngreso: p.fechaingreso,
                EstadoPaciente: p.estadopaciente,
                Jornada: p.jornada,
                AccesoVascular: p.accesovascular,
                NumeroFormulario: p.numeroformulario,
                Periodo: periodo,
                NumeroSesionesAutorizadasMes: p.numerosesionesautorizadasmes,
                NumeroSesionesRealizadasMes: p.numerosesionesrealizadasmes,
                NumeroSesionesNoRealizadasMes: (Number(p.numerosesionesautorizadasmes || 0) - Number(p.numerosesionesrealizadasmes || 0)),
                Observaciones: p.observaciones,
                CausaEgreso: p.causaegreso,
                FechaEgreso: p.fechaegreso,
                NoCasoConcluido: p.nocasoconcluido
            };
        });

        const ExcelJS = require("exceljs");
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Pacientes Egreso');
        // Insertar logo y título
        const logoPath = __dirname + '/assets/img/logoClinica.png';
        if (fs.existsSync(logoPath)) {
            const imageId = workbook.addImage({
                filename: logoPath,
                extension: 'png',
            });
            worksheet.addImage(imageId, {
                tl: { col: 0, row: 0 }, // A1
                br: { col: 2, row: 7 }  // B7
            });
        }
        // Insertar título de la fila 1 a la 7 en columnas C a Q (centrado)
        worksheet.mergeCells('D3:P5');
        worksheet.getCell('D3').value = 'REPORTE PACIENTES EGRESO';
        worksheet.getCell('D3').alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell('D3').font = { name: 'Arial', size: 28, bold: true, color: { argb: 'FF16a085' } };

        for (let col = 4; col <= 19; col++) { // D1 a S1
            worksheet.getCell(1, col).value = null;
        }
        // Configuración de columnas
        worksheet.columns = [
            { header: 'No. Afiliación', key: 'noafiliacion', width: 15 },
            { header: 'DPI', key: 'dpi', width: 15 },
            { header: 'No. Interno Proveedor', key: 'nointernoproveedor', width: 20 },
            { header: 'Nombre Completo', key: 'NombreCompleto', width: 30 },
            { header: 'Fecha de Nacimiento', key: 'FechaNacimiento', width: 15 },
            { header: 'Edad', key: 'Edad', width: 10 },
            { header: 'Sexo', key: 'Sexo', width: 10 },
            { header: 'Dirección', key: 'Direccion', width: 30 },
            { header: 'Departamento', key: 'Departamento', width: 20 },
            { header: 'Fecha Ingreso', key: 'FechaIngreso', width: 15 },
            { header: 'Estado del Paciente', key: 'EstadoPaciente', width: 20 },
            { header: 'Causa de Egreso', key: 'CausaEgreso', width: 20 },
            { header: 'Fecha de Egreso', key: 'FechaEgreso', width: 15 },
            { header: 'No Caso Concluido', key: 'NoCasoConcluido', width: 20 },
            { header: 'Jornada', key: 'Jornada', width: 15 },
            { header: 'Acceso Vascular', key: 'AccesoVascular', width: 20 },
            { header: 'Número de Formulario', key: 'NumeroFormulario', width: 20 },
            { header: 'Periodo', key: 'Periodo', width: 20 },
            { header: 'Sesiones Autorizadas Mes', key: 'NumeroSesionesAutorizadasMes', width: 20 },
            { header: 'Sesiones Realizadas Mes', key: 'NumeroSesionesRealizadasMes', width: 20 },
            { header: 'Sesiones No Realizadas Mes', key: 'NumeroSesionesNoRealizadasMes', width: 18 },
            { header: 'Observaciones', key: 'Observaciones', width: 30 }

        ];
        const startRow = 8;
        // Encabezados personalizados (fila 8)
        worksheet.getRow(startRow).values = worksheet.columns.map(col => col.header);
        // Agregar filas de datos y alternar color
        pacientes.forEach((p, i) => {
            const rowIdx = startRow + 1 + i;
            worksheet.getRow(rowIdx).values = [
                p.noafiliacion || '',
                p.dpi || '',
                p.nointernoproveedor || '',
                p.NombreCompleto || '',
                p.FechaNacimiento || '',
                p.Edad || '',
                p.Sexo || '',
                p.Direccion || '',
                p.Departamento || '',
                p.FechaIngreso || '',
                p.EstadoPaciente || '',
                p.CausaEgreso || '',
                p.FechaEgreso || '',
                p.NoCasoConcluido || '',
                p.Jornada || '',
                p.AccesoVascular || '',
                p.NumeroFormulario || '',
                p.Periodo || '',
                p.NumeroSesionesAutorizadasMes || '',
                p.NumeroSesionesRealizadasMes || '',
                p.NumeroSesionesNoRealizadasMes || '',
                p.Observaciones || ''
            ];
            // Eliminar encabezados duplicados arriba si es necesario
            for (let i = 1; i < startRow; i++) {
                const row = worksheet.getRow(i);
                if (row && row.values && Array.isArray(row.values)) {
                    const isHeaderRow = row.values.join(' ').toLowerCase().includes('no. afiliación') && row.values.length > 3;
                    if (isHeaderRow) row.values = [];
                }
            }

        });

        worksheet.addTable({
            name: 'PacientesEgresoTable',
            ref: `A${startRow}`,
            headerRow: true,
            totalsRow: false,
            style: {
                theme: 'TableStyleMedium13',
                showRowStripes: true,
            },
            columns: worksheet.columns.map(col => ({ name: col.header, filterButton: true })),
            rows: pacientes.map(p => [
                p.noafiliacion || '',
                p.dpi || '',
                p.nointernoproveedor || '',
                p.NombreCompleto || '',
                p.FechaNacimiento || '',
                p.Edad || '',
                p.Sexo || '',
                p.Direccion || '',
                p.Departamento || '',
                p.FechaIngreso || '',
                p.EstadoPaciente || '',
                p.CausaEgreso || '',
                p.FechaEgreso || '',
                p.NoCasoConcluido || '',
                p.Jornada || '',
                p.AccesoVascular || '',
                p.NumeroFormulario || '',
                p.Periodo || '',
                p.NumeroSesionesAutorizadasMes || '',
                p.NumeroSesionesRealizadasMes || '',
                p.NumeroSesionesNoRealizadasMes || '',
                p.Observaciones || ''
            ])
        });

        // Agregar tabla de datos


        // Establecer encabezados para la respuesta HTTP
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="reporte_egreso.xlsx"');

        // Escribir el archivo y enviar la respuesta
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error(error);
        if (error && error.stack) console.error(error.stack);
        res.status(500).json({ message: 'Hubo un error al generar el reporte de egreso.' });
    }
});

app.get('/api/reportes/nuevoingreso/excel', async (req, res) => {
    try {
        const { fechainicio, fechafin } = req.query;
        let baseQuery = `SELECT 
            pac.noafiliacion as noafiliacion,
            pac.dpi as dpi,
            pac.nopacienteproveedor as nointernoproveedor,
            CONCAT_WS(' ', pac.primernombre, pac.segundonombre, pac.otrosnombres, pac.primerapellido, pac.segundoapellido, pac.apellidocasada) as NombreCompleto,
            TO_CHAR(pac.fechanacimiento, 'YYYY-MM-DD') as FechaNacimiento,
            pac.sexo as Sexo,
            pac.direccion as Direccion,
            dep.nombre as Departamento,
            TO_CHAR(pac.fechaingreso, 'YYYY-MM-DD') as FechaIngreso,
            est.descripcion as EstadoPaciente,
            jor.descripcion as Jornada,
            acc.descripcion as AccesoVascular,
            pac.numeroformulario as NumeroFormulario,
            TO_CHAR(pac.fechainicioperiodo, 'YYYY-MM-DD') as fechainicioperiodo,
            TO_CHAR(pac.fechafinperiodo, 'YYYY-MM-DD') as fechafinperiodo,
            pac.sesionesautorizadasmes as NumeroSesionesAutorizadasMes,
            pac.sesionesrealizadasmes as NumeroSesionesRealizadasMes,
            pac.observaciones as Observaciones,
            pac.fechanacimiento as fechanacimiento_raw,
    pac.idcausa as idcausa,
    pac.causaegreso as causaegreso,
    cau.descripcion as causaegreso_descripcion
        FROM tbl_pacientes pac
        LEFT JOIN tbl_estadospaciente est ON pac.idestado = est.idestado
        LEFT JOIN tbl_accesovascular acc ON pac.idacceso = acc.idacceso
        LEFT JOIN tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
        LEFT JOIN tbl_jornadas jor ON pac.idjornada = jor.idjornada
LEFT JOIN tbl_causaegreso cau ON pac.idcausa = cau.idcausa
        WHERE est.descripcion = 'Nuevo Ingreso'`;

        let params = [];
        let idx = 1;
        if (fechainicio) {
            baseQuery += ` AND pac.fechainicioperiodo >= $${idx}`;
            params.push(fechainicio);
            idx++;
        }
        if (fechafin) {
            baseQuery += ` AND pac.fechainicioperiodo <= $${idx}`;
            params.push(fechafin);
            idx++;
        }
        baseQuery += ' ORDER BY pac.fechainicioperiodo DESC LIMIT 100';
        const result = await pool.query(baseQuery, params);
        const pacientes = result.rows.map(p => {
            // Calcular edad
            let edad = '';
            if (p.fechanacimiento_raw) {
                const fechaNac = new Date(p.fechanacimiento_raw);
                const hoy = new Date();
                let anios = hoy.getFullYear() - fechaNac.getFullYear();
                const m = hoy.getMonth() - fechaNac.getMonth();
                if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
                    anios--;
                }
                edad = anios;
            }
            // Periodo
            let periodo = '';
            if (p.fechainicioperiodo && p.fechafinperiodo) {
                periodo = `${p.fechainicioperiodo} al ${p.fechafinperiodo}`;
            }
            return {
                noafiliacion: p.noafiliacion,
                dpi: p.dpi,
                nointernoproveedor: p.nointernoproveedor,
                NombreCompleto: p.nombrecompleto,
                Edad: edad,
                FechaNacimiento: p.fechanacimiento,
                Sexo: p.sexo,
                Direccion: p.direccion,
                NumeroFormulario: p.NumeroFormulario,
                Departamento: p.departamento,
                FechaIngreso: p.fechaingreso,
                EstadoPaciente: p.estadopaciente,
                Jornada: p.jornada,
                AccesoVascular: p.accesovascular,
                NumeroFormulario: p.numeroformulario,
                Periodo: periodo,
                NumeroSesionesAutorizadasMes: p.numerosesionesautorizadasmes,
                NumeroSesionesRealizadasMes: p.numerosesionesrealizadasmes,
                NumeroSesionesNoRealizadasMes: (Number(p.numerosesionesautorizadasmes || 0) - Number(p.numerosesionesrealizadasmes || 0)),
                Observaciones: p.observaciones
            };
        });
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Pacientes');
        // Insertar logo y título
        const logoPath = __dirname + '/assets/img/logoClinica.png';
        if (fs.existsSync(logoPath)) {
            const imageId = workbook.addImage({
                filename: logoPath,
                extension: 'png',
            });
            worksheet.addImage(imageId, {
                tl: { col: 0, row: 0 }, // A1
                br: { col: 2, row: 7 }  // B7
            });
        }
        // Insertar título de la fila 1 a la 7 en columnas C a Q (centrado)
        worksheet.mergeCells('C1:Q7');
        worksheet.getCell('C1').value = 'REPORTE PACIENTES NUEVO INGRESO';
        worksheet.getCell('C1').alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell('C1').font = { name: 'Arial', size: 26, bold: true, color: { argb: 'FF003366' } };
        // La tabla comienza en la fila 8
        const startRow = 8;
        worksheet.columns = [
            { key: 'noafiliacion', width: 15 },
            { key: 'dpi', width: 18 },
            { key: 'nointernoproveedor', width: 18 },
            { key: 'NombreCompleto', width: 32 },
            { key: 'Edad', width: 8 },
            { key: 'FechaNacimiento', width: 15 },
            { key: 'Sexo', width: 10 },
            { key: 'Direccion', width: 28 },
            { key: 'Departamento', width: 18 },
            { key: 'FechaIngreso', width: 15 },
            { key: 'EstadoPaciente', width: 18 },
            { key: 'Jornada', width: 15 },
            { key: 'AccesoVascular', width: 18 },
            { key: 'NumeroFormulario', width: 20 },
            { key: 'Periodo', width: 25 },
            { key: 'NumeroSesionesAutorizadasMes', width: 15 },
            { key: 'NumeroSesionesRealizadasMes', width: 15 },
            { key: 'NumeroSesionesNoRealizadasMes', width: 18 },
            { key: 'Observaciones', width: 32 }
        ];
        // Cargar correctamente los datos de pacientes en el orden de las columnas
        pacientes.forEach(p => {
            worksheet.addRow([
                p.NoAfiliacion || '',
                p.DPI || '',
                p.NoInternoProveedor || '',
                p.NombreCompleto || '',
                p.Edad || '',
                p.FechaNacimiento || '',
                p.Sexo || '',
                p.Direccion || '',
                p.Departamento || '',
                p.FechaIngreso || '',
                p.EstadoPaciente || '',
                p.Jornada || '',
                p.AccesoVascular || '',
                p.NumeroFormulario || '',
                p.Periodo || '',
                p.NumeroSesionesAutorizadasMes || '',
                p.NumeroSesionesRealizadasMes || '',
                (Number(p.NumeroSesionesAutorizadasMes || 0) - Number(p.NumeroSesionesRealizadasMes || 0)),
                p.Observaciones || ''
            ]);
        });
        // Agregar formato de tabla
        worksheet.addTable({
            name: 'PacientesTable',
            ref: `A${startRow}`,
            headerRow: true,
            totalsRow: false,
            style: {
                theme: 'TableStyleMedium9',
                showRowStripes: true
            },
            columns: [
                { name: 'No. Afiliación', filterButton: true },
                { name: 'DPI', filterButton: true },
                { name: 'Número Proveedor', filterButton: true },
                { name: 'Nombre Completo', filterButton: true },
                { name: 'Edad', filterButton: true },
                { name: 'Fecha de Nacimiento', filterButton: true },
                { name: 'Sexo', filterButton: true },
                { name: 'Dirección', filterButton: true },
                { name: 'Departamento', filterButton: true },
                { name: 'Fecha Ingreso', filterButton: true },
                { name: 'Estado del Paciente', filterButton: true },
                { name: 'Jornada', filterButton: true },
                { name: 'Acceso Vascular', filterButton: true },
                { name: 'Número de Formulario', filterButton: true },
                { name: 'Periodo', filterButton: true },
                { name: 'Sesiones Autorizadas Mes', filterButton: true },
                { name: 'Sesiones Realizadas Mes', filterButton: true },
                { name: 'Sesiones No Realizadas Mes', filterButton: true },
                { name: 'Observaciones', filterButton: true }
            ],
            rows: pacientes.map(p => [
                p.noafiliacion || '',
                p.dpi || '',
                p.nointernoproveedor || '',
                p.NombreCompleto || '',
                p.Edad || '',
                p.FechaNacimiento || '',
                p.Sexo || '',
                p.Direccion || '',
                p.Departamento || '',
                p.FechaIngreso || '',
                p.EstadoPaciente || '',
                p.Jornada || '',
                p.AccesoVascular || '',
                p.NumeroFormulario || '',
                p.Periodo || '',
                p.NumeroSesionesAutorizadasMes || '',
                p.NumeroSesionesRealizadasMes || '',
                p.NumeroSesionesNoRealizadasMes || '',
                p.Observaciones || ''
            ])
        });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="reporte_nuevo_ingreso.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ error: 'Error al exportar Excel.', detalle: error.message });
    }
});

// Endpoint para exportar reporte de pacientes en Excel
app.get('/api/pacientes/excel', async (req, res) => {
    try {
        const { fechainicio, fechafin, estado, numeroformulario } = req.query;
        let baseQuery = `SELECT 
    pac.noafiliacion as noafiliacion,
    pac.dpi as dpi,
    pac.nopacienteproveedor as nopacienteproveedor,
    pac.primernombre as primernombre,
pac.segundonombre as segundonombre,
pac.otrosnombres as otrosnombres,
pac.primerapellido as primerapellido,
pac.segundoapellido as segundoapellido,
pac.apellidocasada as apellidocasada,
TO_CHAR(pac.fechanacimiento, 'YYYY-MM-DD') as fechanacimiento,
    pac.sexo as sexo,
    pac.direccion as direccion,
    dep.nombre as departamento,
    TO_CHAR(pac.fechaingreso, 'YYYY-MM-DD') as fechaingreso,
    est.descripcion as estado,
    jor.descripcion as jornada,
    acc.descripcion as accesovascular,
    pac.numeroformulario as numeroformulario,
    TO_CHAR(pac.fechainicioperiodo, 'YYYY-MM-DD') as fechainicioperiodo,
    TO_CHAR(pac.fechafinperiodo, 'YYYY-MM-DD') as fechafinperiodo,
    pac.sesionesautorizadasmes as sesionesautorizadasmes,
    pac.sesionesrealizadasmes as sesionesrealizadasmes,
    pac.observaciones as observaciones,
    pac.fechanacimiento as fechanacimiento_raw,
    pac.idcausa as idcausa,
    pac.causaegreso as causaegreso,
    cau.descripcion as causaegreso_descripcion
FROM tbl_pacientes pac
LEFT JOIN tbl_estadospaciente est ON pac.idestado = est.idestado
LEFT JOIN tbl_accesovascular acc ON pac.idacceso = acc.idacceso
LEFT JOIN tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
LEFT JOIN tbl_jornadas jor ON pac.idjornada = jor.idjornada
LEFT JOIN tbl_causaegreso cau ON pac.idcausa = cau.idcausa
WHERE 1=1`;

        let params = [];
        let idx = 1;
        if (fechainicio) {
            baseQuery += ` AND pac.fechainicioperiodo >= $${idx}`;
            params.push(fechainicio);
            idx++;
        }
        if (fechafin) {
            baseQuery += ` AND pac.fechainicioperiodo <= $${idx}`;
            params.push(fechafin);
            idx++;
        }
        if (estado) {
            baseQuery += ` AND est.descripcion = $${idx}`;
            params.push(estado);
            idx++;
        }
        if (numeroformulario) {
            baseQuery += ` AND pac.numeroformulario ILIKE $${idx}`;
            params.push(`%${numeroformulario}%`);
            idx++;
        }
        baseQuery += ' ORDER BY pac.fechainicioperiodo DESC LIMIT 100';
        const result = await pool.query(baseQuery, params);
        const pacientes = result.rows.map(p => {
            // Calcular edad
            let edad = '';
            if (p.fechanacimiento_raw) {
                const fechaNac = new Date(p.fechanacimiento_raw);
                const hoy = new Date();
                let anios = hoy.getFullYear() - fechaNac.getFullYear();
                const m = hoy.getMonth() - fechaNac.getMonth();
                if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
                    anios--;
                }
                edad = anios;
            }
            // Periodo
            let periodo = '';
            if (p.fechainicioperiodo && p.fechafinperiodo) {
                periodo = `${p.fechainicioperiodo} al ${p.fechafinperiodo}`;
            }
            return {
                noafiliacion: p.noafiliacion,
                dpi: p.dpi,
                nopacienteproveedor: p.nopacienteproveedor,
                nombre: [p.primernombre, p.segundonombre, p.otrosnombres, p.primerapellido, p.segundoapellido, p.apellidocasada].filter(Boolean).join(' ').replace(/ +/g, ' ').trim(),
                fechanacimiento: p.fechanacimiento,
                edad: edad,
                sexo: p.sexo,
                direccion: p.direccion,
                departamento: p.departamento,
                fechaingreso: p.fechaingreso,
                estadopaciente: p.estado,
                jornada: p.jornada,
                accesovascular: p.accesovascular,
                numeroformulario: p.numeroformulario,
                periodo: (p.fechainicioperiodo && p.fechafinperiodo) ? `Del ${p.fechainicioperiodo.split('-').reverse().join('/')} al ${p.fechafinperiodo.split('-').reverse().join('/')}` : '',
                sesionesautorizadasmes: p.sesionesautorizadasmes,
                sesionesrealizadasmes: p.sesionesrealizadasmes,
                observaciones: p.observaciones
            };
        });
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Pacientes');
        // Insertar logo en A1:B7
        const logoPath = __dirname + '/assets/img/logoClinica.png';
        if (fs.existsSync(logoPath)) {
            const imageId = workbook.addImage({
                filename: logoPath,
                extension: 'png',
            });
            worksheet.addImage(imageId, {
                tl: { col: 0, row: 0 }, // A1
                br: { col: 2, row: 7 }  // B7
            });
        }
        // Unir C1:S7 para el título
        worksheet.mergeCells('D3:P5');
        worksheet.getCell('D3').value = 'REPORTE GENERAL DE PACIENTES';
        worksheet.getCell('D3').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        worksheet.getCell('D3').font = { name: 'Arial', size: 28, bold: true, color: { argb: '1d8348 ' } }; // Verde
        worksheet.getRow(1).height = 60;
        // Forzar el valor SOLO en la celda C1 (no en las demás unidas)
        for (let col = 4; col <= 19; col++) { // D1 a S1
            worksheet.getCell(1, col).value = null;
        }
        // Definir columnas
        worksheet.columns = [
            { header: 'No. Afiliación', key: 'noafiliacion', width: 15 },
            { header: 'DPI', key: 'dpi', width: 18 },
            { header: 'Número Proveedor', key: 'nopacienteproveedor', width: 18 },
            { header: 'Nombre Completo', key: 'nombre', width: 32 },
            { header: 'Fecha de Nacimiento', key: 'fechanacimiento', width: 15 },
            { header: 'Edad', key: 'edad', width: 8 },
            { header: 'Sexo', key: 'sexo', width: 10 },
            { header: 'Dirección', key: 'direccion', width: 28 },
            { header: 'Departamento', key: 'departamento', width: 18 },
            { header: 'Fecha Ingreso', key: 'fechaingreso', width: 15 },
            { header: 'Estado del Paciente', key: 'estadopaciente', width: 18 },
            { header: 'Jornada', key: 'jornada', width: 15 },
            { header: 'Acceso Vascular', key: 'accesovascular', width: 18 },
            { header: 'Número de Formulario', key: 'numeroformulario', width: 20 },
            { header: 'Periodo', key: 'periodo', width: 25 },
            { header: 'Sesiones Autorizadas Mes', key: 'sesionesautorizadasmes', width: 15 },
            { header: 'Sesiones Realizadas Mes', key: 'sesionesrealizadasmes', width: 15 },
            { header: 'Sesiones No Realizadas Mes', key: 'sesionesnorealizadasmes', width: 18 },
            { header: 'Observaciones', key: 'observaciones', width: 32 },
            { header: 'Causa de Egreso', key: 'causaegreso', width: 25 },
            { header: 'Fecha de Egreso', key: 'fechaegreso', width: 15 }
        ];
        // Encabezados en fila 8, datos desde fila 9
        const startRow = 8;
        worksheet.getRow(startRow).values = worksheet.columns.map(col => col.header);
        pacientes.forEach((p, i) => {
            worksheet.getRow(startRow + 1 + i).values = [
                p.noafiliacion || '',
                p.dpi || '',
                p.nopacienteproveedor || '',
                p.nombre || '',
                p.fechanacimiento || '',
                p.edad || '',
                p.sexo || '',
                p.direccion || '',
                p.departamento || '',
                p.fechaingreso || '',
                p.estadopaciente || '',
                p.jornada || '',
                p.accesovascular || '',
                p.numeroformulario || '',
                p.periodo || '',
                p.sesionesautorizadasmes || '',
                p.sesionesrealizadasmes || '',
                (Number(p.sesionesautorizadasmes || 0) - Number(p.sesionesrealizadasmes || 0)),
                p.observaciones || '',
                p.causaegreso || '',
                p.fechaegreso || ''
            ];
        });
        // Eliminar encabezados duplicados arriba si es necesario
        for (let i = 1; i < startRow; i++) {
            const row = worksheet.getRow(i);
            if (row && row.values && Array.isArray(row.values)) {
                const isHeaderRow = row.values.join(' ').toLowerCase().includes('no. afiliación') && row.values.length > 3;
                if (isHeaderRow) row.values = [];
            }
        }
        worksheet.addTable({
            name: 'PacientesTable',
            ref: `A${startRow}`,
            headerRow: true,
            totalsRow: false,
            style: {
                theme: 'TableStyleMedium11',
                showRowStripes: true
            },
            columns: worksheet.columns.map(col => ({ name: col.header, filterButton: true })),
            rows: pacientes.map(p => [
                p.noafiliacion || '',
                p.dpi || '',
                p.nopacienteproveedor || '',
                p.nombre || '',
                p.fechanacimiento || '',
                p.edad || '',
                p.sexo || '',
                p.direccion || '',
                p.departamento || '',
                p.fechaingreso || '',
                p.estadopaciente || '',
                p.jornada || '',
                p.accesovascular || '',
                p.numeroformulario || '',
                p.periodo || '',
                p.sesionesautorizadasmes || '',
                p.sesionesrealizadasmes || '',
                (Number(p.sesionesautorizadasmes || 0) - Number(p.sesionesrealizadasmes || 0)),
                p.observaciones || '',
                p.causaegreso || '',
                p.fechaegreso || ''
            ])
        });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="reporte_pacientes.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ error: 'Error al exportar Excel.', detalle: error.message });
    }
});

// Endpoint para exportar reporte de pacientes en PDF
app.get('/api/pacientes/pdf', async (req, res) => {
    try {
        const { fechainicio, fechafin, estado, numeroformulario } = req.query;
        let baseQuery = `SELECT 
    pac.noafiliacion as noafiliacion,
    pac.dpi as dpi,
    pac.nopacienteproveedor as nopacienteproveedor,
    pac.primernombre as primernombre,
pac.segundonombre as segundonombre,
pac.otrosnombres as otrosnombres,
pac.primerapellido as primerapellido,
pac.segundoapellido as segundoapellido,
pac.apellidocasada as apellidocasada,
TO_CHAR(pac.fechanacimiento, 'YYYY-MM-DD') as fechanacimiento,
    pac.sexo as sexo,
    pac.direccion as direccion,
    dep.nombre as departamento,
    TO_CHAR(pac.fechaingreso, 'YYYY-MM-DD') as fechaingreso,
    est.descripcion as estado,
    jor.descripcion as jornada,
    acc.descripcion as accesovascular,
    pac.numeroformulario as numeroformulario,
    TO_CHAR(pac.fechainicioperiodo, 'YYYY-MM-DD') as fechainicioperiodo,
    TO_CHAR(pac.fechafinperiodo, 'YYYY-MM-DD') as fechafinperiodo,
    pac.sesionesautorizadasmes as sesionesautorizadasmes,
    pac.sesionesrealizadasmes as sesionesrealizadasmes,
    pac.observaciones as observaciones,
    pac.fechanacimiento as fechanacimiento_raw,
    pac.idcausa as idcausa,
    pac.causaegreso as causaegreso,
    pac.comorbilidades as comorbilidades,
pac.lugarfallecimiento as lugarfallecimiento,
pac.causafallecimiento as causafallecimiento,
    cau.descripcion as causaegreso_descripcion,
    To_Char(pac.fechaegreso, 'YYYY-MM-DD') as fechaegreso,
    pac.nocasoconcluido as nocasoconcluido
FROM tbl_pacientes pac
LEFT JOIN tbl_estadospaciente est ON pac.idestado = est.idestado
LEFT JOIN tbl_accesovascular acc ON pac.idacceso = acc.idacceso
LEFT JOIN tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
LEFT JOIN tbl_jornadas jor ON pac.idjornada = jor.idjornada
LEFT JOIN tbl_causaegreso cau ON pac.idcausa = cau.idcausa
WHERE 1=1`;

        let params = [];
        let idx = 1;
        if (fechainicio) {
            baseQuery += ` AND pac.fechainicioperiodo >= $${idx}`;
            params.push(fechainicio);
            idx++;
        }
        if (fechafin) {
            baseQuery += ` AND pac.fechainicioperiodo <= $${idx}`;
            params.push(fechafin);
            idx++;
        }
        if (estado) {
            baseQuery += ` AND est.descripcion = $${idx}`;
            params.push(estado);
            idx++;
        }
        if (numeroformulario) {
            baseQuery += ` AND pac.numeroformulario ILIKE $${idx}`;
            params.push(`%${numeroformulario}%`);
            idx++;
        }
        baseQuery += ' ORDER BY pac.fechainicioperiodo DESC LIMIT 100';
        const result = await pool.query(baseQuery, params);
        const pacientes = result.rows.map(p => {
            // Calcular edad
            let edad = '';
            if (p.fechanacimiento_raw) {
                const fechaNac = new Date(p.fechanacimiento_raw);
                const hoy = new Date();
                let anios = hoy.getFullYear() - fechaNac.getFullYear();
                const m = hoy.getMonth() - fechaNac.getMonth();
                if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
                    anios--;
                }
                edad = anios;
            }
            // Periodo
            let periodo = '';
            if (p.fechainicioperiodo && p.fechafinperiodo) {
                periodo = `${p.fechainicioperiodo} al ${p.fechafinperiodo}`;
            }
            return {
                noafiliacion: p.noafiliacion,
                dpi: p.dpi,
                nopacienteproveedor: p.nopacienteproveedor,
                nombre: [p.primernombre, p.segundonombre, p.otrosnombres, p.primerapellido, p.segundoapellido, p.apellidocasada].filter(Boolean).join(' ').replace(/ +/g, ' ').trim(),
                fechanacimiento: p.fechanacimiento,
                edad: edad,
                sexo: p.sexo,
                direccion: p.direccion,
                departamento: p.departamento,
                fechaingreso: p.fechaingreso,
                estadopaciente: p.estado,
                jornada: p.jornada,
                accesovascular: p.accesovascular,
                numeroformulario: p.numeroformulario,
                periodo: (p.fechainicioperiodo && p.fechafinperiodo) ? `Del ${p.fechainicioperiodo.split('-').reverse().join('/')} al ${p.fechafinperiodo.split('-').reverse().join('/')}` : '',
                sesionesautorizadasmes: p.sesionesautorizadasmes,
                sesionesrealizadasmes: p.sesionesrealizadasmes,
                observaciones: p.observaciones
            };
        });
        const PDFDocument = require('pdfkit');
        const fs = require('fs');
        // Paleta: azul: #003366, verde: #2ecc71
        const azul = '#003366';
        const verde = '#2ecc71';
        const blanco = '#FFFFFF';
        const grisClaro = '#F2F2F2';
        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="reporte_pacientes.pdf"');
        doc.pipe(res);
        // Logo y encabezado
        const logoPath = __dirname + '/assets/img/logoClinica.png';
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, doc.page.width / 2 - 40, 20, { width: 80, height: 80, align: 'center' });
        }
        doc.moveDown(5);
        doc.font('Helvetica-Bold').fontSize(24).fillColor(azul).text('Reporte de Pacientes', { align: 'center' });
        doc.moveDown(0.5);
        doc.lineWidth(4).strokeColor(verde).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
        doc.moveDown(1.5);
        // Tabla
        const tableTop = doc.y + 10;
        const colWidths = [60, 90, 80, 120, 65, 40, 35, 100, 60, 60, 70, 60, 80, 70, 90, 60, 60, 100]; // Ajustados para legal
        const headers = [
            'No. Afiliación', 'DPI', 'No. Interno Proveedor', 'Nombres y Apellidos', 'Fecha Nacimiento', 'Edad', 'Sexo', 'Dirección', 'Departamento', 'Fecha Ingreso', 'Estado Paciente', 'Jornada', 'Acceso Vascular', 'Número Formulario', 'Periodo', 'Sesiones Autorizadas Mes', 'Sesiones Realizadas Mes', 'Observaciones'
        ];
        let x = 50;
        let y = tableTop;
        doc.font('Helvetica-Bold').fontSize(9);
        doc.fillColor(blanco).rect(x, y, colWidths.reduce((a, b) => a + b, 0), 28).fill(azul);
        let colX = x;
        headers.forEach((h, i) => {
            doc.fillColor(blanco).text(h, colX + 4, y + 8, { width: colWidths[i] - 8, align: 'left' });
            colX += colWidths[i];
        });
        y += 28;
        doc.font('Helvetica').fontSize(8);
        pacientes.forEach((p, idx) => {
            const fill = idx % 2 === 0 ? grisClaro : blanco;
            doc.fillColor(fill).rect(x, y, colWidths.reduce((a, b) => a + b, 0), 20).fill();
            let colX = x;
            [
                p.NoAfiliacion,
                p.DPI,
                p.NoInternoProveedor,
                p.NombreCompleto,
                p.FechaNacimiento,
                p.Edad,
                p.Sexo,
                p.Direccion,
                p.Departamento,
                p.FechaIngreso,
                p.EstadoPaciente,
                p.Jornada,
                p.AccesoVascular,
                p.NumeroFormulario,
                p.Periodo,
                p.NumeroSesionesAutorizadasMes,
                p.NumeroSesionesRealizadasMes,
                p.Observaciones
            ].forEach((val, i) => {
                doc.fillColor(azul).text(val !== null && val !== undefined ? String(val) : '', colX + 4, y + 4, { width: colWidths[i] - 8, align: 'left' });
                colX += colWidths[i];
            });
            y += 20;
        });
        doc.end();
    } catch (error) {
        res.status(500).json({ error: 'Error al exportar PDF.', detalle: error.message });
    }
});

// Endpoint para buscar pacientes por filtros para reporte
app.get('/api/pacientes', async (req, res) => {
    const log = (...args) => { console.log('[PACIENTES]', ...args); }
    try {
        const { fechainicio, fechafin, estado, numeroformulario } = req.query;
        let baseQuery = `SELECT 
    pac.noafiliacion as noafiliacion,
    pac.dpi as dpi,
    pac.nopacienteproveedor as nopacienteproveedor,
    pac.primernombre as primernombre,
pac.segundonombre as segundonombre,
pac.otrosnombres as otrosnombres,
pac.primerapellido as primerapellido,
pac.segundoapellido as segundoapellido,
pac.apellidocasada as apellidocasada,
TO_CHAR(pac.fechanacimiento, 'YYYY-MM-DD') as fechanacimiento,
    pac.sexo as sexo,
    pac.direccion as direccion,
    dep.nombre as departamento,
    TO_CHAR(pac.fechaingreso, 'YYYY-MM-DD') as fechaingreso,
    est.descripcion as estado,
    jor.descripcion as jornada,
    acc.descripcion as accesovascular,
    pac.numeroformulario as numeroformulario,
    TO_CHAR(pac.fechainicioperiodo, 'YYYY-MM-DD') as fechainicioperiodo,
    TO_CHAR(pac.fechafinperiodo, 'YYYY-MM-DD') as fechafinperiodo,
    pac.sesionesautorizadasmes as sesionesautorizadasmes,
    pac.sesionesrealizadasmes as sesionesrealizadasmes,
    pac.observaciones as observaciones,
    pac.fechanacimiento as fechanacimiento_raw,
    pac.idcausa as idcausa,
    pac.causaegreso as causaegreso,
    pac.comorbilidades as comorbilidades,
pac.lugarfallecimiento as lugarfallecimiento,
pac.causafallecimiento as causafallecimiento,
    cau.descripcion as causaegreso_descripcion,
    To_Char(pac.fechaegreso, 'YYYY-MM-DD') as fechaegreso,
    pac.nocasoconcluido as nocasoconcluido
FROM tbl_pacientes pac
LEFT JOIN tbl_estadospaciente est ON pac.idestado = est.idestado
LEFT JOIN tbl_accesovascular acc ON pac.idacceso = acc.idacceso
LEFT JOIN tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
LEFT JOIN tbl_jornadas jor ON pac.idjornada = jor.idjornada
LEFT JOIN tbl_causaegreso cau ON pac.idcausa = cau.idcausa
WHERE 1=1`;

        let params = [];
        let idx = 1;
        if (fechainicio) {
            baseQuery += ` AND pac.fechainicioperiodo >= $${idx}`;
            params.push(fechainicio);
            idx++;
        }
        if (fechafin) {
            baseQuery += ` AND pac.fechainicioperiodo <= $${idx}`;
            params.push(fechafin);
            idx++;
        }
        if (estado) {
            baseQuery += ` AND est.descripcion = $${idx}`;
            params.push(estado);
            idx++;
        }
        if (numeroformulario) {
            baseQuery += ` AND pac.numeroformulario ILIKE $${idx}`;
            params.push(`%${numeroformulario}%`);
            idx++;
        }
        baseQuery += ' ORDER BY pac.fechainicioperiodo DESC LIMIT 100';
        log('Consulta SQL:', baseQuery);
        log('Parámetros:', params);
        const result = await pool.query(baseQuery, params);
        log('Resultados:', result.rows.length);
        res.json(result.rows);
    } catch (error) {
        log('ERROR:', error);
        res.status(500).json({ error: 'Error al buscar pacientes para el reporte.', detalle: error.message });
    }
});

// Endpoint para obtener causas de egreso activas
app.get('/causas-egreso', async (req, res) => {
    try {
        const result = await pool.query('SELECT idcausa, descripcion FROM tbl_causaegreso WHERE estado=true ORDER BY descripcion ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener causas de egreso.' });
    }
});

// Endpoint para obtener accesos vasculares
app.get('/accesos-vasculares', async (req, res) => {
    try {
        const result = await pool.query('SELECT idacceso, descripcion FROM tbl_accesovascular where estado=true ORDER BY descripcion ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener accesos vasculares.' });
    }
});

// Endpoint para obtener jornadas
app.get('/jornadas', async (req, res) => {
    try {
        const result = await pool.query('SELECT idjornada, descripcion, dias FROM tbl_jornadas where estado=true ORDER BY descripcion ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener jornadas.' });
    }
});

// Endpoint para obtener los estados de paciente
app.get('/estados-paciente', async (req, res) => {
    try {
        const result = await pool.query('SELECT idestado, descripcion FROM tbl_estadospaciente ORDER BY descripcion ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los estados de paciente.', detalle: error.message });
    }
});

// Endpoint para descargar carné PDF por número de afiliación
definirCarnetPaciente = async (pacienteData, fotoPath, carnetPath) => {
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
        doc.image(fotoPath, 432, 27, { width: 86, height: 66, fit: [86, 66] });
    } else {
        doc.rect(430, 25, 90, 70).fillAndStroke('white', '#bbb');
        doc.font('Helvetica').fontSize(12).fillColor('#888').text('Sin Foto', 450, 60);
    }

    // QR debajo de la foto
    const qrUrl = `http://localhost:3000/consulta-pacientes?noafiliacion=${encodeURIComponent(pacienteData.noafiliacion)}`;
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


// Endpoint para obtener faltistas
app.get('/api/faltistas', async (req, res) => {
    try {
        const { fechainicio, fechafin } = req.query;
        let query = `
            SELECT 
                pac.noafiliacion,  
                pac.primernombre, 
                pac.segundonombre, 
                pac.otrosnombres, 
                pac.primerapellido, 
                pac.segundoapellido, 
                pac.apellidocasada,
                pac.sexo,
                cli.descripcion as clinica,
                to_char(fal.fechafalta, 'YYYY-MM-DD') as fechafalta,
                fal.motivofalta
            FROM 
                tbl_faltistas fal
            INNER JOIN 
                tbl_clinica cli ON fal.idclinica = cli.idsala
            INNER JOIN 
                tbl_pacientes pac ON pac.noafiliacion = fal.noafiliacion
            WHERE 1=1`;
        const params = [];
        let idx = 1;
        if (fechainicio) {
            query += ` AND fal.fechafalta >= $${idx}`;
            params.push(fechainicio);
            idx++;
        }
        if (fechafin) {
            query += ` AND fal.fechafalta <= $${idx}`;
            params.push(fechafin);
            idx++;
        }
        query += " ORDER BY fal.fechafalta DESC";
        const result = await pool.query(query, params);
        const faltistas = result.rows.map(f => ({
            noafiliacion: f.noafiliacion,
            nombres: [f.primernombre, f.segundonombre, f.otrosnombres].filter(Boolean).join(' '),
            apellidos: [f.primerapellido, f.segundoapellido, f.apellidocasada].filter(Boolean).join(' '),
            sexo: f.sexo,
            clinica: f.clinica,
            fechafalta: f.fechafalta,
            motivofalta: f.motivofalta
        }));
        res.json(faltistas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ detail: 'Error al obtener los faltistas' });
    }
});

// Endpoint para obtener paciente por número de afiliación con descripciones de llaves foráneas
app.get('/pacientes/:noafiliacion', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.*, 
                d.nombre AS departamento_nombre,
                e.descripcion AS estado_descripcion,
                a.descripcion AS acceso_descripcion,
                c.descripcion AS causaegreso_descripcion,
                j.descripcion AS jornada_descripcion
            FROM tbl_pacientes p
            LEFT JOIN tbl_departamentos d ON p.iddepartamento = d.iddepartamento
            LEFT JOIN tbl_estadospaciente e ON p.idestado = e.idestado
            LEFT JOIN tbl_accesovascular a ON p.idacceso = a.idacceso
            LEFT JOIN tbl_causaegreso c ON p.idcausa = c.idcausa
            LEFT JOIN tbl_jornadas j ON p.idjornada = j.idjornada
            WHERE p.noafiliacion = $1
        `;
        const result = await pool.query(query, [req.params.noafiliacion]);
        if (!result.rows.length) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener paciente.', detalle: error.message });
    }
});

app.get('/carnet/:noafiliacion', async (req, res) => {
    try {
        const carnetPath = path.join(__dirname, 'carnets', `${req.params.noafiliacion}_carnet.pdf`);
        if (!fs.existsSync(carnetPath)) {
            // Buscar datos del paciente en la BD
            const result = await pool.query('SELECT * FROM tbl_pacientes WHERE noafiliacion = $1', [req.params.noafiliacion]);
            if (!result.rows.length) {
                return res.status(404).json({ error: 'Paciente no encontrado.' });
            }
            const pacienteData = result.rows[0];
            // Buscar foto
            let fotoPath = null;
            if (pacienteData.urlfoto && fs.existsSync(pacienteData.urlfoto)) {
                fotoPath = pacienteData.urlfoto;
            } else {
                // Buscar por nombre estándar (jpg/png)
                const jpgPath = path.join(__dirname, 'fotos', `${req.params.noafiliacion}.jpg`);
                const pngPath = path.join(__dirname, 'fotos', `${req.params.noafiliacion}.png`);
                if (fs.existsSync(jpgPath)) fotoPath = jpgPath;
                else if (fs.existsSync(pngPath)) fotoPath = pngPath;
            }
            // Generar y guardar el carné
            await definirCarnetPaciente(pacienteData, fotoPath, carnetPath);
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${req.params.noafiliacion}_carnet.pdf"`);
        const carnetBuffer = await fs.promises.readFile(carnetPath);
        res.status(200).end(carnetBuffer);
    } catch (error) {
        res.status(500).json({ error: 'Error al descargar o generar el carné.' });
    }
});

// Buscar paciente por número de afiliación
app.get('/pacientes/:noafiliacion', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tbl_pacientes WHERE noafiliacion = $1', [req.params.noafiliacion]);
        if (!result.rows.length) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar paciente por número de afiliación.' });
    }
});

// Buscar paciente por DPI
app.get('/pacientes/dpi/:dpi', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tbl_pacientes WHERE dpi = $1', [req.params.dpi]);
        if (!result.rows.length) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar paciente por DPI.' });
    }
});

// Registrar nuevo paciente
// Registrar nuevo paciente - Versión corregida
app.post('/pacientes', async (req, res) => {
    const client = await pool.connect();
    try {
        const { photo, ...pacienteData } = req.body;
        console.log('Datos recibidos:', pacienteData);

        // Validación de campos obligatorios (solo los NOT NULL de la tabla)
        const requiredFields = [
            { field: 'noafiliacion', desc: 'Número de afiliación', type: 'int' },
            { field: 'dpi', desc: 'DPI', type: 'string', length: 13 },
            { field: 'nopacienteproveedor', desc: 'Número de paciente proveedor', type: 'int' },
            { field: 'primernombre', desc: 'Primer nombre', type: 'string', max: 25 },
            { field: 'primerapellido', desc: 'Primer apellido', type: 'string', max: 50 },
            { field: 'fechanacimiento', desc: 'Fecha de nacimiento', type: 'date' },
            { field: 'sexo', desc: 'Sexo', type: 'string', max: 15 },
            { field: 'direccion', desc: 'Dirección', type: 'string', max: 150 },
            { field: 'fechaingreso', desc: 'Fecha de ingreso', type: 'date' },
            { field: 'iddepartamento', desc: 'Departamento', type: 'int' },
            { field: 'idestado', desc: 'Estado', type: 'int' },
            { field: 'idacceso', desc: 'Acceso vascular', type: 'int' }
        ];
        const errors = [];
        requiredFields.forEach(({ field, desc, type, length, max }) => {
            const value = pacienteData[field];
            if (value === undefined || value === null || value === '') {
                errors.push(`Campo requerido: ${desc}`);
            } else if (type === 'int' && (isNaN(Number(value)) || !Number.isInteger(Number(value)))) {
                errors.push(`El campo '${desc}' debe ser un número entero válido.`);
            } else if (type === 'string') {
                if (typeof value !== 'string') {
                    errors.push(`El campo '${desc}' debe ser texto.`);
                } else if (length && value.length !== length) {
                    errors.push(`El campo '${desc}' debe tener exactamente ${length} caracteres.`);
                } else if (max && value.length > max) {
                    errors.push(`El campo '${desc}' no debe exceder ${max} caracteres.`);
                }
            } else if (type === 'date') {
                // Validar formato YYYY-MM-DD
                if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                    errors.push(`El campo '${desc}' debe tener formato YYYY-MM-DD.`);
                } else {
                    const dateObj = new Date(value);
                    if (isNaN(dateObj.getTime())) {
                        errors.push(`El campo '${desc}' no es una fecha válida.`);
                    }
                }
            }
        });


        // Forzar el estado a 1 (NuevoIngreso)
        pacienteData.idestado = 1;

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        await client.query('BEGIN');

        // Si hay una foto, procesarla
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
            pacienteData.urlfoto = filePath;
            // Esperar a que la imagen esté escrita
            await new Promise((resolve, reject) => {
                fs.access(filePath, fs.constants.F_OK, (err) => {
                    if (err) reject(err); else resolve();
                });
            });
        }

        // Generar carné en PDF
        const carnetsDir = path.join(__dirname, 'carnets');
        if (!fs.existsSync(carnetsDir)) {
            fs.mkdirSync(carnetsDir);
        }
        const carnetFileName = `${pacienteData.noafiliacion}_carnet.pdf`;
        const carnetPath = path.join(carnetsDir, carnetFileName);
        const doc = new PDFDocument({ size: [350, 260] });
        const writeStream = fs.createWriteStream(carnetPath);
        doc.pipe(writeStream);

        // Logo clínica (si existe)
        const logoPath = path.join(__dirname, 'assets', 'img', 'logoClinica.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 15, 10, { width: 60 });
        }

        // Título
        doc.fontSize(16).text('Carné de Paciente', 90, 15, { align: 'left', bold: true });
        doc.moveDown();

        // Foto paciente (si existe)
        if (pacienteData.urlfoto && fs.existsSync(pacienteData.urlfoto)) {
            doc.image(pacienteData.urlfoto, 260, 15, { width: 70, height: 70, fit: [70, 70] });
        } else {
            doc.rect(260, 15, 70, 70).stroke();
            doc.fontSize(10).text('Sin Foto', 265, 50);
        }

        // Datos principales
        doc.fontSize(10).text(`Nombres: ${pacienteData.primernombre || ''} ${pacienteData.segundonombre || ''} ${pacienteData.otrosnombres || ''}`, 15, 90);
        doc.fontSize(10).text(`Apellidos: ${pacienteData.primerapellido || ''} ${pacienteData.segundoapellido || ''} ${pacienteData.apellidocasada || ''}`, 15, 105);
        doc.fontSize(10).text(`No. Afiliación: ${pacienteData.noafiliacion}`, 15, 120);
        doc.fontSize(10).text(`DPI: ${pacienteData.dpi}`, 15, 135);
        doc.fontSize(10).text(`Dirección: ${pacienteData.direccion}`, 15, 150, { width: 220 });
        doc.fontSize(10).text(`Fecha Nacimiento: ${pacienteData.fechanacimiento}`, 15, 165);
        doc.fontSize(10).text(`Sexo: ${pacienteData.sexo}`, 15, 180);
        doc.fontSize(10).text(`Fecha Ingreso: ${pacienteData.fechaingreso}`, 15, 195);

        // Tabla de turnos (5 filas)
        doc.fontSize(11).text('Turnos:', 15, 210);
        const startX = 15, startY = 225, rowH = 18, colW = 65;
        // Encabezados
        doc.rect(startX, startY, colW * 3, rowH).stroke();
        doc.fontSize(10).text('Fecha', startX + 5, startY + 5);
        doc.text('Hora', startX + colW + 5, startY + 5);
        doc.text('Observaciones', startX + colW * 2 + 5, startY + 5);
        // 5 filas vacías
        for (let i = 1; i <= 5; i++) {
            doc.rect(startX, startY + rowH * i, colW * 3, rowH).stroke();
        }

        // Finalizar PDF
        doc.end();

        // Esperar a que el PDF se guarde antes de continuar
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        // Verificar existencia de claves foráneas (idcausa solo si viene)
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

        const query = `INSERT INTO tbl_pacientes (
            noafiliacion, dpi, nopacienteproveedor, primernombre, segundonombre, 
            otrosnombres, primerapellido, segundoapellido, apellidocasada, fechanacimiento, sexo, direccion, fechaingreso, iddepartamento, idestado, idacceso, numeroformulario, fechainicioperiodo, fechafinperiodo, observaciones, urlfoto, idjornada
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) RETURNING *`;

        const values = [
            parseInt(pacienteData.noafiliacion),
            pacienteData.dpi,
            parseInt(pacienteData.nopacienteproveedor),
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
            parseInt(pacienteData.iddepartamento),
            1, // idestado fijo a 1
            parseInt(pacienteData.idacceso),
            pacienteData.numeroformulario || null,
            pacienteData.fechainicioperiodo || null,
            pacienteData.fechafinperiodo || null,
            pacienteData.observaciones || null,
            pacienteData.urlfoto || null,
            parseInt(pacienteData.idjornada)
        ];

        console.log('Ejecutando consulta:', query);
        console.log('Con valores:', values);

        const result = await client.query(query, values);

        // === CREACIÓN AUTOMÁTICA DE TURNOS DE HEMODIÁLISIS ===
        // Validar que los campos necesarios vengan en el request
        if (pacienteData.periodoinicio && pacienteData.periodofin && pacienteData.idjornada && pacienteData.idclinica) {
            // 1. Obtener días de la jornada del paciente
            const jornadaResult = await client.query('SELECT dias FROM tbl_jornadas WHERE idjornada = $1', [pacienteData.idjornada]);
            if (!jornadaResult.rows.length) throw new Error('Jornada no encontrada');
            const diasJornada = jornadaResult.rows[0].dias.split(',').map(d => d.trim().toLowerCase()); // Ej: ["lunes", "miércoles", "viernes"]

            // 2. Preparar fechas de turnos
            const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
            let fecha = new Date(pacienteData.periodoinicio);
            const fechaFin = new Date(pacienteData.periodofin);

            while (fecha <= fechaFin) {
                const dia = diasSemana[fecha.getDay()];
                if (diasJornada.includes(dia)) {
                    await client.query(
                        `INSERT INTO tbl_turnos (noafiliacion, idclinica, idturnoestado, fechacreacion, fechaturno)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [
                            pacienteData.noafiliacion,
                            pacienteData.idclinica,
                            1, // idturnoestado = 1 (activo o pendiente)
                            new Date(), // fechacreacion
                            new Date(fecha) // fechaturno
                        ]
                    );
                }
                fecha.setDate(fecha.getDate() + 1);
            }
        }
        // === FIN CREACIÓN AUTOMÁTICA DE TURNOS ===

        await client.query('COMMIT');

        // Enviar PDF como descarga automática y guardar en servidor
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${carnetFileName}"`);
        const carnetBuffer = await fs.promises.readFile(carnetPath);
        res.status(201).end(carnetBuffer);
        // Si necesitas también la data del paciente, puedes enviar un JSON con la ruta al PDF en otro endpoint.
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en registro de paciente:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            detail: error.detail
        });

        let statusCode = 500;
        let errorMessage = 'Error al registrar el paciente';

        if (error.code === '23505') {
            statusCode = 409;
            errorMessage = 'Ya existe un paciente con este número de afiliación';
        } else if (error.code === '23502') {
            statusCode = 400;
            errorMessage = 'Faltan campos obligatorios';
        } else if (error.code === '23503') {
            statusCode = 400;
            errorMessage = 'Error en relación con tablas vinculadas: ' + error.detail;
        } else if (error.message.includes('No existe registro')) {
            statusCode = 400;
            errorMessage = error.message;
        }

        res.status(statusCode).json({
            error: errorMessage,
            details: error.detail || error.message,
            code: error.code
        });
    } finally {
        client.release();
    }
});
// Obtener causas de egreso activas
app.get('/causas-egreso', async (req, res) => {
    try {
        const result = await pool.query('SELECT idcausa, descripcion FROM tbl_causaegreso WHERE estado = true ORDER BY descripcion');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener causas de egreso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener estados de paciente activos
app.get('/estados-paciente', async (req, res) => {
    try {
        const result = await pool.query('SELECT idestado, descripcion FROM tbl_estadospaciente WHERE estado = true ORDER BY descripcion');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener estados de paciente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener accesos vasculares activos
app.get('/accesos-vasculares', async (req, res) => {
    try {
        const result = await pool.query('SELECT idacceso, descripcion FROM tbl_accesovascular WHERE estado = true ORDER BY descripcion');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener accesos vasculares:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener todos los departamentos
app.get('/departamentos', async (req, res) => {
    try {
        const result = await pool.query('SELECT idDepartamento, nombre FROM tbl_departamentos ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener departamentos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener paciente por ID
app.get('/pacientes/:paciente_id', async (req, res) => {
    try {
        const { paciente_id } = req.params;
        const result = await pool.query(`
            SELECT 
                pac.noafiliacion, 
                pac.dpi, 
                pac.nopacienteproveedor, 
                pac.primernombre, 
                pac.segundonombre, 
                pac.otrosnombres, 
                pac.primerapellido, 
                pac.segundoapellido, 
                pac.apellidocasada, 
                pac.edad, 
                to_char(pac.fechanacimiento, 'YYYY-MM-DD') as fechanacimiento, 
                pac.sexo, 
                pac.direccion, 
                to_char(pac.fechaingreso, 'YYYY-MM-DD') as fechaingreso,
                dep.nombre AS departamento, 
                pac.estanciaprograma, 
                estp.descripcion AS estado, 
                acc.descripcion AS accesovascular, 
                cau.descripcion AS causaegreso, 
                pac.numeroformulario, 
                pac.fechainicioperiodo,
                pac.fechafinperiodo,
                pac.sesionesautorizadasmes,
                pac.urlfoto
            FROM tbl_pacientes pac
            LEFT JOIN tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
            LEFT JOIN tbl_estadospaciente estp ON pac.idestado = estp.idestado
            LEFT JOIN tbl_accesovascular acc ON pac.idacceso = acc.idacceso
            LEFT JOIN tbl_causaegreso cau ON pac.idcausa = cau.idcausa
            WHERE pac.noafiliacion = $1
        `, [paciente_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ detail: "Paciente no encontrado" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Actualizar paciente por No. Afiliación
app.put('/pacientes/:noafiliacion', async (req, res) => {
    console.log('--- [PUT /pacientes/:noafiliacion] ---');
    console.log('NoAfiliacion (URL param):', req.params.noafiliacion);
    console.log('Body recibido:', req.body);

    const { noafiliacion } = req.params;
    const {
        primerNombre, segundoNombre, primerApellido, segundoApellido,
        numeroformulario, sesionesautorizadasmes, fechainicioperiodo,
        fechafinperiodo, observaciones, urlfoto
        // Agrega aquí otros campos requeridos
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE tbl_pacientes SET
                primernombre = COALESCE($1, primernombre),
                segundonombre = COALESCE($2, segundonombre),
                primerapellido = COALESCE($3, primerapellido),
                segundoapellido = COALESCE($4, segundoapellido),
                numeroformulario = COALESCE($5, numeroformulario),
                sesionesautorizadasmes = COALESCE($6, sesionesautorizadasmes),
                fechainicioperiodo = COALESCE($7, fechainicioperiodo),
                fechafinperiodo = COALESCE($8, fechafinperiodo),
                observaciones = COALESCE($9, observaciones),
                urlfoto = COALESCE($10, urlfoto)
            WHERE noafiliacion = $11`,
            [
                primerNombre || null,
                segundoNombre || null,
                primerApellido || null,
                segundoApellido || null,
                numeroformulario || null,
                sesionesautorizadasmes || null,
                fechainicioperiodo || null,
                fechafinperiodo || null,
                observaciones || null,
                urlfoto || null,
                noafiliacion
            ]
        );
        console.log('Resultado de la query:', result);
        console.log('Filas afectadas:', result.rowCount);

        if (result.rowCount > 0) {
            console.log('Paciente actualizado correctamente');
            res.json({ success: true });
        } else {
            console.warn('No se encontró el paciente con noafiliacion:', noafiliacion);
            res.status(404).json({ success: false, detail: 'Paciente no encontrado' });
        }
    } catch (error) {
        console.error('Error al actualizar paciente:', error);
        res.status(500).json({ success: false, detail: 'Error al actualizar paciente', error: error.message });
    }
    console.log('--- [FIN PUT /pacientes/:noafiliacion] ---');
});

// Obtener datos del paciente
app.get('/consultaPacientes', async (req, res) => {
    try {
        const { noafiliacion } = req.query;
        if (!noafiliacion) {
            return res.status(400).json({ detail: "Debe proporcionar el número de afiliación" });
        }
        const result = await pool.query(`
            SELECT 
                pac.noafiliacion, 
                pac.dpi, 
                pac.nopacienteproveedor, 
                pac.primernombre, 
                pac.segundonombre, 
                pac.otrosnombres, 
                pac.primerapellido, 
                pac.segundoapellido, 
                pac.apellidocasada, 
                pac.edad, 
                pac.fechanacimiento, 
                pac.sexo, 
                pac.direccion, 
                pac.fechaingreso, 
                dep.nombre AS departamento, 
                pac.estanciaprograma, 
                estp.descripcion AS estado, 
                acc.descripcion AS accesovascular, 
                cau.descripcion AS causaegreso, 
                pac.numeroformulario, 
                pac.periodoprestservicios, 
                pac.sesionesautorizadasmes
            FROM 
                tbl_pacientes pac
            FULL JOIN 
                tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
            FULL JOIN 
                tbl_estadospaciente estp ON pac.idestado = estp.idestado
            FULL JOIN 
                tbl_accesovascular acc ON pac.idacceso = acc.idacceso
            FULL JOIN 
                tbl_causaegreso cau ON pac.idcausa = cau.idcausa
            WHERE 
                pac.noafiliacion = $1
        `, [noafiliacion]);

        if (result.rows.length === 0) {
            return res.status(404).json({ detail: "Paciente no encontrado" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ detail: "Error al obtener datos del paciente", message: err.message });
    }
});

// Obtener asignación de pacientes
app.get('/asignacionPacientes', async (req, res) => {
    try {
        const { noafiliacion } = req.query;
        const result = await pool.query(`
            SELECT 
                pac.noAfiliacion,
                pac.primernombre || ' ' || pac.segundonombre || ' ' || 
                pac.primerapellido || ' ' || pac.segundoapellido AS nombrepaciente,
                tur.idTurno,
                cli.descripcion AS nombreclinica,
                tur.FechaTurno
            FROM tbl_Turnos tur
            INNER JOIN tbl_pacientes pac ON tur.noAfiliacion = pac.noAfiliacion
            INNER JOIN tbl_clinica cli ON tur.idclinica = cli.idSala
            WHERE tur.idturnoestado = 2 AND pac.noAfiliacion = $1
        `, [noafiliacion]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Marcar turno como abandonado (5)
app.put('/abandonar-turno/:turno_id', async (req, res) => {
    try {
        const { turno_id } = req.params;
        await pool.query(
            'UPDATE tbl_Turnos SET idturnoestado = 5 WHERE idTurno = $1',
            [turno_id]
        );

        res.json({ message: 'Turno marcado como abandonado exitosamente' });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Crear nuevo turno
app.post('/crear-turno', async (req, res) => {
    const client = await pool.connect();
    try {
        const { noAfiliacion, clinica, fechaTurno } = req.body;

        await client.query('BEGIN');

        // Obtener el siguiente ID disponible verificando huecos en la secuencia
        const idQuery = `
            WITH RECURSIVE numeros AS (
                SELECT 1 as num
                UNION ALL
                SELECT num + 1
                FROM numeros
                WHERE num < (SELECT MAX(idTurno) FROM tbl_Turnos)
            )
            SELECT MIN(numeros.num) as siguiente_id
            FROM numeros
            LEFT JOIN tbl_Turnos ON tbl_Turnos.idTurno = numeros.num
            WHERE tbl_Turnos.idTurno IS NULL;
        `;

        const idResult = await client.query(idQuery);
        let nuevoId = idResult.rows[0]?.siguiente_id;

        // Si no hay huecos en la secuencia, usar MAX + 1
        if (!nuevoId) {
            const maxIdResult = await client.query('SELECT COALESCE(MAX(idTurno), 0) + 1 as nuevo_id FROM tbl_Turnos');
            nuevoId = maxIdResult.rows[0].nuevo_id;
        }

        // Insertar el nuevo turno con estado inicial 2
        await client.query(`
            INSERT INTO tbl_Turnos (idTurno, noAfiliacion, idclinica, FechaCreacion, FechaTurno, idturnoestado)
            VALUES (
                $1,
                $2,
                (SELECT idsala FROM tbl_Clinica WHERE descripcion = $3),
                $4,
                $5,
                2
            )
        `, [nuevoId, noAfiliacion, clinica, fechaTurno, fechaTurno]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: "Turno creado exitosamente",
            turnoId: nuevoId
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ detail: err.message });
    } finally {
        client.release();
    }
});

// Endpoint para generar reporte PDF de turnos
app.get('/reporte-turnos-pdf', async (req, res) => {
    try {
        const PDFDocument = require('pdfkit');
        const { numeroafiliacion, fecha, clinica } = req.query;
        let filtros = [];
        let valores = [];
        let idx = 1;
        if (numeroafiliacion) {
            filtros.push(`t.noAfiliacion = $${idx++}`);
            valores.push(numeroafiliacion);
        }
        if (fecha) {
            filtros.push(`DATE(t.FechaTurno) = $${idx++}`);
            valores.push(fecha);
        }
        if (clinica) {
            filtros.push(`c.descripcion ILIKE $${idx++}`);
            valores.push(`%${clinica}%`);
        }
        const where = filtros.length > 0 ? 'WHERE ' + filtros.join(' AND ') : '';
        const consulta = `
            SELECT 
                t.idTurno,
                t.noAfiliacion AS numeroafiliacion,
                p.primernombre || ' ' || COALESCE(p.segundonombre,'') || ' ' || p.primerapellido || ' ' || COALESCE(p.segundoapellido,'') AS nombrepaciente,
                to_char(t.FechaTurno, 'YYYY-MM-DD') AS fecha,
                to_char(t.FechaTurno, 'HH24:MI') AS hora,
                c.descripcion AS nombreclinica,
                e.descripcion AS estado
            FROM tbl_Turnos t
            INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.noAfiliacion
            INNER JOIN tbl_clinica c ON t.idclinica = c.idsala
            INNER JOIN tbl_turnoestados e ON t.idturnoestado = e.idturnoestado
            ${where}
            ORDER BY t.FechaTurno DESC
        `;
        const result = await pool.query(consulta, valores);
        // Crear PDF
        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="reporte_turnos.pdf"');
        doc.pipe(res);
        // Logo de la clínica centrado
        const path = require('path');
        const fs = require('fs');
        const logoPath = path.join(__dirname, 'assets', 'img', 'logoClinica.png');
        let topY = doc.y;
        if (fs.existsSync(logoPath)) {
            const pageWidth = doc.page.width;
            const logoWidth = 100;
            const xLogo = (pageWidth - logoWidth) / 2;
            doc.image(logoPath, xLogo, topY, { width: logoWidth });
            topY += 50; // Altura del logo
        }
        doc.y = topY + 10;
        doc.fontSize(18).text('Reporte de Turnos', 0, doc.y, { align: 'center' });
        doc.moveDown(0.5);
        // Calcular total y rango de fechas
        const totalRegistros = result.rows.length;
        let fechas = result.rows.map(r => r.fecha).filter(Boolean);
        let rangoTexto = '';
        if (fechas.length > 0) {
            fechas.sort();
            const fechaMin = fechas[0];
            const fechaMax = fechas[fechas.length - 1];
            rangoTexto = fechaMin === fechaMax ? `Fecha: ${fechaMin}` : `Rango de fechas: ${fechaMin} a ${fechaMax}`;
        } else {
            rangoTexto = 'Sin registros de fecha';
        }
        doc.fontSize(11).font('Helvetica').text(`Total de registros: ${totalRegistros}`, { align: 'center' });
        doc.fontSize(11).font('Helvetica').text(rangoTexto, { align: 'center' });
        doc.moveDown(1.2);
        // Encabezados
        doc.fontSize(12);
        doc.font('Helvetica-Bold');
        const headers = ['AFILIACIÓN', 'PACIENTE', 'FECHA', 'CLÍNICA', 'ESTADO'];
        // Calcular ancho dinámico de columnas
        const margin = 30;
        const usableWidth = doc.page.width - margin * 2;
        // Afiliación 16%, Paciente 33%, Fecha 16%, Clínica 22%, Estado 13%
        const colPercents = [0.16, 0.33, 0.16, 0.22, 0.13]; // Suma = 1
        const colWidths = colPercents.map(p => Math.floor(usableWidth * p));
        let y = doc.y;
        let x = margin;
        // Fondo encabezado
        doc.rect(margin, y - 2, usableWidth, 18).fillAndStroke('#e4e4e4', '#000');
        doc.fillColor('#000');
        headers.forEach((header, i) => {
            doc.text(header, x, y, { width: colWidths[i], align: 'center', continued: i < headers.length - 1 });
            x += colWidths[i];
        });
        doc.font('Helvetica');
        doc.moveDown(0.5);
        // Línea horizontal bajo encabezado
        doc.moveTo(margin, doc.y).lineTo(doc.page.width - margin, doc.y).strokeColor('#bbb').stroke();
        // Líneas verticales de la tabla (encabezado y filas)
        const colPositions = [margin];
        for (let i = 0; i < colWidths.length; i++) {
            colPositions.push(colPositions[i] + colWidths[i]);
        }
        // Altura inicial de la tabla (después del encabezado)
        let tableTop = y - 2;
        let tableBottom = doc.y;
        // Dibujar líneas verticales del encabezado
        colPositions.forEach(xPos => {
            doc.moveTo(xPos, tableTop).lineTo(xPos, tableBottom).strokeColor('#bbb').stroke();
        });
        // Filas
        result.rows.forEach(row => {
            let x = margin;
            y = doc.y + 2;
            doc.font('Helvetica').fontSize(10);
            doc.text(row.numeroafiliacion, x, y, { width: colWidths[0], continued: true, lineBreak: false });
            x += colWidths[0];
            // Mostrar solo primer nombre y primer apellido
            let nombrePaciente = row.nombrepaciente || '';
            let partes = nombrePaciente.trim().split(/\s+/);
            let nombreReducido = partes[0] || '';
            if (partes.length > 1) nombreReducido += ' ' + partes[1];
            // Recorte manual del nombre reducido para que nunca se parta
            let maxWidth = colWidths[1];
            let fontSize = 10;
            doc.font('Helvetica').fontSize(fontSize);
            while (doc.widthOfString(nombreReducido) > maxWidth && nombreReducido.length > 0) {
                nombreReducido = nombreReducido.slice(0, -1);
            }
            if (nombreReducido !== (partes[0] + (partes[1] ? ' ' + partes[1] : ''))) {
                if (nombreReducido.length > 3) nombreReducido = nombreReducido.slice(0, -3) + '...';
                else nombreReducido = nombreReducido + '...';
            }
            doc.text(nombreReducido, x, y, { width: colWidths[1], continued: true, lineBreak: false });
            x += colWidths[1];
            doc.text(row.fecha, x, y, { width: colWidths[2], continued: true, lineBreak: false });
            x += colWidths[2];
            doc.text(row.nombreclinica, x, y, { width: colWidths[3], continued: true, lineBreak: false });
            x += colWidths[3];
            doc.text(row.estado, x, y, { width: colWidths[4], continued: false, lineBreak: false });
            // Línea horizontal inferior de la fila
            doc.moveTo(margin, doc.y + 14).lineTo(doc.page.width - margin, doc.y + 14).strokeColor('#bbb').stroke();
            // Dibujar líneas verticales de la fila
            colPositions.forEach(xPos => {
                doc.moveTo(xPos, y).lineTo(xPos, y + 16).strokeColor('#bbb').stroke();
            });
            // Forzar avanzar a la siguiente línea después de imprimir todos los campos
            doc.y = y + 16;
        });
        doc.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint para generar reporte Excel de turnos
app.get('/reporte-turnos', async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const { numeroafiliacion, fecha, clinica } = req.query;
        let filtros = [];
        let valores = [];
        let idx = 1;
        if (numeroafiliacion) {
            filtros.push(`t.noAfiliacion = $${idx++}`);
            valores.push(numeroafiliacion);
        }
        if (fecha) {
            filtros.push(`DATE(t.FechaTurno) = $${idx++}`);
            valores.push(fecha);
        }
        if (clinica) {
            filtros.push(`c.descripcion ILIKE $${idx++}`);
            valores.push(`%${clinica}%`);
        }
        const where = filtros.length > 0 ? 'WHERE ' + filtros.join(' AND ') : '';
        const consulta = `
            SELECT 
                t.idTurno,
                t.noAfiliacion AS numeroafiliacion,
                p.primernombre || ' ' || COALESCE(p.segundonombre,'') || ' ' || p.primerapellido || ' ' || COALESCE(p.segundoapellido,'') AS nombrepaciente,
                to_char(t.FechaTurno, 'YYYY-MM-DD') AS fecha,
                to_char(t.FechaTurno, 'HH24:MI') AS hora,
                c.descripcion AS nombreclinica,
                e.descripcion AS estado
            FROM tbl_Turnos t
            INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.noAfiliacion
            INNER JOIN tbl_clinica c ON t.idclinica = c.idsala
            INNER JOIN tbl_turnoestados e ON t.idturnoestado = e.idturnoestado
            ${where}
            ORDER BY t.FechaTurno DESC
        `;
        const result = await pool.query(consulta, valores);
        // Crear Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Turnos');
        worksheet.columns = [
            { header: 'Afiliación', key: 'numeroafiliacion', width: 15 },
            { header: 'Paciente', key: 'nombrepaciente', width: 30 },
            { header: 'Fecha', key: 'fecha', width: 15 },
            { header: 'Hora', key: 'hora', width: 10 },
            { header: 'Clínica', key: 'nombreclinica', width: 20 },
            { header: 'Estado', key: 'estado', width: 15 }
        ];
        worksheet.addRows(result.rows);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="reporte_turnos.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Consultar todos los turnos con filtros
app.get('/turnos', async (req, res) => {
    try {
        const { numeroafiliacion, fecha, clinica } = req.query;
        let filtros = [];
        let valores = [];
        let idx = 1;
        if (numeroafiliacion) {
            filtros.push(`t.noAfiliacion = $${idx++}`);
            valores.push(numeroafiliacion);
        }
        if (fecha) {
            filtros.push(`DATE(t.FechaTurno) = $${idx++}`);
            valores.push(fecha);
        }
        if (clinica) {
            filtros.push(`c.descripcion ILIKE $${idx++}`);
            valores.push(`%${clinica}%`);
        }
        const where = filtros.length > 0 ? 'WHERE ' + filtros.join(' AND ') : '';
        const consulta = `
            SELECT 
                t.idTurno,
                t.noAfiliacion AS numeroafiliacion,
                p.primernombre || ' ' || COALESCE(p.segundonombre,'') || ' ' || p.primerapellido || ' ' || COALESCE(p.segundoapellido,'') AS nombrepaciente,
                to_char(t.FechaTurno, 'YYYY-MM-DD') AS fecha,
                to_char(t.FechaTurno, 'HH24:MI') AS hora,
                c.descripcion AS nombreclinica,
                e.descripcion AS estado
            FROM tbl_Turnos t
            INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.noAfiliacion
            INNER JOIN tbl_clinica c ON t.idclinica = c.idsala
            INNER JOIN tbl_turnoestados e ON t.idturnoestado = e.idturnoestado
            ${where}
            ORDER BY t.FechaTurno DESC
        `;
        const result = await pool.query(consulta, valores);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener turno más antiguo por clínica
app.get('/turno-mas-antiguo/:clinica', async (req, res) => {
    try {
        const { clinica } = req.params;
        const consultaTurnoMasAntiguo = `
            SELECT 
                t.idTurno,
                t.noAfiliacion,
                p.primernombre || ' ' || p.segundonombre || ' ' || 
                p.primerapellido || ' ' || p.segundoapellido AS nombrepaciente,
                c.descripcion AS nombreclinica,
                t.FechaTurno,
                t.FechaAsignacion,
                p.urlfoto
            FROM tbl_Turnos t
            INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.noAfiliacion
            INNER JOIN tbl_clinica c ON t.idclinica = c.idsala
            WHERE c.descripcion = $1 AND t.idturnoestado = 3
            ORDER BY t.FechaAsignacion ASC
            LIMIT 1
        `;

        const result = await pool.query(consultaTurnoMasAntiguo, [clinica]);

        if (result.rows.length === 0) {
            res.json(null);
        } else {
            res.json(result.rows[0]);
        }
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Obtener turno más antiguo asignado
app.get('/turno-mas-antiguo-asignado/:clinica', async (req, res) => {
    try {
        const { clinica } = req.params;
        const consultaTurnoMasAntiguo = `
            SELECT 
                t.idTurno,
                t.noAfiliacion,
                p.primernombre || ' ' || p.segundonombre || ' ' || 
                p.primerapellido || ' ' || p.segundoapellido AS nombrepaciente,
                c.descripcion AS nombreclinica,
                t.FechaTurno,
                t.FechaAsignacion,
                p.urlfoto
            FROM tbl_Turnos t
            INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.noAfiliacion
            INNER JOIN tbl_clinica c ON t.idclinica = c.idsala
            WHERE c.descripcion = $1 AND t.idturnoestado = 1
            ORDER BY t.FechaAsignacion ASC
            LIMIT 1
        `;

        const result = await pool.query(consultaTurnoMasAntiguo, [clinica]);

        if (result.rows.length === 0) {
            res.json(null);
        } else {
            res.json(result.rows[0]);
        }
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Llamar turno (cambiar estado a 3)
app.put('/llamar-turno/:turno_id', async (req, res) => {
    try {
        const { turno_id } = req.params;
        await pool.query(
            'UPDATE tbl_Turnos SET idturnoestado = 3 WHERE idTurno = $1',
            [turno_id]
        );

        res.json({ message: 'Turno llamado exitosamente' });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Obtener turno llamado actualmente
app.get('/turnoLlamado', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.noAfiliacion,
                p.primernombre || ' ' || p.segundonombre || ' ' || 
                p.primerapellido || ' ' || p.segundoapellido AS nombrepaciente,
                c.descripcion AS nombreclinica,
                t.FechaTurno,
                p.urlfoto
            FROM tbl_Turnos t
            INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.noAfiliacion
            INNER JOIN tbl_clinica c ON t.idclinica = c.idsala
            WHERE t.idturnoestado = 3
            ORDER BY t.FechaTurno DESC
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            res.json(null);
        } else {
            res.json(result.rows[0]);
        }
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Obtener turno llamado
app.get('/turno-llamado', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                t.idTurno,
                t.FechaTurno,
                c.descripcion as clinica,
                p.primernombre || ' ' || p.segundonombre || ' ' || p.primerapellido || ' ' || p.segundoapellido as paciente,
                p.urlfoto
            FROM tbl_Turnos t
            JOIN tbl_clinica c ON t.idclinica = c.idSala
            JOIN tbl_pacientes p ON t.noAfiliacion = p.noAfiliacion
            WHERE t.idturnoestado = 2
            ORDER BY t.FechaTurno DESC
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            return res.status(404).json({ detail: "No hay turno llamado actualmente" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Actualizar turno
app.put('/actualizar-turno/:turno_id', async (req, res) => {
    try {
        const { turno_id } = req.params;
        const { fechaTurno } = req.body;
        await pool.query(
            'UPDATE tbl_Turnos SET FechaTurno = $1 WHERE idTurno = $2',
            [fechaTurno, turno_id]
        );

        res.json({ success: true, message: "Turno actualizado exitosamente" });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Finalizar turno
app.put('/finalizar-turno/:turno_id', async (req, res) => {
    try {
        const { turno_id } = req.params;
        await pool.query(
            'UPDATE tbl_Turnos SET idturnoestado = 4 WHERE idTurno = $1',
            [turno_id]
        );

        res.json({ message: `Turno ${turno_id} finalizado manualmente` });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Asignar turno (cambia a estado 1)
app.put('/asignar-turno/:turno_id', async (req, res) => {
    try {
        const { turno_id } = req.params;
        await pool.query(
            'UPDATE tbl_Turnos SET idturnoestado = 1, fechaasignacion=now() WHERE idTurno = $1',
            [turno_id]
        );

        res.json({
            success: true,
            message: "Turno asignado exitosamente"
        });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Llamar turno (cambia a estado 3)
app.put('/llamar-turno/:turno_id', async (req, res) => {
    try {
        const { turno_id } = req.params;
        await pool.query(
            'UPDATE tbl_Turnos SET idturnoestado = 3 WHERE idTurno = $1',
            [turno_id]
        );

        res.json({
            success: true,
            message: "Turno llamado exitosamente"
        });
    } catch (err) {
        res.status(500).json({ detail: err.message });
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

// Obtener turnos siguientes
app.get('/turnos-siguientes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.noAfiliacion,
                p.primernombre || ' ' || p.segundonombre || ' ' || 
                p.primerapellido || ' ' || p.segundoapellido AS nombrepaciente,
                c.descripcion AS nombreclinica,
                t.FechaTurno,
                p.urlfoto
            FROM tbl_Turnos t
            INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.noAfiliacion
            INNER JOIN tbl_clinica c ON t.idclinica = c.idsala
            WHERE t.idturnoestado = 1
            ORDER BY t.FechaTurno ASC
            LIMIT 5
        `);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Obtener todos los pacientes
app.get('/pacientes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                pac.noafiliacion, 
                pac.dpi, 
                pac.nopacienteproveedor, 
                pac.primernombre, 
                pac.segundonombre, 
                pac.otrosnombres, 
                pac.primerapellido, 
                pac.segundoapellido, 
                pac.apellidocasada, 
                pac.edad, 
                pac.fechanacimiento, 
                pac.sexo, 
                pac.direccion, 
                pac.fechaingreso, 
                dep.nombre AS departamento, 
                pac.estanciaprograma, 
                estp.descripcion AS estado, 
                acc.descripcion AS AccesoVascular, 
                cau.descripcion AS CausaEgreso, 
                pac.numeroformulario, 
                pac.periodoprestservicios, 
                pac.sesionesautorizadasmes
            FROM 
                tbl_pacientes pac
            FULL JOIN 
                tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
            FULL JOIN 
                tbl_estadospaciente estp ON pac.idestado = estp.idestado
            FULL JOIN 
                tbl_accesovascular acc ON pac.idacceso = acc.idacceso
            FULL JOIN 
                tbl_causaegreso cau ON pac.idcausa = cau.idcausa
            ORDER BY pac.primernombre, pac.primerapellido
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Crear nuevo paciente
app.post('/pacientes', async (req, res) => {
    const client = await pool.connect();
    try {
        const { noAfiliacion, primerNombre, segundoNombre, primerApellido, segundoApellido } = req.body;

        // Verificar si el paciente ya existe
        const existeResult = await client.query(
            'SELECT noAfiliacion FROM tbl_pacientes WHERE noAfiliacion = $1',
            [noAfiliacion]
        );

        if (existeResult.rows.length > 0) {
            return res.status(400).json({
                detail: 'Ya existe un paciente con este número de afiliación'
            });
        }

        await client.query('BEGIN');

        await client.query(`
            INSERT INTO tbl_pacientes (
                noAfiliacion, 
                primerNombre, 
                segundoNombre, 
                primerApellido, 
                segundoApellido
            ) VALUES ($1, $2, $3, $4, $5)
        `, [noAfiliacion, primerNombre, segundoNombre, primerApellido, segundoApellido]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: "Paciente registrado exitosamente"
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ detail: err.message });
    } finally {
        client.release();
    }
});

app.put('/pacientes/:noAfiliacion', async (req, res) => {
    const client = await pool.connect();
    try {
        const { noAfiliacion } = req.params;
        const { idcausa, causaegreso, fechaegreso, nocasoconcluido, observaciones, comorbilidades, fechafallecimiento, lugarfallecimiento, causafallecimiento, desdeEgreso, desdeReingreso, primerNombre, segundoNombre, primerApellido, segundoApellido, numeroformulario, sesionesautorizadasmes, fechainicioperiodo, fechafinperiodo } = req.body;

        await client.query('BEGIN');
        let result;
        if (desdeReingreso) {
            // Si viene de reingreso, también actualizar idestado = 2 y limpiar campos de egreso
            result = await client.query(`
                UPDATE tbl_pacientes 
                SET 
                    primerNombre = $1, 
                    segundoNombre = $2, 
                    primerApellido = $3, 
                    segundoApellido = $4,
                    numeroformulario = $5,
                    sesionesautorizadasmes = $6,
                    fechainicioperiodo = $7,
                    fechafinperiodo = $8,
                    observaciones = $9,
                    idestado = 2,
                    idcausa = NULL,
                    causaegreso = NULL,
                    fechaegreso = NULL,
                    nocasoconcluido = NULL
                WHERE noAfiliacion = $10
                RETURNING *
            `, [primerNombre, segundoNombre, primerApellido, segundoApellido, numeroformulario, sesionesautorizadasmes, fechainicioperiodo, fechafinperiodo, observaciones, noAfiliacion]);
        } else if (desdeEgreso) {
            // Egreso de paciente (incluye fallecimiento)
            result = await client.query(`
                UPDATE tbl_pacientes
                SET
                    idestado = 3,
                    idcausa = $1,
                    causaegreso = $2,
                    fechaegreso = $3::date,
                    nocasoconcluido = $4,
                    observaciones = $5,
                    comorbilidades = COALESCE($6, NULL),
                    fechafallecido = COALESCE($7::date, NULL),
                    lugarfallecimiento = COALESCE($8, NULL),
                    causafallecimiento = COALESCE($9, NULL)
                WHERE noAfiliacion = $10
                RETURNING *
            `, [idcausa, causaegreso, fechaegreso, nocasoconcluido, observaciones, comorbilidades, fechafallecimiento, lugarfallecimiento, causafallecimiento, noAfiliacion]);
        } else {
            // Si no, no modificar idestado
            result = await client.query(`
                UPDATE tbl_pacientes 
                SET 
                    primerNombre = $1, 
                    segundoNombre = $2, 
                    primerApellido = $3, 
                    segundoApellido = $4,
                    numeroformulario = $5,
                    sesionesautorizadasmes = $6,
                    fechainicioperiodo = $7,
                    fechafinperiodo = $8,
                    observaciones = $9
                WHERE noAfiliacion = $10
                RETURNING *
            `, [primerNombre, segundoNombre, primerApellido, segundoApellido, numeroformulario, sesionesautorizadasmes, fechainicioperiodo, fechafinperiodo, observaciones, noAfiliacion]);
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ detail: 'Paciente no encontrado' });
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: "Paciente actualizado exitosamente",
            paciente: result.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error en PUT /pacientes/:noAfiliacion:', err.message, err.stack);
        res.status(500).json({ detail: err.message });
    } finally {
        client.release();
    }
});

// Obtener paciente por número de afiliación
app.get('/pacientes/:noAfiliacion', async (req, res) => {
    try {
        const { noAfiliacion } = req.params;
        const result = await pool.query(
            'SELECT * FROM tbl_pacientes WHERE noAfiliacion = $1',
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

// Buscar paciente por DPI o número de afiliación
app.get('/pacientes/buscar', async (req, res) => {
    try {
        const { valor } = req.query;

        if (!valor) {
            return res.status(400).json({
                detail: 'Debe especificar valor de búsqueda'
            });
        }

        const query = `
            SELECT 
                pac.noafiliacion, 
                pac.dpi, 
                pac.nopacienteproveedor, 
                pac.primernombre, 
                pac.segundonombre, 
                pac.otrosnombres, 
                pac.primerapellido, 
                pac.segundoapellido, 
                pac.apellidocasada, 
                pac.edad, 
                to_char(pac.fechanacimiento, 'YYYY-MM-DD') as fechanacimiento, 
                pac.sexo, 
                pac.direccion, 
                to_char(pac.fechaingreso, 'YYYY-MM-DD') as fechaingreso, 
                dep.nombre AS departamento, 
                pac.estanciaprograma, 
                estp.descripcion AS estado, 
                acc.descripcion AS accesovascular, 
                cau.descripcion AS causaegreso, 
                pac.numeroformulario, 
                pac.periodoprestservicios, 
                pac.sesionesautorizadasmes
            FROM 
                tbl_pacientes pac
            LEFT JOIN 
                tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
            LEFT JOIN 
                tbl_estadospaciente estp ON pac.idestado = estp.idestado
            LEFT JOIN 
                tbl_accesovascular acc ON pac.idacceso = acc.idacceso
            LEFT JOIN 
                tbl_causaegreso cau ON pac.idcausa = cau.idcausa
            WHERE 
                pac.noafiliacion = $1`;
        const result = await pool.query(query, [valor]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                detail: `No se encontró ningún paciente con número de afiliación: ${valor}`
            });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Endpoint para subir foto de paciente
app.post('/upload-photo', async (req, res) => {
    try {
        console.log('Recibiendo solicitud de subida de foto');
        const { noAfiliacion, photo } = req.body;

        console.log('Tipo de datos recibidos:', {
            noAfiliacion: typeof noAfiliacion,
            photo: typeof photo,
            photoLength: photo ? photo.length : 0,
            photoStart: photo ? photo.substring(0, 50) + '...' : 'no photo'
        });

        // Validar datos requeridos
        if (!noAfiliacion || !photo) {
            console.error('Faltan datos requeridos:', { noAfiliacion: !!noAfiliacion, photo: !!photo });
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos' });
        }

        console.log('Procesando foto para paciente:', noAfiliacion);

        // Verificar si el paciente existe
        const pacienteExiste = await pool.query(
            'SELECT 1 FROM tbl_pacientes WHERE noafiliacion = $1',
            [noAfiliacion]
        );

        if (pacienteExiste.rows.length === 0) {
            console.error('Paciente no encontrado:', noAfiliacion);
            return res.status(404).json({
                success: false,
                message: 'No se encontró el paciente con el número de afiliación proporcionado'
            });
        }

        // Procesar la imagen
        let base64Data;
        try {
            // Verificar si la foto es una cadena
            if (typeof photo !== 'string') {
                throw new Error('La foto debe ser una cadena base64');
            }

            // Aceptar diferentes formatos de imagen
            if (photo.startsWith('data:image')) {
                const parts = photo.split(',');
                if (parts.length !== 2) {
                    throw new Error('Formato data URL inválido');
                }
                base64Data = parts[1];
            } else {
                base64Data = photo;
            }

            // Verificar que sea un base64 válido y no esté vacío
            if (!base64Data || base64Data.trim() === '') {
                throw new Error('La imagen está vacía');
            }

            // Verificar que sea un base64 válido
            if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
                throw new Error('La cadena no es un base64 válido');
            }
        } catch (err) {
            console.error('Error al procesar la imagen:', err);
            return res.status(400).json({
                success: false,
                message: 'El formato de la imagen no es válido. Debe ser una imagen JPEG en base64'
            });
        }

        const fileName = `${noAfiliacion}.jpg`;
        const filePath = path.join(__dirname, 'fotos', fileName);

        // Crear la carpeta si no existe
        try {
            if (!fs.existsSync(path.join(__dirname, 'fotos'))) {
                fs.mkdirSync(path.join(__dirname, 'fotos'));
            }
        } catch (err) {
            console.error('Error al crear directorio de fotos:', err);
            throw new Error('No se pudo crear el directorio para almacenar las fotos');
        }

        // Guardar el archivo
        try {
            fs.writeFileSync(filePath, base64Data, 'base64');
        } catch (err) {
            console.error('Error al escribir el archivo:', err);
            throw new Error('No se pudo guardar el archivo de imagen');
        }

        // Actualizar la base de datos
        try {
            await pool.query(
                'UPDATE tbl_pacientes SET urlfoto = $1 WHERE noafiliacion = $2',
                [filePath, noAfiliacion]
            );
        } catch (err) {
            console.error('Error al actualizar la base de datos:', err);
            // Intentar eliminar el archivo si falló la actualización de la BD
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkErr) {
                console.error('Error al eliminar archivo después de fallo en BD:', unlinkErr);
            }
            throw new Error('No se pudo actualizar la información en la base de datos');
        }

        console.log('Foto guardada exitosamente para paciente:', noAfiliacion);
        res.json({ success: true, message: 'Foto guardada exitosamente' });
    } catch (error) {
        console.error('Error al guardar la foto:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: 'Error interno al guardar la foto: ' + error.message
        });
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
        const fotoPath = path.join(__dirname, 'fotos', `${noAfiliacion}.jpg`);
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

// Endpoint para exportar reporte de pacientes fallecidos en Excel
app.get('/api/reportes/fallecidos/excel', async (req, res) => {
    try {
        const { fechainicio, fechafin } = req.query;
        let baseQuery = `
            SELECT 
                pac.noafiliacion, pac.dpi, pac.nopacienteproveedor, 
                CONCAT_WS(' ', pac.primernombre, pac.segundonombre, pac.otrosnombres, pac.primerapellido, pac.segundoapellido, pac.apellidocasada) as nombrecompleto, 
                TO_CHAR(pac.fechanacimiento, 'YYYY-MM-DD') as fechanacimiento, pac.sexo, pac.direccion, dep.nombre as departamento, 
                TO_CHAR(pac.fechaingreso, 'YYYY-MM-DD') as fechaingreso, 
                pac.comorbilidades, TO_CHAR(pac.fechaegreso, 'YYYY-MM-DD') as fechafallecimiento, 
                pac.sesionesrealizadasmes, pac.lugarfallecimiento, pac.causafallecimiento
            FROM tbl_pacientes pac
            LEFT JOIN tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
            LEFT JOIN tbl_estadospaciente est ON pac.idestado = est.idestado
            LEFT JOIN tbl_causaegreso cau ON pac.idcausa = cau.idcausa
            WHERE est.descripcion = 'Egreso' AND (cau.descripcion ILIKE '%fallec%')
        `;
        let params = [];
        let idx = 1;
        if (fechainicio) {
            baseQuery += ` AND pac.fechainicioperiodo >= $${idx}`;
            params.push(fechainicio);
            idx++;
        }
        if (fechafin) {
            baseQuery += ` AND pac.fechainicioperiodo <= $${idx}`;
            params.push(fechafin);
            idx++;
        }
        baseQuery += ' ORDER BY pac.fechainicioperiodo DESC';
        const result = await pool.query(baseQuery, params);
        const pacientes = result.rows.map(p => {
            // Calcular edad
            let edad = '';
            if (p.fechanacimiento) {
                const fechaNac = new Date(p.fechanacimiento);
                const hoy = new Date(p.fechafallecimiento);
                let anios = hoy.getFullYear() - fechaNac.getFullYear();
                const m = hoy.getMonth() - fechaNac.getMonth();
                if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
                    anios--;
                }
                edad = anios;
            }
            // Periodo
            let periodo = '';
            if (p.fechainicioperiodo && p.fechafinperiodo) {
                periodo = `${p.fechainicioperiodo} al ${p.fechafinperiodo}`;
            }return{
                noafiliacion: p.noafiliacion,
                dpi: p.dpi,
                nopacienteproveedor: p.nopacienteproveedor,
                nombrecompleto: p.nombrecompleto,
                edad: edad,
                fechanacimiento: p.fechanacimiento,
                sexo: p.sexo,
                direccion: p.direccion,
                departamento: p.departamento,
                fechaingreso: p.fechaingreso,
                comorbilidades: p.comorbilidades,
                fechafallecimiento: p.fechafallecimiento,
                sesionesrealizadasmes: p.sesionesrealizadasmes,
                lugarfallecimiento: p.lugarfallecimiento,
                causafallecimiento: p.causafallecimiento

            };
        });
        const ExcelJS = require("exceljs");
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Fallecidos');
         // Insertar logo y título
         const logoPath = __dirname + '/assets/img/logoClinica.png';
         if (fs.existsSync(logoPath)) {
             const imageId = workbook.addImage({
                 filename: logoPath,
                 extension: 'png',
             });
             worksheet.addImage(imageId, {
                 tl: { col: 0, row: 0 }, // A1
                 br: { col: 2, row: 7 }  // B7
             });
         }
          // Insertar título de la fila 1 a la 7 en columnas C a Q (centrado)
        worksheet.mergeCells('D3:P5');
        worksheet.getCell('D3').value = 'REPORTE PACIENTES FALLECIDOS';
        worksheet.getCell('D3').alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getCell('D3').font = { name: 'Arial', size: 28, bold: true, color: { argb: 'b03a2e' } };

        for (let col = 4; col <= 19; col++) { // D1 a S1
            worksheet.getCell(1, col).value = null;
        }
        
        worksheet.columns = [
            { header: 'No. Afiliación', key: 'noafiliacion', width: 15 },
            { header: 'DPI', key: 'dpi', width: 18 },
            { header: 'Número Proveedor', key: 'nopacienteproveedor', width: 18 },
            { header: 'Nombre Completo', key: 'nombrecompleto', width: 32 },
            { header: 'Edad', key: 'edad', width: 10 },
            { header: 'Fecha de Nacimiento', key: 'fechanacimiento', width: 18 },
            { header: 'Sexo', key: 'sexo', width: 8 },
            { header: 'Dirección', key: 'direccion', width: 24 },
            { header: 'Departamento', key: 'departamento', width: 18 },
            { header: 'Fecha Ingreso', key: 'fechaingreso', width: 16 },
            { header: 'Comorbilidades', key: 'comorbilidades', width: 22 },
            { header: 'Fecha Fallecimiento', key: 'fechafallecimiento', width: 16 },
            { header: 'Sesiones Realizadas', key: 'sesionesrealizadasmes', width: 16 },
            { header: 'Lugar Fallecimiento', key: 'lugarfallecimiento', width: 20 },
            { header: 'Causa de Fallecimiento', key: 'causafallecimiento', width: 24 }
        ];
        const startRow = 8;
         // Encabezados personalizados (fila 8)
         worksheet.getRow(startRow).values = worksheet.columns.map(col => col.header);
        
        result.rows.forEach((p, i) => {
            worksheet.getRow(startRow + 1 + i).values = [
                p.noafiliacion || '',
                p.dpi || '',
                p.nopacienteproveedor || '',
                p.nombrecompleto|| '',
                p.edad|| '',
                p.fechanacimiento || '',
                p.sexo || '',
                p.direccion || '',
                p.departamento || '',
                p.fechaingreso || '',
                p.comorbilidades || '',
                p.fechafallecimiento || '',
                p.sesionesrealizadasmes || '',
                p.lugarfallecimiento || '',
                p.causafallecimiento || ''
            ];
        });
        for (let i = 1; i < startRow; i++) {
            const row = worksheet.getRow(i);
            if (row && row.values && Array.isArray(row.values)) {
                const isHeaderRow = row.values.join(' ').toLowerCase().includes('no. afiliación') && row.values.length > 3;
                if (isHeaderRow) row.values = [];
            }
        }
        worksheet.addTable({
            name: 'PacientesFallecidosTable',
            ref: `A${startRow}`,
            headerRow: true,
            totalsRow: false,
            style: {
                theme: 'TableStyleMedium10',
                showRowStripes: true
            },
            columns: worksheet.columns.map(col => ({ name: col.header, filterButton: true })),
            rows: pacientes.map(p => [
                p.noafiliacion || '',
                p.dpi || '',
                p.nopacienteproveedor || '',
                p.nombrecompleto|| '',
                p.edad|| '',
                p.fechanacimiento || '',
                p.sexo || '',
                p.direccion || '',
                p.departamento || '',
                p.fechaingreso || '',
                p.comorbilidades || '',
                p.fechafallecimiento || '',
                p.sesionesrealizadasmes || '',
                p.lugarfallecimiento || '',
                p.causafallecimiento || ''
            ])
        });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="reporte_fallecidos.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ error: 'Error al exportar Excel de fallecidos.', detalle: error.message });
    }
});

// Endpoint para eliminar un turno por ID
app.delete('/eliminar-turno/:idturno', async (req, res) => {
    const { idturno } = req.params;
    try {
        // Eliminar el turno de la tabla tbl_turnos
        const result = await pool.query('DELETE FROM tbl_turnos WHERE idturno = $1', [idturno]);
        if (result.rowCount > 0) {
            res.json({ success: true, message: 'Turno eliminado correctamente.' });
        } else {
            res.status(404).json({ success: false, message: 'Turno no encontrado.' });
        }
    } catch (error) {
        console.error('Error al eliminar turno:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar turno.', detalle: error.message });
    }
});

app.post('/registrar-faltista', async (req, res) => {
    const { noafiliacion, fechaFalta, motivoFalta } = req.body;
    if (!noafiliacion || !fechaFalta || !motivoFalta) {
        return res.status(400).json({ success: false, message: 'Faltan datos requeridos.' });
    }
    try {
        await pool.query(
            'INSERT INTO tbl_faltistas (noafiliacion, fechaFalta, motivoFalta) VALUES ($1, $2, $3)',
            [noafiliacion, fechaFalta, motivoFalta]
        );
        res.json({ success: true, message: 'Faltista registrado correctamente.' });
    } catch (error) {
        console.error('Error al registrar faltista:', error);
        res.status(500).json({ success: false, message: 'Error al registrar faltista.', detalle: error.message });
    }
});