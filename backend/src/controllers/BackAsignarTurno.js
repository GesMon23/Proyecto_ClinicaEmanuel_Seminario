// Obtener paciente por número de afiliación para encontrar foto_url
app.get('/pacientes/:noAfiliacion', async (req, res) => {
    try {
        const { noAfiliacion } = req.params;
        const result = await pool.query(
            'SELECT FN_Mostrar_url_foto($1) AS urlfoto',
            [noAfiliacion]
        );

        if (!result.rows[0] || !result.rows[0].urlfoto) {
            return res.status(404).json({ detail: "Paciente no encontrado" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});


// Obtener asignación de pacientes
app.get('/asignacionPacientes', async (req, res) => {
    try {
        const { noafiliacion } = req.query;
        const result = await pool.query(`
            SELECT * FROM FN_Mostrar_Turnos_Creados_Paciente($1)
        `, [noafiliacion]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});



// Asignar turno
app.put('/asignar-turno/:turnoId', async (req, res) => {
    try {
        const { turnoId } = req.params;
        const { idUsuarioAsignado } = req.body; // Asegúrate de enviar este campo desde el frontend
        await pool.query('CALL SP_Asignar_Turnos($1, $2)', [turnoId, idUsuarioAsignado]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});


// Faltar Turno
app.put('/faltar-turno/:idturno', async (req, res) => {
    try {
        const { idturno } = req.params;
        const { idUsuarioAsignado } = req.body;
        await pool.query('CALL SP_Faltar_Turnos($1, $2)', [idturno, idUsuarioAsignado]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error al actualizar el estado del turno:', error);
        res.status(500).json({ error: 'Error al actualizar el estado del turno.' });
    }
});


// Registrar Faltista
app.post('/registrar-faltista', async (req, res) => {
    const { noafiliacion, idClinica, fechaFalta, motivoFalta, usuarioCreacion } = req.body;
    if (!noafiliacion || !idClinica || !fechaFalta || !motivoFalta || !usuarioCreacion) {
        return res.status(400).json({ success: false, message: 'Faltan datos requeridos.' });
    }
    try {
        await pool.query(
            'CALL SP_Registrar_Faltista($1, $2, $3, $4, $5)',
            [noafiliacion, idClinica, fechaFalta, motivoFalta, usuarioCreacion]
        );
        res.json({ success: true, message: 'Faltista registrado correctamente.' });
    } catch (error) {
        console.error('Error al registrar faltista:', error);
        res.status(500).json({ success: false, message: 'Error al registrar faltista.', detalle: error.message });
    }
});



//PENDIENTE
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