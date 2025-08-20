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