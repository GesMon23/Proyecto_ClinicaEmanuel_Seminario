// Endpoint para actualizar masivamente los campos de varios pacientes
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    database: 'db_clinica',
    user: 'postgres',
    password: 'root'
});

// PUT /api/pacientes/masivo
router.put('/api/pacientes/masivo', async (req, res) => {
    const { pacientes } = req.body;
    if (!Array.isArray(pacientes) || pacientes.length === 0) {
        return res.status(400).json({ error: 'Debe enviar un arreglo de pacientes.' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const paciente of pacientes) {
            const { noafiliacion, numeroformulario, fechainicioperiodo, fechafinperiodo, sesionesautorizadasmes } = paciente;
            await client.query(
                `UPDATE tbl_pacientes SET numeroformulario = $1, fechainicioperiodo = $2, fechafinperiodo = $3, sesionesautorizadasmes = $4, idjornada = COALESCE($5, idjornada), idestado = 4 WHERE noafiliacion = $6`,
                [numeroformulario, fechainicioperiodo, fechafinperiodo, sesionesautorizadasmes, paciente.idjornada || null, noafiliacion]
            );
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error al actualizar pacientes.', detalle: error.message });
    } finally {
        client.release();
    }
});

module.exports = router;
