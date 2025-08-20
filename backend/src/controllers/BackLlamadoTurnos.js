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

// Obtener clínicas
app.get('/clinicas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tbl_clinica');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ detail: err.message });
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
            INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.noAfiliacion
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
            INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.noAfiliacion
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

