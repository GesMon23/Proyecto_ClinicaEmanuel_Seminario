const express = require('express');
const pool = require('../../db/pool');
const router = express.Router();
router.use(express.json());

router.put('/registro-empleados', async (req, res) => {
    const { empleados, usuario } = req.body;

    if (!Array.isArray(empleados) || empleados.length === 0 || !usuario) {
        return res.status(400).json({ error: 'Body inválido. Se requiere empleados[] y usuario.' });
      }
    try {
        // Llamar al Stored Procedure
        await pool.query('CALL sp_registro_empleados($1, $2)', [
            JSON.stringify(empleados),
            usuario
        ]);

        res.json({ success: true, mensaje: 'Empleados actualizados correctamente.' });
    } catch (error) {
        console.error('Error en PUT /registro-empleados:', error);
        res.status(500).json({ error: 'Error al actualizar empleados.', detalle: error.message });
    }
});


// Registro unitario de empleados
router.post('/empleados', async (req, res) => {
  const {
    dpi,
    primer_nombre,
    segundo_nombre,
    otros_nombres,
    primer_apellido,
    segundo_apellido,
    apellido_casada,
    fecha_nacimiento,
    sexo,
    direccion,
    telefono,
    email,
    fecha_ingreso,
    activo,
    usuario
  } = req.body;

  // Validaciones mínimas
  if (!dpi || !primer_nombre || !primer_apellido || !direccion || !fecha_ingreso || !sexo || !usuario) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }
  if (typeof dpi !== 'string' || dpi.length !== 13) {
    return res.status(400).json({ error: 'El DPI debe tener exactamente 13 caracteres.' });
  }

  try {
    await pool.query(
      'CALL sp_insertar_empleado($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',
      [
        dpi,
        primer_nombre,
        segundo_nombre || null,
        otros_nombres || null,
        primer_apellido,
        segundo_apellido || null,
        apellido_casada || null,
        fecha_nacimiento || null, // YYYY-MM-DD
        sexo,
        direccion,
        telefono || null,
        email || null,
        fecha_ingreso, // YYYY-MM-DD
        typeof activo === 'boolean' ? activo : true, // mapea a estado
        usuario
      ]
    );

    return res.status(201).json({ success: true, mensaje: 'Empleado registrado correctamente.' });
  } catch (error) {
    console.error('Error en POST /empleados:', error);
    return res.status(500).json({ error: 'Error al registrar empleado.', detalle: error.message });
  }
});


module.exports = router;
