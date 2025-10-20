
// [4:54 p.m., 14/9/2025] Gesler Monzon: tipo
// 20259HEM1
// [4:54 p.m., 14/9/2025] Gesler Monzon: 2025-9-HEM-1
// Año-Mes-Clinica-Correlativo
// Router de Login/Roles
const express = require('express');
const pool = require('../../db/pool');
const fs = require('fs');
const path = require('path');

const router = express.Router();
router.use(express.json());
const fotosDir = path.join(__dirname, '../../fotos');
if (!fs.existsSync(fotosDir)) {
    fs.mkdirSync(fotosDir, { recursive: true });
}

// Obtener estados de turno
router.get('/GestadosTurnoT', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query("CALL sp_mostrar_estados_turno('cur1')");
        const result = await client.query('FETCH ALL FROM cur1');
        await client.query('COMMIT');

        res.json(result.rows);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ detail: err.message });
    } finally {
        client.release();
    }
});


// Endpoint para obtener jornadas
router.get('/jornadas', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query("CALL sp_mostrar_jornadas_turnos('cur_jornadas')");
        const result = await client.query('FETCH ALL FROM cur_jornadas');
        await client.query('COMMIT');

        res.json(result.rows || []);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en /jornadas (BackGestionTurno):', error);
        res.status(500).json({ error: 'Error al obtener jornadas.' });
    } finally {
        client.release();
    }
});


// Endpoint para obtener clínicas
router.get('/GclinicasT', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query("CALL sp_mostrar_clinicas('cur_clinicas')");
        const result = await client.query('FETCH ALL FROM cur_clinicas');
        await client.query('COMMIT');

        res.json(result.rows || []);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ detail: err.message });
    } finally {
        client.release();
    }
});


// Endpoint para obtener paciente por número de afiliación con descripciones de llaves foráneas
router.get('/GpacientesT/:noafiliacion', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query("CALL sp_mostrar_paciente_detalle($1, 'cur_paciente')", [req.params.noafiliacion]);
        const result = await client.query('FETCH ALL FROM cur_paciente');
        await client.query('COMMIT');

        if (!result.rows.length) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error al obtener paciente.', detalle: error.message });
    } finally {
        client.release();
    }
});


// Obtener asignación de pacientes
router.get('/GmuestraTurnosT', async (req, res) => {
    try {
        const { noafiliacion } = req.query;
        await pool.query('BEGIN');
        await pool.query('CALL sp_mostrar_turnos_t($1, $2)', [noafiliacion, 'ref_cursor']);
        const result = await pool.query('FETCH ALL FROM ref_cursor');
        await pool.query('COMMIT');

        res.json(result.rows);
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ detail: err.message });
    }
});

router.get('/GmuestraTurnosFaltantesT', async (req, res) => {
    try {
        const { noafiliacion } = req.query;
        await pool.query('BEGIN');
        await pool.query('CALL sp_mostrar_turnos_faltantes_t($1, $2)', [noafiliacion, 'ref_cursor']);
        const result = await pool.query('FETCH ALL FROM ref_cursor');
        await pool.query('COMMIT');

        res.json(result.rows);
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ detail: err.message });
    }
});


// Crear nuevo turno
router.post('/Gcrear-turnoT', async (req, res) => {
    const client = await pool.connect();
    try {
        const { noAfiliacion, clinica, fechaTurno } = req.body;

        await client.query('BEGIN');

        // Llamar al procedimiento almacenado
        const result = await client.query(`
            CALL sp_crear_turno_t($1, $2, $3, $4)
        `, [noAfiliacion, clinica, fechaTurno, null]);

        // Obtener el valor del parámetro OUT
        const fetchResult = await client.query('SELECT $1::VARCHAR AS id_turno_cod', [null]); // placeholder para compatibilidad

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Turno creado exitosamente',
            turnoId: fetchResult.rows[0].id_turno_cod
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ detail: err.message });
    } finally {
        client.release();
    }
});


