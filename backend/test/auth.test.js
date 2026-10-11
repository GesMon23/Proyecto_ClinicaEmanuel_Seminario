// Autenticación: reglas en memoria, contraseñas, correos y contrato HTTP. No se crea ni modifica ningún usuario.
const { test, before, after } = require('node:test');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { assert, pool } = require('./helpers');
const { router } = require('../src/modules/auth');
const service = require('../src/modules/auth/auth.service');
const { IntentosFallidos, TokensUsados } = require('../src/modules/auth/memoria');
const { escapeHtml } = require('../src/modules/auth/auth.mail');

let servidor;
let puerto;
const secreto = process.env.JWT_SECRET;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use(router);
  servidor = await new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
  puerto = servidor.address().port;
});

after(async () => {
  await new Promise((ok) => servidor.close(ok));
  await pool.end();
});

function pedir(metodo, ruta, { token, cuerpo } = {}) {
  return new Promise((ok, fallo) => {
    const datos = cuerpo ? JSON.stringify(cuerpo) : null;
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (datos) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(datos); }
    const req = http.request({ host: 'localhost', port: puerto, path: ruta, method: metodo, headers }, (res) => {
      let b = '';
      res.on('data', (d) => { b += d; });
      res.on('end', () => ok({ status: res.statusCode, body: b ? JSON.parse(b) : null }));
    });
    req.on('error', fallo);
    if (datos) req.write(datos);
    req.end();
  });
}

// ------------------------------------------------------------------ unitarias

test('intentos fallidos: bloquea al llegar al máximo y se libera con el tiempo', () => {
  let ahora = 1_000_000;
  const intentos = new IntentosFallidos({ maximo: 3, minutosBloqueo: 15, ahora: () => ahora });
  assert.equal(intentos.estado('Ana').bloqueado, false);
  intentos.registrar('ANA');
  intentos.registrar('ana');
  assert.equal(intentos.estado('ana').bloqueado, false);
  const tercero = intentos.registrar('Ana');
  assert.equal(tercero.bloqueado, true);
  assert.equal(tercero.msRestantes, 15 * 60 * 1000);
  ahora += 16 * 60 * 1000;
  assert.equal(intentos.estado('ana').bloqueado, false, 'el bloqueo expira');
  intentos.registrar('ana');
  intentos.limpiar('ana');
  intentos.registrar('ana');
  intentos.registrar('ana');
  assert.equal(intentos.estado('ana').bloqueado, false, 'limpiar reinicia el contador');
});

test('tokens usados: se recuerdan hasta su expiración', () => {
  let ahora = 1_000_000;
  const tokens = new TokensUsados({ ahora: () => ahora });
  assert.equal(tokens.usado('t1'), false);
  tokens.marcar('t1', (ahora + 60_000) / 1000);
  assert.equal(tokens.usado('t1'), true);
  ahora += 61_000;
  assert.equal(tokens.usado('t1'), false);
  tokens.marcar('t2');
  assert.equal(tokens.usado('t2'), true, 'sin exp se recuerda 15 minutos');
  ahora += 16 * 60 * 1000;
  tokens.purgar();
  assert.equal(tokens.tokens.size, 0);
});

test('generarPasswordFuerte cumple la complejidad exigida', () => {
  for (let i = 0; i < 50; i++) {
    const p = service.generarPasswordFuerte(12);
    assert.equal(p.length, 12);
    assert.match(p, service.PASSWORD_FUERTE);
  }
  assert.equal(service.generarPasswordFuerte(2).length, 4, 'mínimo 4 caracteres');
});

test('coincidePassword solo acepta bcrypt: el texto plano guardado nunca coincide', async () => {
  const hash = await bcrypt.hash('Secreta1.', 4);
  assert.equal(await service.coincidePassword('Secreta1.', hash), true);
  assert.equal(await service.coincidePassword('otra', hash), false);
  assert.equal(await service.coincidePassword('plana', 'plana'), false);
  assert.equal(await service.coincidePassword('', ''), false);
  assert.equal(await service.coincidePassword('x', null), false);
});

test('mensajeBloqueo y escapeHtml', () => {
  assert.equal(service.mensajeBloqueo(61_000), 'Usuario bloqueado. Intenta nuevamente en 1m 1s');
  assert.equal(escapeHtml(`<b onclick="x">&'</b>`), '&lt;b onclick=&quot;x&quot;&gt;&amp;&#39;&lt;/b&gt;');
  assert.equal(escapeHtml(null), '');
});

// ------------------------------------------------------------------ HTTP

test('login: faltan datos -> 400; usuario inexistente -> 401 genérico', async () => {
  const faltan = await pedir('POST', '/auth/login', { cuerpo: { usuario: 'x' } });
  assert.equal(faltan.status, 400);

  const malo = await pedir('POST', '/auth/login', { cuerpo: { usuario: `noexiste${Date.now()}`, password: 'x' } });
  assert.equal(malo.status, 401);
  assert.equal(malo.body.error, 'Credenciales inválidas');
});

