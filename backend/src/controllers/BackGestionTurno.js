
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
    try {
        const result = await pool.query('SELECT id_estado_turno, descripcion FROM tbl_estados_turno ORDER BY descripcion ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Endpoint para obtener jornadas
router.get('/jornadas', async (req, res) => {
    try {
        // Intento 1: esquema con id_jornada
        try {
            const r1 = await pool.query('SELECT id_jornada, descripcion FROM tbl_jornadas WHERE estado = true ORDER BY descripcion ASC');
            return res.json(r1.rows || []);
        } catch (_) {}
        // Intento 2: esquema con idjornada
        const r2 = await pool.query('SELECT idjornada AS id_jornada, descripcion FROM tbl_jornadas WHERE estado = true ORDER BY descripcion ASC');
        return res.json(r2.rows || []);
    } catch (error) {
        console.error('Error en /jornadas (BackGestionTurno):', error);
        res.status(500).json({ error: 'Error al obtener jornadas.' });
    }
});

        

// Endpoint para obtener paciente por número de afiliación con descripciones de llaves foráneas
router.get('/GpacientesT/:noafiliacion', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.*, 
                (p.primer_nombre || ' ' || ' ' || p.segundo_nombre || ' ' || p.otros_nombres || ' ' || p.primer_apellido || ' ' || p.segundo_apellido ) as nombrePaciente,
                d.nombre AS departamento_nombre,
                e.descripcion AS estado_descripcion,
                a.descripcion AS acceso_descripcion,
                --c.descripcion AS causaegreso_descripcion,
                j.descripcion AS jornada_descripcion
            FROM tbl_pacientes p
            LEFT JOIN tbl_departamento d ON p.id_departamento = d.id_departamento
            LEFT JOIN tbl_estados_paciente e ON p.id_estado = e.id_estado
            LEFT JOIN tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
            --LEFT JOIN tbl_causa_egreso c ON p.id_causa = c.id_causa
            LEFT JOIN tbl_jornadas j ON p.id_jornada = j.id_jornada
            WHERE p.no_afiliacion = $1;
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
router.get('/GmuestraTurnosT', async (req, res) => {
    try {
        const { noafiliacion } = req.query;
        const result = await pool.query(`
            SELECT 
                pac.no_afiliacion as noafiliacion,
                pac.primer_nombre || ' ' || COALESCE(pac.segundo_nombre, '') || ' ' || 
                pac.primer_apellido || ' ' || COALESCE(pac.segundo_apellido, '') AS nombrepaciente,
                tur.id_turno,
                cli.descripcion AS nombre_clinica,
                tur.fecha_turno,
                tur.id_turno_cod
            FROM tbl_turnos tur
            INNER JOIN tbl_pacientes pac ON tur.no_afiliacion = pac.no_afiliacion
            INNER JOIN tbl_clinica cli ON tur.id_clinica = cli.id_clinica
            WHERE pac.no_afiliacion = $1 AND tur.fecha_turno::date = (NOW() AT TIME ZONE 'America/Guatemala')::date
            ORDER BY tur.fecha_turno ASC
        `, [noafiliacion]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Crear nuevo turno
router.post('/Gcrear-turnoT', async (req, res) => {
    const client = await pool.connect();
    try {
        const { noAfiliacion, clinica, fechaTurno } = req.body;

        await client.query('BEGIN');

        // 1️⃣ Insertar primero el turno sin id_turno
        const insertResult = await client.query(`
            INSERT INTO tbl_turnos (no_afiliacion, id_clinica, fecha_creacion, fecha_turno, id_estado_turno, usuario_creacion)
            VALUES (
                $1,
                (SELECT id_clinica FROM tbl_clinica WHERE descripcion = $2),
                NOW() AT TIME ZONE 'America/Guatemala',
                $3,
                1,
                'admin'
            )
            RETURNING id_turno
        `, [noAfiliacion, clinica, fechaTurno]);

        const incrementableId = insertResult.rows[0].id_turno;

        // 2️⃣ Definir prefijo según la clínica
        let prefijo;
        switch (clinica.toLowerCase()) {
            case 'hemodialisis':
                prefijo = 'HEM';
                break;
            case 'nutrición':
                prefijo = 'NUT';
                break;
            case 'psicología':
                prefijo = 'PSICOL';
                break;
            default:
                prefijo = 'OTRO';
        }

        // 3️⃣ Construir id_turno con patrón Año-Mes-Prefijo-Correlativo
        const fecha = new Date(fechaTurno);
        const anio = fecha.getFullYear();
        const mes = fecha.getMonth() + 1; // Enero = 0
        const mesStr = mes < 10 ? `0${mes}` : `${mes}`;

        const idTurno = `${anio}${mesStr}${prefijo}${incrementableId}`;

        // 4️⃣ Actualizar registro con el id_turno final
        await client.query(`
            UPDATE tbl_turnos
            SET id_turno_cod = $1
            WHERE id_turno = $2
        `, [idTurno, incrementableId]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: "Turno creado exitosamente",
            turnoId: idTurno
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
    const { noafiliacion, fechaFalta, motivoFalta, nombreClinica } = req.body;
    if (!noafiliacion || !fechaFalta || !motivoFalta || !nombreClinica) {
        return res.status(400).json({ success: false, message: 'Faltan datos requeridos.' });
    }
    try {
        await pool.query(
            'INSERT INTO tbl_faltistas (no_afiliacion, id_clinica, fecha_falta, motivo_falta, usuario_creacion, fecha_creacion) VALUES ($1, (SELECT id_clinica FROM tbl_clinica WHERE descripcion = $2), $3, $4, $5, CURRENT_DATE)',
            [noafiliacion, nombreClinica, fechaFalta, motivoFalta, 'admin']
        );
        res.json({ success: true, message: 'Faltista registrado correctamente.' });
    } catch (error) {
        console.error('Error al registrar faltista:', error);
        res.status(500).json({ success: false, message: 'Error al registrar faltista.', detalle: error.message });
    }
});


router.get('/GturnosT', async (req, res) => {
    try {
        const { numeroafiliacion, fecha, clinica, estado } = req.query;
        let filtros = [];
        let valores = [];
        let idx = 1;
        if (numeroafiliacion) {
            filtros.push(`t.no_afiliacion = $${idx++}`);
            valores.push(numeroafiliacion);
        }
        if (fecha) {
            filtros.push(`DATE(t.fecha_turno) = $${idx++}`);
            valores.push(fecha);
        }
        if (clinica) {
            filtros.push(`c.descripcion ILIKE $${idx++}`);
            valores.push(`%${clinica}%`);
        }
        if (estado) {
            filtros.push(`e.descripcion ILIKE $${idx++}`);
            valores.push(`%${estado}%`);
        }
        const where = filtros.length > 0 ? 'WHERE ' + filtros.join(' AND ') : '';
        const consulta = `
             SELECT 
                t.id_Turno,
                t.id_turno_cod,
                t.no_afiliacion AS numeroafiliacion,
                p.primer_nombre || ' ' || COALESCE(p.segundo_nombre,'') || ' ' || p.primer_apellido || ' ' || COALESCE(p.segundo_apellido,'') AS nombrepaciente,
                to_char(t.Fecha_Turno, 'YYYY-MM-DD') AS fecha,
                to_char(t.Fecha_Turno, 'HH24:MI') AS hora,
                c.descripcion AS nombreclinica,
                e.descripcion AS estado
            FROM tbl_Turnos t
            INNER JOIN tbl_pacientes p ON t.no_afiliacion = p.no_afiliacion
            INNER JOIN tbl_clinica c ON t.id_clinica = c.id_clinica
            INNER JOIN tbl_estados_turno e ON t.id_estado_turno = e.id_estado_turno
            ${where}
            ORDER BY t.fecha_creacion DESC
        `;
        const result = await pool.query(consulta, valores);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Actualizar turno
// backend/src/controllers/BackGestionTurno.js
router.put('/Gactualizar-turnoT/:turno_id', async (req, res) => {
    try {
      const { turno_id } = req.params;
      const { fechaTurno, clinica } = req.body;
      await pool.query(
        `
        UPDATE tbl_turnos SET 
            fecha_turno = $1,
            fecha_actualizacion = CURRENT_DATE,
            usuario_actualizacion = $3,
            id_clinica = (SELECT id_clinica FROM tbl_clinica WHERE descripcion = $4)
        WHERE id_turno = $2
        `,
        [fechaTurno, turno_id, 'admin', clinica]
      );
  
      res.json({ success: true, message: "Turno actualizado exitosamente" });
    } catch (err) {
      res.status(500).json({ detail: err.message });
    }
  });


  router.put('/Gfaltante-turnoT/:idturno', async (req, res) => {
    try {
        const { idturno } = req.params;
        // Estado 7 = Faltante
        await pool.query(
            'UPDATE tbl_turnos SET id_estado_turno = 6, fecha_asignacion = NOW() WHERE id_turno = $1',
            [idturno]
        );

        res.json({
            success: true,
            message: "Turno marcado como faltante"
        });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});


// Endpoint para eliminar un turno por ID
router.delete('/eliminar-turno/:idturno', async (req, res) => {
    const { idturno } = req.params;
    try {
        // Eliminar el turno de la tabla tbl_turnos
        const result = await pool.query('DELETE FROM tbl_turnos WHERE id_turno = $1', [idturno]);
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

// Obtener el siguiente turno para una clínica específica por su descripción
router.get('/Gsiguiente-turnoT/:descripcionClinica', async (req, res) => {
    try {
        const { descripcionClinica } = req.params;
        
        const query = `
            SELECT 
                t.id_turno_cod,
                p.primer_nombre || ' ' || COALESCE(p.segundo_nombre,'') || ' ' ||
                p.primer_apellido || ' ' || COALESCE(p.segundo_apellido,'') AS nombrepaciente,
                c.descripcion AS clinica,
                t.fecha_turno,
                t.no_afiliacion,
                p.url_foto
            FROM tbl_turnos t
            JOIN tbl_pacientes p ON t.no_afiliacion = p.no_afiliacion
            JOIN tbl_clinica c ON t.id_clinica = c.id_clinica
            WHERE t.id_clinica = (SELECT id_clinica FROM tbl_clinica WHERE descripcion = $1)
              AND t.id_estado_turno = 1
              AND t.fecha_creacion::date = (NOW() AT TIME ZONE 'America/Guatemala')::date
            ORDER BY t.fecha_creacion ASC
            LIMIT 5`;
            
        const result = await pool.query(query, [descripcionClinica]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No hay turnos pendientes para esta clínica' });
        }
        
        // Devolvemos todos los turnos encontrados
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener el siguiente turno:', error);
        res.status(500).json({ error: 'Error al obtener el siguiente turno', detalle: error.message });
    }
});

// Obtener el turno actual en estado 4 (llamado) para una clínica
router.get('/Gturno-actual/:descripcionClinica', async (req, res) => {
    try {
        const { descripcionClinica } = req.params;
        
        const query = `
            SELECT 
                t.id_turno_cod,
                p.primer_nombre || ' ' || COALESCE(p.segundo_nombre,'') || ' ' ||
                p.primer_apellido || ' ' || COALESCE(p.segundo_apellido,'') AS nombrepaciente,
                c.descripcion AS clinica,
                t.fecha_turno,
                t.no_afiliacion,
                p.url_foto
            FROM tbl_turnos t
            JOIN tbl_pacientes p ON t.no_afiliacion = p.no_afiliacion
            JOIN tbl_clinica c ON t.id_clinica = c.id_clinica
            WHERE t.id_clinica = (SELECT id_clinica FROM tbl_clinica WHERE descripcion = $1)
              AND t.id_estado_turno = 4
              AND t.fecha_creacion::date = (NOW() AT TIME ZONE 'America/Guatemala')::date
            ORDER BY t.fecha_creacion DESC
            LIMIT 1`;
            
        const result = await pool.query(query, [descripcionClinica]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No hay turno actual en estado de llamado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener el turno actual:', error);
        res.status(500).json({ error: 'Error al obtener el turno actual', detalle: error.message });
    }
});

// Asignar turno (cambia a estado 1)
router.put('/Gasignar-turnoT/:turno_id', async (req, res) => {
    try {
        const { turno_id } = req.params;
        await pool.query(
            'UPDATE tbl_Turnos SET id_estado_turno = 2, fecha_asignacion=now() WHERE id_Turno = $1',
            [turno_id]
        );

        res.json({
            success: true,
            message: "Turno asignado exitosamente"
        });
        
    } catch (error) {
        console.error('Error al actualizar estado del turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el estado del turno',
            error: error.message
        });
    }
});

// Actualizar estado del turno a Llamado (4)
router.put('/Gactualizar-estado-llamadoT/:idTurno', async (req, res) => {
    const { idTurno } = req.params;
    
    try {
        // Verificar si el turno existe
        const verificarTurno = await pool.query(
            'SELECT id_turno FROM tbl_turnos WHERE id_turno_cod = $1',
            [idTurno]
        );
        
        if (verificarTurno.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Turno no encontrado' 
            });
        }
        
        // Actualizar el estado del turno a 4 (Llamado)
        const result = await pool.query(
            `UPDATE tbl_turnos 
             SET id_estado_turno = 4,
                 fecha_actualizacion = NOW() AT TIME ZONE 'America/Guatemala'
             WHERE id_turno_cod = $1
             RETURNING id_turno_cod, id_estado_turno`,
            [idTurno]
        );
        
        res.json({
            success: true,
            message: 'Estado del turno actualizado a Llamado',
            turno: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error al actualizar estado del turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el estado del turno',
            error: error.message
        });
    }
});


router.put('/Gabandonar-turnoT/:idTurno', async (req, res) => {
    const { idTurno } = req.params;
    
    try {
        // Verificar si el turno existe
        const verificarTurno = await pool.query(
            'SELECT id_turno FROM tbl_turnos WHERE id_turno_cod = $1',
            [idTurno]
        );
        
        if (verificarTurno.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Turno no encontrado' 
            });
        }
        
        // Actualizar el estado del turno a 4 (Llamado)
        const result = await pool.query(
            `UPDATE tbl_turnos 
             SET id_estado_turno = 5,
                 fecha_actualizacion = NOW() AT TIME ZONE 'America/Guatemala'
             WHERE id_turno_cod = $1
             RETURNING id_turno_cod, id_estado_turno`,
            [idTurno]
        );
        
        res.json({
            success: true,
            message: 'Estado del turno actualizado a Abandonado',
            turno: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error al actualizar estado del turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el estado del turno',
            error: error.message
        });
    }
});

router.put('/Gfinalizar-turnoT/:idTurno', async (req, res) => {
    const { idTurno } = req.params;
    
    try {
        // Verificar si el turno existe
        const verificarTurno = await pool.query(
            'SELECT id_turno FROM tbl_turnos WHERE id_turno_cod = $1',
            [idTurno]
        );
        
        if (verificarTurno.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Turno no encontrado' 
            });
        }
        
        // Actualizar el estado del turno a 4 (Llamado)
        const result = await pool.query(
            `UPDATE tbl_turnos 
             SET id_estado_turno = 7,
                 fecha_actualizacion = NOW() AT TIME ZONE 'America/Guatemala'
             WHERE id_turno_cod = $1
             RETURNING id_turno_cod, id_estado_turno`,
            [idTurno]
        );
        
        res.json({
            success: true,
            message: 'Estado del turno actualizado a Finalizado',
            turno: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error al actualizar estado del turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el estado del turno',
            error: error.message
        });
    }
});


// Obtener los siguientes 5 turnos de una clínica
router.get('/siguientes-turnos/:clinica', async (req, res) => {
    const { clinica } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT 
                t.id_turno_cod,
                p.primer_nombre || ' ' || COALESCE(p.segundo_nombre,'') || ' ' ||
                p.primer_apellido || ' ' || COALESCE(p.segundo_apellido,'') AS nombrepaciente,
                c.descripcion AS clinica,
                t.fecha_turno,
                t.no_afiliacion
            FROM tbl_turnos t
            JOIN tbl_pacientes p ON t.no_afiliacion = p.no_afiliacion
            JOIN tbl_clinica c ON t.id_clinica = c.id_clinica
            WHERE t.id_clinica = (SELECT id_clinica FROM tbl_clinica WHERE descripcion = $1)
              AND t.id_estado_turno = 1
              AND t.fecha_creacion::date = (NOW() AT TIME ZONE 'America/Guatemala')::date
            ORDER BY t.fecha_creacion ASC
            OFFSET 1
            LIMIT 5`,
            [clinica]
        );
        
        res.json({
            success: true,
            turnos: result.rows
        });
        
    } catch (error) {
        console.error('Error al obtener los siguientes turnos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los siguientes turnos',
            error: error.message
        });
    }
});

module.exports = router;