app.get('/departamentos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * from FN_mostrar_departamentos()');
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

// Endpoint para obtener jornadas
app.get('/jornadas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * from FN_mostrar_jornadas()');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener jornadas.' });
    }
});

// Endpoint para obtener los estados de paciente
app.get('/estados-paciente', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM FN_mostrar_estados_paciente()');
res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los estados de paciente.', detalle: error.message });
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

// Endpoint para obtener paciente por número de afiliación O DPI
app.get('/paciente/:identificador', async (req, res) => {
    const { identificador } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('CALL SP_Mostrar_paciente_actualizacion($1, $2)', [identificador, 'paciente_cursor']);
        const result = await client.query('FETCH ALL FROM paciente_cursor');
        await client.query('COMMIT');
        res.json(result.rows);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error al obtener datos del paciente', detalle: error.message });
    } finally {
        client.release();
    }
});


// Actualizar paciente por No. Afiliación
app.put('/pacientes/:noafiliacion', async (req, res) => {
    console.log('--- [PUT /pacientes/:noafiliacion] ---');
    console.log('NoAfiliacion (URL param):', req.params.noafiliacion);
    console.log('Body recibido:', req.body);

    const { noafiliacion } = req.params;
const {
    usuarioActualizacion,
    dpi,
    primerNombre,
    segundoNombre,
    otrosNombres,
    primerApellido,
    segundoApellido,
    apellidoCasada,
    fechaNacimiento,
    sexo,
    direccion,
    idDepartamento,
    idAcceso,
    idJornada
} = req.body;
    try {
        const result = await pool.query('CALL actualizar_datos_paciente($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)', [
            usuarioActualizacion || 'sistema', // reemplaza por usuario autenticado
            noafiliacion,
            dpi || null,
            primerNombre || null,
            segundoNombre || null,
            otrosNombres || null,
            primerApellido || null,
            segundoApellido || null,
            apellidoCasada || null,
            fechaNacimiento || null,
            sexo || null,
            direccion || null,
            idDepartamento || null,
            idAcceso || null,
            idJornada || null
          ]);
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

// Endpoint para subir/reemplazar foto de paciente

//Pendiente Arreglar SP
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
        await pool.query('CALL actualizar_urlfoto_paciente($1, $2)', [filename, noAfiliacion]);
        res.json({ success: true, url: `/fotos/${filename}` });
    } catch (err) {
        console.error('Error al subir foto:', err);
        res.status(500).json({ detail: 'Error al guardar la foto.' });
    }
});