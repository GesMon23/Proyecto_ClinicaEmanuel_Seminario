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