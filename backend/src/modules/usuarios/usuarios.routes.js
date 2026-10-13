// Rutas de empleados, usuarios y roles (server.js las monta en la raíz y bajo /api).
// El permiso de cada pestaña lo exige config/permisos.js; aquí solo se exige la sesión.
const express = require('express');
const service = require('./usuarios.service');
const { wrap } = require('../../shared/http');
const { verifyJWT } = require('../../shared/auth');
const { olvidarAccesos } = require('../../config/acceso');

const router = express.Router();
const gestion = [verifyJWT];

const falla = (mensaje, log) => (err) => {
  console.error(log, err);
  return [500, { error: mensaje }];
};

// ---- Empleados: registro ----
router.put('/registro-empleados', verifyJWT, wrap(async (req, res) => {
  await service.registrarEmpleados(req.body?.empleados, req.user);
  res.json({ success: true, mensaje: 'Empleados actualizados correctamente.' });
}, (err) => {
  console.error('Error en PUT /registro-empleados:', err);
  return [500, { error: 'Error al actualizar empleados.', detalle: err.message }];
}));

router.post('/empleados', verifyJWT, wrap(async (req, res) => {
  await service.registrarEmpleado(req.body || {}, req.user);
  res.status(201).json({ success: true, mensaje: 'Empleado registrado correctamente.' });
}, (err) => {
  console.error('Error en POST /empleados:', err);
  return [500, { error: 'Error al registrar empleado.', detalle: err.message }];
}));

// ---- Empleados: gestión ----
router.get('/empleados', ...gestion, wrap(async (req, res) => {
  res.json(await service.listarEmpleados(req.query));
}, (err) => {
  console.error('Error en GET /empleados (SP):', err);
  return [501, {
    error: 'Listado de empleados no disponible',
    detalle: 'Verifica que exista sp_listar_empleados(q, estado, limit, offset, refcursor) en la BD.',
  }];
}));

// Antes de /empleados/:dpi para que "sin-usuario" no se lea como un DPI
router.get('/empleados/sin-usuario', ...gestion, wrap(async (req, res) => {
  res.json(await service.empleadosSinUsuario());
}, falla('No fue posible obtener empleados sin usuario', 'Error en GET /empleados/sin-usuario:')));

router.put('/empleados/:dpi', ...gestion, wrap(async (req, res) => {
  await service.actualizarEmpleado(req.params.dpi, req.body, req.user);
  res.json({ success: true });
}, falla('Error al actualizar empleado', 'Error en PUT /empleados/:dpi:')));

router.patch('/empleados/:dpi/estado', ...gestion, wrap(async (req, res) => {
  await service.cambiarEstadoEmpleado(req.params.dpi, req.body?.activo, req.user);
  olvidarAccesos(); // un empleado inactivo pierde el acceso de inmediato
  res.json({ success: true });
}, falla('Error al cambiar estado', 'Error en PATCH /empleados/:dpi/estado:')));

// ---- Usuarios ----
router.get('/usuarios/existe', ...gestion, wrap(async (req, res) => {
  res.json({ existe: await service.usuarioExiste(req.query.usuario) });
}, falla('No fue posible validar usuario', 'Error en GET /usuarios/existe:')));

router.get('/usuarios/by-usuario', ...gestion, wrap(async (req, res) => {
  res.json(await service.buscarUsuario(req.query.usuario));
}, falla('No fue posible buscar el usuario', 'Error en GET /usuarios/by-usuario:')));

router.post('/usuarios', ...gestion, wrap(async (req, res) => {
  res.status(201).json({ id_usuario: await service.crearUsuario(req.body, req.user) });
}, falla('No fue posible crear el usuario', 'Error en POST /usuarios:')));

// ---- Roles ----
router.get('/roles/activos', ...gestion, wrap(async (req, res) => {
  res.json(await service.rolesActivos());
}, falla('No fue posible obtener roles', 'Error en GET /roles/activos:')));

router.get('/usuarios/:id/roles', ...gestion, wrap(async (req, res) => {
  res.json(await service.rolesDeUsuario(req.params.id));
}, falla('No fue posible obtener roles del usuario', 'Error en GET /usuarios/:id/roles:')));

router.put('/usuarios/:id/roles', ...gestion, wrap(async (req, res) => {
  await service.actualizarRoles(req.params.id, req.body, req.user);
  olvidarAccesos();
  res.json({ ok: true });
}, falla('No fue posible actualizar roles', 'Error en PUT /usuarios/:id/roles:')));

router.patch('/usuarios/:id/estado', ...gestion, wrap(async (req, res) => {
  await service.actualizarEstadoUsuario(req.params.id, req.body, req.user);
  olvidarAccesos();
  res.json({ ok: true });
}, falla('No fue posible actualizar el estado del usuario', 'Error en PATCH /usuarios/:id/estado:')));

module.exports = router;
