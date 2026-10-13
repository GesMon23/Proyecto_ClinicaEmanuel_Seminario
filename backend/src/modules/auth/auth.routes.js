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

// Recuperación por autoservicio: pedir enlace -> validar enlace -> crear contraseña
router.post('/auth/forgot-password', wrap(async (req, res) => {
  res.json({ ok: true, ...(await service.solicitarRecuperacion(req.body)) });
}, falla('No fue posible procesar la solicitud', 'Error en /auth/forgot-password:')));

router.get('/auth/reset-password/info', wrap(async (req, res) => {
  res.json(await service.infoRestablecimiento(req.query.token));
}, falla('No fue posible validar el enlace', 'Error en /auth/reset-password/info:')));

router.post('/auth/reset-password', wrap(async (req, res) => {
  await service.restablecerConToken(req.body);
  res.json({ ok: true });
}, falla('No fue posible restablecer la contraseña', 'Error en /auth/reset-password:')));

// El administrador envía el enlace de restablecimiento a un usuario (nunca fija ni ve su contraseña)
router.post('/auth/admin/reset-user-password', verifyJWT, wrap(async (req, res) => {
  await service.enviarEnlaceComoAdmin(req.body);
  res.json({ ok: true });
}, falla('No fue posible enviar el enlace', 'Error en /auth/admin/reset-user-password:')));

// La ruta conserva el prefijo /api porque así la consume el frontend (queda en /api/usuarios-activos y /api/api/...)
router.get('/api/usuarios-activos', wrap(async (req, res) => {
  res.json(await service.usuariosActivos());
}, falla('Error al consultar usuarios activos', 'Error al consultar usuarios activos:')));

module.exports = router;
