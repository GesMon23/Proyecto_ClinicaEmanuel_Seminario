const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../../db/pool');
const { runWithUser } = require('../db');
const router = express.Router();
router.use(express.json());

// ===== Auth helpers (alineado con BackLogin.js) =====
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
function verifyJWT(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

router.put('/registro-empleados', verifyJWT, async (req, res) => {
  const { empleados } = req.body;

  if (!Array.isArray(empleados) || empleados.length === 0) {
    return res.status(400).json({ error: 'Body inválido. Se requiere empleados[]' });
  }

  const userName = String(req.user?.nombre_usuario || req.user?.usuario || req.user?.sub || 'sistema');
  try {
    await runWithUser(userName, async (client) => {
      // Resolver actor (nombre de usuario) usando función en BD dentro de la misma transacción
      const nombreJWT = (req.user && (req.user.nombre_usuario || req.user.usuario)) || null;
      const idJWT = Number(req.user && (req.user.id_usuario || req.user.id || req.user.sub)) || null;
      const rActor = await client.query('SELECT public.fn_resolver_actor($1, $2) AS actor_nombre', [nombreJWT, idJWT]);
      const actorNombre = rActor.rows?.[0]?.actor_nombre || null;

      // Llamar al Stored Procedure
      await client.query('CALL sp_registro_empleados($1, $2)', [
        JSON.stringify(empleados),
        actorNombre
      ]);
    });

    res.json({ success: true, mensaje: 'Empleados actualizados correctamente.' });
  } catch (error) {
    console.error('Error en PUT /registro-empleados:', error);
    res.status(500).json({ error: 'Error al actualizar empleados.', detalle: error.message });
  }
});


// Registro unitario de empleados
router.post('/empleados', verifyJWT, async (req, res) => {
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
    activo
  } = req.body;

  // Validaciones mínimas (obligatorios excepto: segundo_nombre, otros_nombres, segundo_apellido, apellido_casada)
  if (
    !dpi ||
    !primer_nombre ||
    !primer_apellido ||
    !fecha_nacimiento ||
    !sexo ||
    !direccion ||
    !telefono ||
    !email ||
    !fecha_ingreso
  ) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }
  if (typeof dpi !== 'string' || dpi.length !== 13) {
    return res.status(400).json({ error: 'El DPI debe tener exactamente 13 caracteres.' });
  }
  // Teléfono: 8 dígitos
  if (typeof telefono !== 'string' || !/^\d{8}$/.test(telefono)) {
    return res.status(400).json({ error: 'El teléfono debe contener exactamente 8 dígitos.' });
  }
  // Email: validación básica
  if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'El email no tiene un formato válido.' });
  }

  try {
    const userName = String(req.user?.nombre_usuario || req.user?.usuario || req.user?.sub || 'sistema');
    await runWithUser(userName, async (client) => {
      // Resolver actor (nombre de usuario) usando función en BD
      const nombreJWT = (req.user && (req.user.nombre_usuario || req.user.usuario)) || null;
      const idJWT = Number(req.user && (req.user.id_usuario || req.user.id || req.user.sub)) || null;
      const rActor = await client.query('SELECT public.fn_resolver_actor($1, $2) AS actor_nombre', [nombreJWT, idJWT]);
      const actorNombre = rActor.rows?.[0]?.actor_nombre || null;

      await client.query(
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
          actorNombre
        ]
      );
    });

    return res.status(201).json({ success: true, mensaje: 'Empleado registrado correctamente.' });
  } catch (error) {
    console.error('Error en POST /empleados:', error);
    return res.status(500).json({ error: 'Error al registrar empleado.', detalle: error.message });
  }
});


module.exports = router;
