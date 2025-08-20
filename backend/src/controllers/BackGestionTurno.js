// Endpoint para obtener jornadas
app.get('/jornadas', async (req, res) => {
    try {
        const result = await pool.query('SELECT idjornada, descripcion, dias FROM tbl_jornadas where estado=true ORDER BY descripcion ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener jornadas.' });
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

// Obtener asignación de pacientes
app.get('/asignacionPacientes', async (req, res) => {
    try {
        const { noafiliacion } = req.query;
        const result = await pool.query(`
            SELECT 
                pac.noAfiliacion,
                pac.primernombre || ' ' || pac.segundonombre || ' ' || 
                pac.primerapellido || ' ' || pac.segundoapellido AS nombrepaciente,
                tur.idTurno,
                cli.descripcion AS nombreclinica,
                tur.FechaTurno
            FROM tbl_Turnos tur
            INNER JOIN tbl_pacientes pac ON tur.noAfiliacion = pac.noAfiliacion
            INNER JOIN tbl_clinica cli ON tur.idclinica = cli.idSala
            WHERE tur.idturnoestado = 2 AND pac.noAfiliacion = $1
        `, [noafiliacion]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Crear nuevo turno
app.post('/crear-turno', async (req, res) => {
    const client = await pool.connect();
    try {
        const { noAfiliacion, clinica, fechaTurno } = req.body;

        await client.query('BEGIN');

        // Obtener el siguiente ID disponible verificando huecos en la secuencia
        const idQuery = `
            WITH RECURSIVE numeros AS (
                SELECT 1 as num
                UNION ALL
                SELECT num + 1
                FROM numeros
                WHERE num < (SELECT MAX(idTurno) FROM tbl_Turnos)
            )
            SELECT MIN(numeros.num) as siguiente_id
            FROM numeros
            LEFT JOIN tbl_Turnos ON tbl_Turnos.idTurno = numeros.num
            WHERE tbl_Turnos.idTurno IS NULL;
        `;

        const idResult = await client.query(idQuery);
        let nuevoId = idResult.rows[0]?.siguiente_id;

        // Si no hay huecos en la secuencia, usar MAX + 1
        if (!nuevoId) {
            const maxIdResult = await client.query('SELECT COALESCE(MAX(idTurno), 0) + 1 as nuevo_id FROM tbl_Turnos');
            nuevoId = maxIdResult.rows[0].nuevo_id;
        }

        // Insertar el nuevo turno con estado inicial 2
        await client.query(`
            INSERT INTO tbl_Turnos (idTurno, noAfiliacion, idclinica, FechaCreacion, FechaTurno, idturnoestado)
            VALUES (
                $1,
                $2,
                (SELECT idsala FROM tbl_Clinica WHERE descripcion = $3),
                $4,
                $5,
                2
            )
        `, [nuevoId, noAfiliacion, clinica, fechaTurno, fechaTurno]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: "Turno creado exitosamente",
            turnoId: nuevoId
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ detail: err.message });
    } finally {
        client.release();
    }
});

// Actualizar turno
app.put('/actualizar-turno/:turno_id', async (req, res) => {
    try {
        const { turno_id } = req.params;
        const { fechaTurno } = req.body;
        await pool.query(
            'UPDATE tbl_Turnos SET FechaTurno = $1 WHERE idTurno = $2',
            [fechaTurno, turno_id]
        );

        res.json({ success: true, message: "Turno actualizado exitosamente" });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});


// Endpoint para eliminar un turno por ID
app.delete('/eliminar-turno/:idturno', async (req, res) => {
    const { idturno } = req.params;
    try {
        // Eliminar el turno de la tabla tbl_turnos
        const result = await pool.query('DELETE FROM tbl_turnos WHERE idturno = $1', [idturno]);
        if (result.rowCount > 0) {
            res.json({ success: true, message: 'Turno eliminado correctamente.' });
        } else {
            res.status(404).json({ success: false, message: 'Turno no encontrado.' });
        }
    } catch (error) {
        console.error('Error al eliminar turno:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar turno.', detalle: error.message });
    }
});