// Endpoint para registrar faltista
router.post('/Gregistrar-faltistaT', async (req, res) => {
    const client = await pool.connect();
    try {
        const { noafiliacion, fechaFalta, motivoFalta, nombreClinica } = req.body;

        if (!noafiliacion || !fechaFalta || !motivoFalta || !nombreClinica) {
            return res.status(400).json({
                success: false,
                message: 'Faltan datos requeridos.'
            });
        }

        await client.query('BEGIN');
        await client.query(
            'CALL sp_registrar_faltista_t($1, $2, $3, $4)',
            [noafiliacion, fechaFalta, motivoFalta, nombreClinica]
        );
        await client.query('COMMIT');

        res.json({ success: true, message: 'Faltista registrado correctamente.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al registrar faltista:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar faltista.',
            detalle: error.message
        });
    } finally {
        client.release();
    }
});

// Endpoint para mostrar turnos en consulta turnos
router.get('/GturnosT', async (req, res) => {
    const client = await pool.connect();
    try {
        const { numeroafiliacion, fecha, clinica, estado } = req.query;

        await client.query('BEGIN');
        await client.query(`
            CALL sp_mostrar_turnos_todos(
                $1,  -- p_no_afiliacion
                $2,  -- p_fecha
                $3,  -- p_clinica
                $4,  -- p_estado
                'ref_cursor'  -- cursor name as string, not a parameter
            )
        `, [
            numeroafiliacion || null,
            fecha || null,
            clinica || null,
            estado || null
        ]);

        const result = await client.query('FETCH ALL FROM ref_cursor');

        await client.query('COMMIT');

        res.json(result.rows);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al obtener turnos:', err);
        res.status(500).json({
            error: 'Error al obtener turnos',
            detalle: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    } finally {
        client.release();
    }
});

// Actualizar turno
router.put('/Gactualizar-turnoT/:turno_id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { turno_id } = req.params;
        const { fechaTurno, clinica } = req.body;

        if (!fechaTurno || !clinica) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos.' });
        }

        await client.query('BEGIN');
        await client.query(
            'CALL sp_actualizar_turno_simple($1, $2, $3)',
            [turno_id, fechaTurno, clinica]
        );
        await client.query('COMMIT');

        res.json({ success: true, message: 'Turno actualizado exitosamente' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al actualizar turno:', err);
        res.status(500).json({ detail: err.message });
    } finally {
        client.release();
    }
});

router.put('/Gfaltante-turnoT/:idturno', async (req, res) => {
    const client = await pool.connect();
    try {
        const { idturno } = req.params;

        await client.query('BEGIN');
        await client.query('CALL sp_marcar_turno_faltante($1)', [idturno]);
        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Turno marcado como faltante'
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al marcar turno como faltante:', err);
        res.status(500).json({ detail: err.message });
    } finally {
        client.release();
    }
});


// Endpoint para eliminar un turno por ID
router.delete('/Geliminar-turnoT/:idturno', async (req, res) => {
    const client = await pool.connect();
    try {
        const { idturno } = req.params;

        await client.query('BEGIN');
        await client.query('CALL sp_eliminar_turno($1)', [idturno]);
        await client.query('COMMIT');

        res.json({ success: true, message: 'Turno eliminado correctamente.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al eliminar turno:', error);

        if (error.message.includes('No se encontró el turno')) {
            return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
        }

        res.status(500).json({ success: false, message: 'Error al eliminar turno.', detalle: error.message });
    } finally {
        client.release();
    }
});


// Obtener el siguiente turno para una clínica específica por su descripción
router.get('/Gsiguiente-turnoT/:descripcionClinica', async (req, res) => {
    const client = await pool.connect();
    try {
        setNoCacheHeaders(res);
        const { descripcionClinica } = req.params;
        const cursorName = 'ref_cursor';
        await client.query('BEGIN');
        await client.query('CALL sp_siguiente_turno($1, $2)', [descripcionClinica, cursorName]);
        const result = await client.query(`FETCH ALL FROM ${cursorName}`);
        await client.query('COMMIT');
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No hay turnos pendientes para esta clínica' });
        }
        res.json(result.rows);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al obtener el siguiente turno:', error);
        res.status(500).json({ error: 'Error al obtener el siguiente turno', detalle: error.message });
    } finally {
        client.release();
    }
});


// Obtener el turno actual en estado 4 (llamado) para una clínica
const setNoCacheHeaders = (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
};

router.get('/Gturno-actual/:descripcionClinica', async (req, res) => {
    const client = await pool.connect();
    try {
        setNoCacheHeaders(res);

        const { descripcionClinica } = req.params;
        const cursorName = 'ref_cursor';
        await client.query('BEGIN');
        await client.query('CALL sp_turno_actual($1, $2)', [descripcionClinica, cursorName]);
        const result = await client.query(`FETCH ALL FROM ${cursorName}`);
        await client.query('COMMIT');
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No hay turno actual en estado de llamado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al obtener el turno actual:', error);
        res.status(500).json({ error: 'Error al obtener el turno actual', detalle: error.message });
    } finally {
        client.release();
    }
});


// Asignar turno (cambia a estado 1)
router.put('/Gasignar-turnoT/:turno_id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { turno_id } = req.params;

        await client.query('BEGIN');
        await client.query('CALL sp_asignar_turno($1)', [turno_id]);
        await client.query('COMMIT');

        res.json({
            success: true,
            message: "Turno asignado exitosamente"
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al asignar el turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error al asignar el estado del turno',
            error: error.message
        });
    } finally {
        client.release();
    }
});


