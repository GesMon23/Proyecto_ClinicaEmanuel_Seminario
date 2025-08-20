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