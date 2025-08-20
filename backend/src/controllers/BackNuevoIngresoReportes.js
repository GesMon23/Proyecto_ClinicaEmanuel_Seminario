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