app.get('/medicos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * from fn_mostrar_medicos()');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

app.get('/api/referencias', async (req, res) => {
    try {
        const { desde, hasta, idmedico } = req.query;

        const result = await pool.query(
            'SELECT * FROM FN_mostrar_referencias($1, $2, $3)',
            [
                desde || null,
                hasta || null,
                idmedico || null
            ]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error al consultar referencias:', err);
        res.status(500).json({ detail: 'Error al consultar referencias.' });
    }
});