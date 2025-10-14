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
app.use(cors({
    origin: 'http://localhost:3000',
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
app.use(backEgresoPacientes);
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
// Endpoints de auth/usuarios ahora están en BackLogin.js



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
                    CONCAT_WS(' ', p.primer_nombre, COALESCE(p.segundo_nombre, ''), COALESCE(p.primer_apellido, ''), COALESCE(p.segundo_apellido, '')) AS nombrepaciente,
                    c.descripcion AS nombreclinica,
                    p.url_foto AS urlfoto
                FROM tbl_turnos t
                INNER JOIN tbl_pacientes p ON t.noafiliacion = p.no_afiliacion
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

// /check-photo robusto (acepta con o sin extensión y usa resolveFotoPath)
app.get('/check-photo/:id', async (req, res) => {
    try {
        const raw = String(req.params.id || '').trim();
        const id = raw.replace(/\.[a-zA-Z0-9]+$/, ''); // si vino 123.jpg -> 123

        // Lee desde DB la url_foto (si existe)
        let dbRow = null;
        try {
            const r = await pool.query(
                'SELECT url_foto FROM public.tbl_pacientes WHERE no_afiliacion = $1',
                [id]
            );
            dbRow = r.rows?.[0] || null;
        } catch (_) { }

        const paciente = { urlfoto: dbRow?.url_foto || null };

        // Usa helper para resolver la ruta real en /fotos (acepta .jpg/.jpeg/.png/.webp y nombres raros)
        const fotoPath = resolveFotoPath(paciente, id);

        // Soporte debug opcional
        const wantDebug = 'debug' in req.query;

        if (fotoPath) {
            const filename = path.basename(fotoPath);
            return res.json({
                exists: true,
                filename,
                url: `/fotos/${filename}`,
                ...(wantDebug ? { fotosDir, resolvedFrom: paciente.urlfoto || null, absolutePath: fotoPath } : {})
            });
        }

        let sample = undefined;
        if (wantDebug) {
            try { sample = fs.readdirSync(fotosDir).slice(0, 50); } catch (_) { }
        }

        return res.json({
            exists: false,
            ...(wantDebug ? { fotosDir, dbUrl: paciente.urlfoto || null, lookedForId: id, sample } : {})
        });
    } catch (e) {
        console.error('Error en /check-photo:', e);
        return res.status(500).json({ exists: false, error: 'internal_error' });
    }
});


// Configuración de la base de datos
const ExcelJS = require("exceljs");

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
    LEFT JOIN tbl_departamento dep ON pac.iddepartamento = dep.id_departamento
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
            LEFT JOIN tbl_departamento dep ON pac.iddepartamento = dep.id_departamento
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
            LEFT JOIN tbl_departamento dep ON pac.iddepartamento = dep.id_departamento
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
    LEFT JOIN tbl_departamento dep ON pac.iddepartamento = dep.id_departamento
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
    LEFT JOIN tbl_departamento dep ON pac.iddepartamento = dep.id_departamento
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
            doc.fillColor(blanco).text(h, colX + 4, y + 8, { width: colWidths[i] - 8, align: 'center' });
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
    LEFT JOIN tbl_departamento dep ON pac.iddepartamento = dep.id_departamento
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
                LEFT JOIN tbl_departamento dep ON pac.iddepartamento = dep.id_departamento
                LEFT JOIN tbl_estadospaciente estp ON pac.idestado = estp.idestado
                LEFT JOIN tbl_accesovascular acc ON pac.idacceso = acc.idacceso
                LEFT JOIN tbl_causaegreso cau ON pac.idcausa = cau.idcausa
                WHERE pac.no_afiliacion = $1
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
                    tbl_departamento dep ON pac.iddepartamento = dep.id_departamento
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
                INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.no_Afiliacion
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
                INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.no_Afiliacion
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
                INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.no_Afiliacion
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
                INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.no_Afiliacion
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
                INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.no_Afiliacion
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
                INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.no_Afiliacion
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
                JOIN tbl_pacientes p ON t.noAfiliacion = p.no_Afiliacion
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
                INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.no_Afiliacion
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
                    tbl_departamento dep ON pac.iddepartamento = dep.id_departamento
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

// Endpoint duplicado de actualización de paciente (reingreso/egreso) eliminado.
// La lógica ha sido migrada a:
// - `backend/src/controllers/BackReingresoPacientes.js`
// - `backend/src/controllers/BackEgresoPacientes.js`

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
                    tbl_departamento dep ON pac.iddepartamento = dep.id_departamento
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

// Endpoint para exportar reporte de pacientes fallecidos en Excel
app.get('/api/reportes/fallecidos/excel', async (req, res) => {
    try {
        // Resto del código...
    } catch (error) {
        // Resto del código...
    }
});

app.use(backCatalogosRouter);