// Rutas de login, sesión y recuperación de contraseña (server.js las monta en la raíz y bajo /api).
const express = require('express');
const service = require('./auth.service');
const { wrap } = require('../../shared/http');
const { verifyJWT } = require('../../shared/auth');

const router = express.Router();

const falla = (mensaje, log) => (err) => {
  console.error(log, err);
  return [500, { error: mensaje }];
};

router.post('/auth/login', wrap(async (req, res) => {
  res.json(await service.login(req.body));
}, falla('Error en login', 'Error en /auth/login:')));

router.get('/auth/me', verifyJWT, wrap(async (req, res) => {
  res.json(await service.perfil(req.user && req.user.sub));
}, falla('Error al obtener perfil', 'Error en /auth/me:')));

router.post('/auth/confirm-password', verifyJWT, wrap(async (req, res) => {
  await service.confirmarPassword(req.user, req.body && req.body.password);
  res.json({ ok: true });
}, falla('No fue posible confirmar la contraseña', 'Error en /auth/confirm-password:')));

router.post('/auth/change-password', verifyJWT, wrap(async (req, res) => {
  await service.cambiarPassword(req.user, req.body);
  res.json({ ok: true });
}, falla('No fue posible cambiar la contraseña', 'Error en /auth/change-password:')));

router.post('/auth/forgot-password', wrap(async (req, res) => {
  await service.solicitarRecuperacion(req.body);
  res.json({ ok: true });
}, falla('No fue posible procesar la solicitud', 'Error en /auth/forgot-password:')));

router.post('/auth/reset-password', wrap(async (req, res) => {
  await service.restablecerConToken(req.body);
  res.json({ ok: true });
}, falla('No fue posible restablecer la contraseña', 'Error en /auth/reset-password:')));

router.post('/auth/admin/reset-user-password', verifyJWT, wrap(async (req, res) => {
  await service.restablecerComoAdmin(req.user, req.body);
  res.json({ ok: true });
}, falla('No fue posible restablecer la contraseña', 'Error en /auth/admin/reset-user-password:')));

router.post('/auth/admin/reset-user-password/token', wrap(async (req, res) => {
  await service.restablecerConTokenDeAccion(req.body);
  res.json({ ok: true });
}, falla('No fue posible restablecer la contraseña', 'Error en /auth/admin/reset-user-password/token:')));

router.get('/auth/admin/reset-user-token-info', wrap(async (req, res) => {
  res.json(await service.infoTokenDeAccion(req.query.token));
}, falla('No fue posible obtener la información del token', 'Error en /auth/admin/reset-user-token-info:')));

// La ruta conserva el prefijo /api porque así la consume el frontend (queda en /api/usuarios-activos y /api/api/...)
router.get('/api/usuarios-activos', wrap(async (req, res) => {
  res.json(await service.usuariosActivos());
}, falla('Error al consultar usuarios activos', 'Error al consultar usuarios activos:')));

module.exports = router;
