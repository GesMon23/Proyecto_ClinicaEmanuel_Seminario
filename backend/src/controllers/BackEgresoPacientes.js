// Endpoint para obtener causas de egreso activas
app.get('/causas-egreso', async (req, res) => {
    try {
        const result = await pool.query('SELECT idcausa, descripcion FROM tbl_causaegreso WHERE estado=true ORDER BY descripcion ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener causas de egreso.' });
    }
});

// Endpoint para buscar pacientes para egreso
app.get('/api/pacientes/egreso', async (req, res) => {
    const { dpi, noafiliacion } = req.query;
    let baseQuery = `
        SELECT 
    pac.noafiliacion, pac.dpi, pac.nopacienteproveedor, pac.primernombre, pac.segundonombre, pac.otrosnombres, pac.primerapellido, pac.segundoapellido, pac.apellidocasada, pac.fechanacimiento, pac.sexo, pac.direccion, pac.fechaegreso, pac.nocasoconcluido, pac.idcausa, pac.causaegreso, 
    cau.descripcion as causaegreso_descripcion,
    pac.urlfoto, pac.iddepartamento, dep.nombre as departamento_nombre, pac.idestado, est.descripcion as estado_descripcion,
    pac.idacceso, acc.descripcion as acceso_descripcion,
    pac.idjornada, jor.descripcion as jornada_descripcion,
    pac.fechainicioperiodo, pac.fechafinperiodo, pac.sesionesautorizadasmes AS sesionesautorizadas, pac.observaciones
FROM tbl_pacientes pac
LEFT JOIN tbl_causaegreso cau ON pac.idcausa = cau.idcausa
LEFT JOIN tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
LEFT JOIN tbl_estadospaciente est ON pac.idestado = est.idestado
LEFT JOIN tbl_accesovascular acc ON pac.idacceso = acc.idacceso
LEFT JOIN tbl_jornadas jor ON pac.idjornada = jor.idjornada
WHERE pac.idestado != 3`;
    let params = [];
    if (dpi) {
        baseQuery += ' AND pac.dpi = $1';
        params.push(dpi);
    } else if (noafiliacion) {
        baseQuery += ' AND pac.noafiliacion = $1';
        params.push(noafiliacion);
    } else {
        return res.status(400).json({ error: 'Debe proporcionar dpi o noafiliacion.' });
    }
    try {
        const result = await pool.query(baseQuery, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar pacientes para egreso.', detalle: error.message });
    }
});

app.put('/pacientes/:noAfiliacion', async (req, res) => {
    const client = await pool.connect();
    try {
        const { noAfiliacion } = req.params;
        const { idcausa, causaegreso, fechaegreso, nocasoconcluido, observaciones, comorbilidades, fechafallecimiento, lugarfallecimiento, causafallecimiento, desdeEgreso, desdeReingreso, primerNombre, segundoNombre, primerApellido, segundoApellido, numeroformulario, sesionesautorizadasmes, fechainicioperiodo, fechafinperiodo } = req.body;

        await client.query('BEGIN');
        let result;
        if (desdeReingreso) {
            // Si viene de reingreso, también actualizar idestado = 2 y limpiar campos de egreso
            result = await client.query(`
                UPDATE tbl_pacientes 
                SET 
                    primerNombre = $1, 
                    segundoNombre = $2, 
                    primerApellido = $3, 
                    segundoApellido = $4,
                    numeroformulario = $5,
                    sesionesautorizadasmes = $6,
                    fechainicioperiodo = $7,
                    fechafinperiodo = $8,
                    observaciones = $9,
                    idestado = 2,
                    idcausa = NULL,
                    causaegreso = NULL,
                    fechaegreso = NULL,
                    nocasoconcluido = NULL
                WHERE noAfiliacion = $10
                RETURNING *
            `, [primerNombre, segundoNombre, primerApellido, segundoApellido, numeroformulario, sesionesautorizadasmes, fechainicioperiodo, fechafinperiodo, observaciones, noAfiliacion]);
        } else if (desdeEgreso) {
            // Egreso de paciente (incluye fallecimiento)
            result = await client.query(`
                UPDATE tbl_pacientes
                SET
                    idestado = 3,
                    idcausa = $1,
                    causaegreso = $2,
                    fechaegreso = $3::date,
                    nocasoconcluido = $4,
                    observaciones = $5,
                    comorbilidades = COALESCE($6, NULL),
                    fechafallecido = COALESCE($7::date, NULL),
                    lugarfallecimiento = COALESCE($8, NULL),
                    causafallecimiento = COALESCE($9, NULL)
                WHERE noAfiliacion = $10
                RETURNING *
            `, [idcausa, causaegreso, fechaegreso, nocasoconcluido, observaciones, comorbilidades, fechafallecimiento, lugarfallecimiento, causafallecimiento, noAfiliacion]);
        } else {
            // Si no, no modificar idestado
            result = await client.query(`
                UPDATE tbl_pacientes 
                SET 
                    primerNombre = $1, 
                    segundoNombre = $2, 
                    primerApellido = $3, 
                    segundoApellido = $4,
                    numeroformulario = $5,
                    sesionesautorizadasmes = $6,
                    fechainicioperiodo = $7,
                    fechafinperiodo = $8,
                    observaciones = $9
                WHERE noAfiliacion = $10
                RETURNING *
            `, [primerNombre, segundoNombre, primerApellido, segundoApellido, numeroformulario, sesionesautorizadasmes, fechainicioperiodo, fechafinperiodo, observaciones, noAfiliacion]);
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ detail: 'Paciente no encontrado' });
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: "Paciente actualizado exitosamente",
            paciente: result.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error en PUT /pacientes/:noAfiliacion:', err.message, err.stack);
        res.status(500).json({ detail: err.message });
    } finally {
        client.release();
    }
});