test('rutas protegidas exigen token válido', async () => {
  for (const [metodo, ruta] of [['GET', '/auth/me'], ['POST', '/auth/confirm-password'], ['POST', '/auth/change-password'], ['POST', '/auth/admin/reset-user-password']]) {
    const r = await pedir(metodo, ruta);
    assert.equal(r.status, 401, `${metodo} ${ruta}`);
    assert.equal(r.body.error, 'Token requerido');
  }
  const malo = await pedir('GET', '/auth/me', { token: 'x.y.z' });
  assert.equal(malo.body.error, 'Token inválido');
});

test('me con un usuario inexistente -> 401', async () => {
  const token = jwt.sign({ sub: 987654321, nombre_usuario: 'fantasma', roles: [] }, secreto);
  const r = await pedir('GET', '/auth/me', { token });
  assert.equal(r.status, 401);
  assert.equal(r.body.error, 'No autorizado');
});

test('cambio y confirmación de contraseña validan el cuerpo', async () => {
  const token = jwt.sign({ sub: 987654321, nombre_usuario: 'fantasma', roles: [] }, secreto);
  const sinPassword = await pedir('POST', '/auth/confirm-password', { token, cuerpo: {} });
  assert.equal(sinPassword.status, 400);
  const sinDatos = await pedir('POST', '/auth/change-password', { token, cuerpo: { actual: 'a' } });
  assert.equal(sinDatos.status, 400);
  const corta = await pedir('POST', '/auth/change-password', { token, cuerpo: { actual: 'a', nueva: '123' } });
  assert.match(corta.body.error, /8 caracteres/);
});

test('recuperación: validaciones de la solicitud y del token de restablecimiento', async () => {
  const dpi = await pedir('POST', '/auth/forgot-password', { cuerpo: { dpi: '1' } });
  assert.equal(dpi.status, 400);
  assert.equal(dpi.body.error, 'DPI inválido');
  const usuario = await pedir('POST', '/auth/forgot-password', { cuerpo: { dpi: '1234567890123', nombres: 'A', apellidos: 'B', telefono: '1' } });
  assert.equal(usuario.body.error, 'Usuario es requerido');

  const sinToken = await pedir('POST', '/auth/reset-password', { cuerpo: { nueva: '12345678' } });
  assert.equal(sinToken.status, 400);
  const invalido = await pedir('POST', '/auth/reset-password', { cuerpo: { token: 'x.y.z', nueva: '12345678' } });
  assert.equal(invalido.status, 401);
  const otroFin = jwt.sign({ sub: 1, purpose: 'otro' }, secreto);
  const proposito = await pedir('POST', '/auth/reset-password', { cuerpo: { token: otroFin, nueva: '12345678' } });
  assert.equal(proposito.body.error, 'Token inválido');
});

test('restablecimiento por administrador: rol, id y complejidad', async () => {
  const sinRol = jwt.sign({ sub: 1, roles: ['RolTurnos'] }, secreto);
  const prohibido = await pedir('POST', '/auth/admin/reset-user-password', { token: sinRol, cuerpo: { id_usuario: 5, nueva: 'Abcdef1.' } });
  assert.equal(prohibido.status, 403);

  const admin = jwt.sign({ sub: 1, roles: ['RolGestionUsuarios'] }, secreto);
  const sinId = await pedir('POST', '/auth/admin/reset-user-password', { token: admin, cuerpo: { nueva: 'Abcdef1.' } });
  assert.equal(sinId.body.error, 'id_usuario inválido');
  const debil = await pedir('POST', '/auth/admin/reset-user-password', { token: admin, cuerpo: { id_usuario: 5, nueva: 'abcdefgh' } });
  assert.equal(debil.status, 400);
  assert.match(debil.body.error, /mínimo 8 caracteres/);
});

test('token de acción: solo purpose admin_reset_user con destino', async () => {
  const sin = await pedir('GET', '/auth/admin/reset-user-token-info');
  assert.equal(sin.status, 400);
  const otro = jwt.sign({ purpose: 'reset', sub: 1 }, secreto);
  const malo = await pedir('GET', `/auth/admin/reset-user-token-info?token=${otro}`);
  assert.equal(malo.status, 401);
  assert.equal(malo.body.error, 'Token inválido');

  const valido = jwt.sign({ purpose: 'admin_reset_user', target: 987654321 }, secreto, { expiresIn: '5m' });
  const info = await pedir('GET', `/auth/admin/reset-user-token-info?token=${valido}`);
  assert.equal(info.status, 200);
  assert.equal(info.body.id_usuario, 987654321);
  assert.equal(info.body.nombre_usuario, null);

  const debil = await pedir('POST', '/auth/admin/reset-user-password/token', { cuerpo: { token: valido, nueva: 'debil' } });
  assert.equal(debil.status, 400);
});

test('usuarios activos devuelve una lista', async () => {
  const r = await pedir('GET', '/api/usuarios-activos');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body));
});
