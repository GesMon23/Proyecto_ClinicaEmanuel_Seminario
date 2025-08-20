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

// Endpoint para actualizar el estado de un turno llamado a 6
app.put('/turnoLlamado/:idturno', async (req, res) => {
    const { idturno } = req.params;
    const { idturnoestado } = req.body;
    try {
        // Si no se manda un estado, por defecto 6 (como antes)
        const nuevoEstado = idturnoestado ? parseInt(idturnoestado, 10) : 6;
        await pool.query('CALL actualizar_estado_turno($1, $2)', [idturno, nuevoEstado]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error al actualizar el estado del turno:', error);
        res.status(500).json({ error: 'Error al actualizar el estado del turno.' });
    }
});