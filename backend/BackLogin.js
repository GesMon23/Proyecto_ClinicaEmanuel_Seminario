// Configuración de la base de datos
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
    host: 'localhost',
    database: 'db_clinicaemanuel',
    user: 'postgres',
    password: 'root'
});

// Endpoint para consultar usuarios activos
app.get('/api/usuarios-activos', async (req, res) => {
    try {
        const result = await pool.query("SELECT id_usuario, nombre_usuario, contrasenia, id_empleado, estado FROM tbl_usuarios WHERE estado=true");
        res.json(result.rows);
    } catch (error) {
        console.error('Error al consultar usuarios activos:', error);
        res.status(500).json({ error: 'Error al consultar usuarios activos' });
    }
});

// Puedes agregar aquí otros endpoints relacionados con login

// Iniciar el servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor de login escuchando en el puerto ${PORT}`);
});

