const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../../db/pool');
const fs = require('fs');
const path = require('path');

const router = express.Router();
router.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// Extrae el id del usuario del JWT (claim "sub", igual que BackLogin.js)
function userIdFromRequest(req) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return null;
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const id = Number(payload.sub);
        return Number.isFinite(id) ? id : null;
    } catch {
        return null;
    }
}

// Nombre de usuario del JWT (para columnas de auditoría de texto); null si no hay sesión
function userNameFromRequest(req) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return null;
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        return payload.nombre_usuario || (payload.sub != null ? String(payload.sub) : null);
    } catch {
        return null;
    }
}

function requireUser(req, res, next) {
    const id = userIdFromRequest(req);
    if (!id) return res.status(401).json({ success: false, message: 'Sesión requerida', error: 'Sesión requerida' });
    req.userId = id;
    next();
}

// Turnos Creada que no se asignaron el día de su fecha pasan solos a Faltante
// ("No se presentó (Mensaje automático)"). El procedimiento es idempotente.
async function marcarFaltantesAutomaticos() {
    try {
        const r = await pool.query('CALL sp_marcar_faltantes_automaticos(0)');
        const total = r.rows?.[0]?.p_total || 0;
        if (total > 0) console.log(`[turnos] ${total} turno(s) Creada vencidos marcados como Faltante`);
    } catch (err) {
        console.error('[turnos] Error al marcar faltantes automáticos:', err.message);
    }
}

// Al iniciar el servidor (cubre cambios de fecha ocurridos con el sistema apagado) y cada minuto
marcarFaltantesAutomaticos();
setInterval(marcarFaltantesAutomaticos, 60 * 1000).unref();

// Errores de regla de negocio lanzados por los procedimientos (RAISE EXCEPTION 'CODIGO: mensaje')
const CODIGOS_NEGOCIO = ['USUARIO_CON_TURNO', 'TURNO_NO_DISPONIBLE', 'TURNO_NO_EN_ATENCION', 'TURNO_NO_CREADA', 'TURNO_NO_CANCELABLE'];
function responderErrorTurno(res, error, mensajeGenerico) {
    const msg = String(error.message || '');
    const codigo = CODIGOS_NEGOCIO.find(c => msg.startsWith(c));
    if (codigo) {
        const limpio = msg.slice(codigo.length).replace(/^:\s*/, '');
        return res.status(409).json({ success: false, code: codigo, message: limpio, error: limpio });
    }
    return res.status(500).json({ success: false, message: mensajeGenerico, error: msg });
}
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


// Turnos en estado Creada con fecha de turno igual a la fecha actual del servidor
router.get('/GturnosCreadosT', async (req, res) => {
    await marcarFaltantesAutomaticos();
    const client = await pool.connect();
    try {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        await client.query('BEGIN');
        await client.query("CALL sp_mostrar_turnos_creados_hoy('ref_cursor')");
        const result = await client.query('FETCH ALL FROM ref_cursor');
        await client.query('COMMIT');
        res.json(result.rows);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ detail: err.message });
    } finally {
        client.release();
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
// Cancelar turno: ya no se borra el registro, pasa a estado Cancelado
router.put('/Gcancelar-turnoT/:idturno', async (req, res) => {
    const client = await pool.connect();
    try {
        const { idturno } = req.params;

        await client.query('BEGIN');
        await client.query('CALL sp_cancelar_turno($1, $2)', [idturno, userNameFromRequest(req)]);
        await client.query('COMMIT');

        res.json({ success: true, message: 'Turno cancelado correctamente.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al cancelar turno:', error);

        if (String(error.message).startsWith('TURNO_NO_ENCONTRADO')) {
            return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
        }

        responderErrorTurno(res, error, 'Error al cancelar turno.');
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
        await client.query('CALL sp_asignar_turno($1, $2)', [turno_id, userIdFromRequest(req)]);
        await client.query('COMMIT');

        res.json({
            success: true,
            message: "Turno asignado exitosamente"
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al asignar el turno:', error);
        responderErrorTurno(res, error, 'Error al asignar el estado del turno');
    } finally {
        client.release();
    }
});


// Actualizar estado del turno a Llamado (4)
router.put('/Gactualizar-estado-llamadoT/:idTurno', requireUser, async (req, res) => {
    const client = await pool.connect();
    try {
        const { idTurno } = req.params;
        const cursorName = 'ref_cursor';

        await client.query('BEGIN');

        // Llamar al procedimiento (registra al usuario que llama el turno)
        await client.query('CALL sp_actualizar_estado_llamado($1, $2, $3)', [idTurno, req.userId, cursorName]);

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
        responderErrorTurno(res, error, 'Error al actualizar el estado del turno');
    } finally {
        client.release();
    }
});

// Turno que el usuario autenticado tiene en atención (un usuario solo puede tener uno)
router.get('/Gturno-actual-usuario', requireUser, async (req, res) => {
    const client = await pool.connect();
    try {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        await client.query('BEGIN');
        await client.query('CALL sp_turno_actual_usuario($1, $2)', [req.userId, 'ref_cursor']);
        const result = await client.query('FETCH ALL FROM ref_cursor');
        await client.query('COMMIT');
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'El usuario no tiene un turno en atención' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al obtener el turno del usuario:', error);
        res.status(500).json({ error: 'Error al obtener el turno del usuario', detalle: error.message });
    } finally {
        client.release();
    }
});


router.put('/Gabandonar-turnoT/:idTurno', requireUser, async (req, res) => {
    const client = await pool.connect();
    try {
        const { idTurno } = req.params;
        const cursorName = 'ref_cursor';

        await client.query('BEGIN');

        // Llamar al procedimiento
        await client.query('CALL sp_abandonar_turno($1, $2, $3)', [idTurno, req.userId, cursorName]);

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
        responderErrorTurno(res, error, 'Error al actualizar el estado del turno');
    } finally {
        client.release();
    }
});


router.put('/Gfinalizar-turnoT/:idTurno', requireUser, async (req, res) => {
    const client = await pool.connect();
    try {
        const { idTurno } = req.params;
        const cursorName = 'ref_cursor';

        await client.query('BEGIN');

        // Llamar al procedimiento (registra al usuario que finaliza la atención)
        await client.query('CALL sp_finalizar_turno($1, $2, $3)', [idTurno, req.userId, cursorName]);

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
        responderErrorTurno(res, error, 'Error al actualizar el estado del turno');
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