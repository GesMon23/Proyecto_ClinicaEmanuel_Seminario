// Endpoint para obtener jornadas
app.get('/jornadas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * from FN_mostrar_jornadas()');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener jornadas.' });
    }
});


// PUT /api/pacientes/masivo
router.put('/api/pacientes/masivo', async (req, res) => {
    const { pacientes, usuario } = req.body;

    // Validaciones iniciales
    if (!Array.isArray(pacientes) || pacientes.length === 0) {
        return res.status(400).json({ error: 'Debe enviar un arreglo de pacientes.' });
    }

    if (!usuario) {
        return res.status(400).json({ error: 'Debe especificar el usuario que realiza la actualización.' });
    }

    try {
        // Llamar al Stored Procedure
        await pool.query('CALL sp_actualizar_pacientes_masivo($1, $2)', [
            JSON.stringify(pacientes),
            usuario
        ]);

        res.json({ success: true, mensaje: 'Pacientes actualizados e historial registrado correctamente.' });
    } catch (error) {
        console.error('Error en actualización masiva:', error);
        res.status(500).json({
            error: 'Error al actualizar pacientes.',
            detalle: error.message
        });
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


// Endpoint para obtener paciente por número de afiliación con descripciones de llaves foráneas
app.get('/pacientes/:noafiliacion', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM fn_Mostrar_Pacientes_Tabla_Formularios($1)',
            [req.params.noafiliacion]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener paciente.', detalle: error.message });
    }
});