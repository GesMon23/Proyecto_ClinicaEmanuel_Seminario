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