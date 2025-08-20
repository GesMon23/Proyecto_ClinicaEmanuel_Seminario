// Obtener clínicas
app.get('/clinicas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM Fn_mostrar_clinicas()');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Consultar todos los turnos con filtros
app.get('/turnos', async (req, res) => {
    try {
        const { numeroafiliacion, fecha, clinica } = req.query;

        const result = await pool.query(
            'SELECT * FROM fn_consultar_turnos($1, $2, $3)',
            [
                numeroafiliacion || null,
                fecha || null,
                clinica || null
            ]
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});