// Actualizar estado del turno a Llamado (4)
router.put('/Gactualizar-estado-llamadoT/:idTurno', async (req, res) => {
    const client = await pool.connect();
    try {
        const { idTurno } = req.params;
        const cursorName = 'ref_cursor';

        await client.query('BEGIN');

        // Llamar al procedimiento
        await client.query('CALL sp_actualizar_estado_llamado($1, $2)', [idTurno, cursorName]);

        // Traer resultados del cursor
        const result = await client.query(`FETCH ALL FROM ${cursorName}`);

        await client.query('COMMIT');

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Turno no encontrado' });
        }

        res.json({
            success: true,
            message: 'Turno actualizado a Llamado',
            turno: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al actualizar estado del turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el estado del turno',
            error: error.message
        });
    } finally {
        client.release();
    }
});



router.put('/Gabandonar-turnoT/:idTurno', async (req, res) => {
    const client = await pool.connect();
    try {
        const { idTurno } = req.params;
        const cursorName = 'ref_cursor';

        await client.query('BEGIN');

        // Llamar al procedimiento
        await client.query('CALL sp_abandonar_turno($1, $2)', [idTurno, cursorName]);

        // Traer resultados del cursor
        const result = await client.query(`FETCH ALL FROM ${cursorName}`);

        await client.query('COMMIT');

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Turno no encontrado' });
        }

        res.json({
            success: true,
            message: 'El turno fue marcado como abandonado. El paciente no se presentó a su cita.',
            turno: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al actualizar estado del turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el estado del turno',
            error: error.message
        });
    } finally {
        client.release();
    }
});


router.put('/Gfinalizar-turnoT/:idTurno', async (req, res) => {
    const client = await pool.connect();
    try {
        const { idTurno } = req.params;
        const cursorName = 'ref_cursor';

        await client.query('BEGIN');

        // Llamar al procedimiento
        await client.query('CALL sp_finalizar_turno($1, $2)', [idTurno, cursorName]);

        // Traer resultados del cursor
        const result = await client.query(`FETCH ALL FROM ${cursorName}`);

        await client.query('COMMIT');

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Turno no encontrado' });
        }

        res.json({
            success: true,
            message: 'Estado del turno actualizado a Finalizado',
            turno: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al finalizar el turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el estado del turno',
            error: error.message
        });
    } finally {
        client.release();
    }
});



// Obtener los siguientes 5 turnos de una clínica
router.get('/Gsiguientes-turnosT/:clinica', async (req, res) => {
    const client = await pool.connect();
    try {
        const { clinica } = req.params;
        const cursorName = 'ref_cursor';

        setNoCacheHeaders(res);

        await client.query('BEGIN');

        // Llamar al procedimiento
        await client.query('CALL sp_siguientes_turnos($1, $2)', [clinica, cursorName]);

        // Traer resultados del cursor
        const result = await client.query(`FETCH ALL FROM ${cursorName}`);

        await client.query('COMMIT');

        res.json({
            success: true,
            turnos: result.rows
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al obtener los siguientes turnos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los siguientes turnos',
            error: error.message
        });
    } finally {
        client.release();
    }
});


module.exports = router;