const express = require('express');
const pool = require('../../db/pool');
const router = express.Router();
router.use(express.json());


// Endpoint para obtener jornadas
router.get('/jornadas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * from FN_mostrar_jornadas()');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener jornadas.' });
    }
});


// PUT /api/pacientes/masivo
router.put('/api/pacientes/masivo', async (req, res) => {
    const { pacientes, usuario } = req.body;

    // Validaciones iniciales
    if (!Array.isArray(pacientes) || pacientes.length === 0) {
        return res.status(400).json({ error: 'Debe enviar un arreglo de pacientes.' });
    }

    if (!usuario) {
        return res.status(400).json({ error: 'Debe especificar el usuario que realiza la actualización.' });
    }

    try {
        // Llamar al Stored Procedure
        await pool.query('CALL sp_registro_formularios($1, $2)', [
            JSON.stringify(pacientes),
            usuario
        ]);

        res.json({ success: true, mensaje: 'Pacientes actualizados e historial registrado correctamente.' });
    } catch (error) {
        console.error('Error en actualización masiva:', error);
        res.status(500).json({
            error: 'Error al actualizar pacientes.',
            detalle: error.message
        });
    }
});

// Endpoint para obtener paciente por número de afiliación con descripciones de llaves foráneas
router.get('/consulta_pacientes_formularios/:noafiliacion', async (req, res) => {
    try {
        const noaf = String(req.params.noafiliacion || '').trim();
        const result = await pool.query(
            'SELECT * FROM fn_Mostrar_Pacientes_Tabla_Formularios($1::text)',
            [noaf]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error en /consulta_pacientes_formularios:', error);
        res.status(500).json({ error: 'Error al obtener paciente.', detalle: error.message });
    }
});

module.exports = router;
