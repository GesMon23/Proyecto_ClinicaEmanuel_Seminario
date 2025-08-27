// Router de Login/Roles
const express = require('express');
const pool = require('../../db/pool');

const router = express.Router();
router.use(express.json());

// Endpoint para buscar pacientes para egreso
router.get('/api/pacientes/egreso', async (req, res) => {
    const { dpi, noafiliacion } = req.query;
    let baseQuery = `
        SELECT 
            pac.no_afiliacion, 
            pac.dpi, 
            pac.no_paciente_proveedor, 
            pac.primer_nombre, 
            pac.segundo_nombre, 
            pac.otros_nombres, 
            pac.primer_apellido, 
            pac.segundo_apellido, 
            pac.apellido_casada, 
            pac.fecha_nacimiento, 
            pac.sexo, 
            pac.direccion, 
            --pac.fecha_egreso, 
            --pac.no_caso_concluido, 
            --pac.id_causa, 
            --pac.causa_egreso, 
            --cau.descripcion as causaegreso_descripcion,
            pac.url_foto, 
            pac.id_departamento, 
            dep.nombre as departamento_nombre, 
            pac.id_estado, 
            est.descripcion as estado_descripcion,
            pac.id_acceso, 
            acc.descripcion as acceso_descripcion,
            pac.id_jornada, 
            jor.descripcion as jornada_descripcion,
            --pac.fecha_inicio_periodo, 
            --pac.fecha_fin_periodo, 
            pac.sesiones_autorizadas_mes AS sesionesautorizadas
            --pac.observaciones
        FROM tbl_pacientes pac
        --LEFT JOIN tbl_causa_egreso cau ON pac.id_causa = cau.id_causa
        LEFT JOIN tbl_departamento dep ON pac.id_departamento = dep.id_departamento
        LEFT JOIN tbl_estados_paciente est ON pac.id_estado = est.id_estado
        LEFT JOIN tbl_acceso_vascular acc ON pac.id_acceso = acc.id_acceso
        LEFT JOIN tbl_jornadas jor ON pac.id_jornada = jor.id_jornada
        WHERE pac.id_estado != 3`;
    let params = [];
    if (dpi) {
        baseQuery += ' AND pac.dpi = $1';
        params.push(dpi);
    } else if (noafiliacion) {
        baseQuery += ' AND pac.no_afiliacion = $1';
        params.push(noafiliacion);
    } else {
        return res.status(400).json({ error: 'Debe proporcionar dpi o no_afiliacion.' });
    }
    try {
        const result = await pool.query(baseQuery, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar pacientes para egreso.', detalle: error.message });
    }
});

router.put('/pacientes/:noAfiliacion', async (req, res) => {
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

// Endpoint para insertar un egreso
router.post('/egresos', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            no_afiliacion,
            id_causa_egreso,
            descripcion,
            fecha_egreso,
            observaciones
        } = req.body;

        await client.query('BEGIN');
        console.log('Payload recibido para insert:', req.body);

        // 1. Insertar egreso
        const insertQuery = `
            INSERT INTO tbl_egresos (
                no_afiliacion,
                id_causa_egreso,
                descripcion,
                fecha_egreso,
                observaciones,
                usuario_creacion,
                fecha_creacion
            )
            VALUES ($1, $2, $3, $4::date, $5, $6, NOW())
            RETURNING *;
        `;
        const insertValues = [
            no_afiliacion,
            id_causa_egreso,
            descripcion || null,
            fecha_egreso || null,
            observaciones || null,
            'nombreUsuario' // Aquí el usuario que realiza el registro
        ];
        const resultInsert = await client.query(insertQuery, insertValues);

        // 2. Actualizar estado del paciente
        const updateQuery = `
            UPDATE tbl_pacientes
            SET id_estado = 3,
                usuario_actualizacion = $2,
                fecha_actualizacion = NOW()
            WHERE no_afiliacion = $1
            RETURNING *;
        `;
        const updateValues = [
            no_afiliacion,
            'nombreUsuario' // Aquí el usuario que realiza la actualización
        ];
        const resultUpdate = await client.query(updateQuery, updateValues);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Egreso insertado y paciente actualizado correctamente',
            egreso: resultInsert.rows[0],
            paciente: resultUpdate.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error en POST /api/egresos:', err.message);
        res.status(500).json({ error: 'Error al insertar egreso', detalle: err.message });
    } finally {
        client.release();
    }
});






module.exports = router;
