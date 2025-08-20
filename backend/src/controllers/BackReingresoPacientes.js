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

// Endpoint para buscar pacientes para reingreso (usando función en PostgreSQL)
app.get('/api/pacientes/reingreso', async (req, res) => {
    const { dpi, noafiliacion } = req.query;

    if (!dpi && !noafiliacion) {
        return res.status(400).json({ error: 'Debe proporcionar dpi o noafiliacion.' });
    }

    try {
        const result = await pool.query(
            `SELECT * FROM fn_buscar_pacientes_reingreso($1, $2)`,
            [dpi || null, noafiliacion || null]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Paciente no encontrado para reingreso.' });
        }

        res.json(result.rows);
    } catch (error) {
        console.error('Error al buscar pacientes para reingreso:', error);
        res.status(500).json({ error: 'Error al buscar pacientes para reingreso.', detalle: error.message });
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