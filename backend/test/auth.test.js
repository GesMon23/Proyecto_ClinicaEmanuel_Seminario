// Autenticación: reglas en memoria, contraseñas, correos y contrato HTTP. No se crea ni modifica ningún usuario
// ni se envían correos: la recuperación se prueba con el acceso a datos y el envío simulados.
const { test, before, after } = require('node:test');
const crypto = require('node:crypto');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { assert, pool } = require('./helpers');
const { router } = require('../src/modules/auth');
const service = require('../src/modules/auth/auth.service');
const repo = require('../src/modules/auth/auth.repository');
const mailer = require('../src/utils/mailer');
const { IntentosFallidos, TokensUsados, Enfriamiento } = require('../src/modules/auth/memoria');
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

test('enfriamiento: una solicitud por clave cada tantos segundos', () => {
  let ahora = 1_000_000;
  const espera = new Enfriamiento({ segundos: 60, ahora: () => ahora });
  assert.equal(espera.intentar('Ana'), 0);
  assert.equal(espera.intentar('ANA'), 60_000, 'misma clave sin importar mayúsculas');
  assert.equal(espera.intentar('otro'), 0);
  ahora += 61_000;
  assert.equal(espera.intentar('ana'), 0, 'pasado el tiempo se puede repetir');
  ahora += 61_000;
  espera.purgar();
  assert.equal(espera.ultimos.size, 0);
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

// ------------------------------------------------- recuperación por autoservicio

// Variables de correo durante una prueba: {} = sin configurar; SMTP_FALSO = configurado (nunca conecta)
const VARIABLES_CORREO = ['MAIL_PROVIDER', 'MAIL_API_KEY', 'MAIL_FROM', 'ADMIN_EMAIL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
const SMTP_FALSO = { SMTP_HOST: 'smtp.invalid', SMTP_PORT: '587', SMTP_USER: 'prueba', SMTP_PASS: 'prueba', MAIL_FROM: 'prueba@invalid' };
async function conCorreo(valores, fn) {
  const previos = Object.fromEntries(VARIABLES_CORREO.map((k) => [k, process.env[k]]));
  VARIABLES_CORREO.forEach((k) => delete process.env[k]);
  Object.assign(process.env, valores);
  try { return await fn(); } finally {
    VARIABLES_CORREO.forEach((k) => { if (previos[k] === undefined) delete process.env[k]; else process.env[k] = previos[k]; });
  }
}

// Reemplaza funciones de un módulo durante una prueba (los servicios las llaman a través del módulo)
async function conReemplazos(modulo, reemplazos, fn) {
  const originales = Object.fromEntries(Object.keys(reemplazos).map((k) => [k, modulo[k]]));
  Object.assign(modulo, reemplazos);
  try { return await fn(); } finally { Object.assign(modulo, originales); }
}

const huella = (hash) => crypto.createHash('sha256').update(String(hash)).digest('hex').slice(0, 16);
const unico = (prefijo) => `${prefijo}${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

test('recuperación: pide usuario o correo y avisa si el correo no está configurado', async () => {
  const vacio = await pedir('POST', '/auth/forgot-password', { cuerpo: {} });
  assert.equal(vacio.status, 400);
  assert.match(vacio.body.error, /usuario o tu correo/);

  const sinCorreo = await conCorreo({}, () => pedir('POST', '/auth/forgot-password', { cuerpo: { identificador: unico('x') } }));
  assert.equal(sinCorreo.status, 503);
  assert.match(sinCorreo.body.error, /no está configurado/);
});

test('recuperación: respuesta genérica para usuarios inexistentes y espera entre solicitudes', async () => {
  await conCorreo(SMTP_FALSO, async () => {
    const id = unico('noexiste');
    const r = await pedir('POST', '/auth/forgot-password', { cuerpo: { identificador: id } });
    assert.equal(r.status, 200, 'no revela que el usuario no existe');
    assert.match(r.body.mensaje, /Si el usuario existe/);
    const otra = await pedir('POST', '/auth/forgot-password', { cuerpo: { identificador: id.toUpperCase() } });
    assert.equal(otra.status, 429);
    assert.match(otra.body.error, /Espera \d+ segundos/);
  });
});

test('recuperación: el correo lleva un enlace (nunca la contraseña) y un fallo de envío se informa', async () => {
  const usuario = { id_usuario: 41, nombre_usuario: 'ana', contrasenia: '$2a$04$hashdeprueba', email: 'ana@invalid' };
  const enviados = [];
  await conCorreo(SMTP_FALSO, () => conReemplazos(repo, { usuariosParaRecuperacion: async () => [usuario] }, async () => {
    await conReemplazos(mailer, { enviarCorreo: async (m) => { enviados.push(m); return {}; } }, async () => {
      const ok = await pedir('POST', '/auth/forgot-password', { cuerpo: { identificador: unico('ana') } });
      assert.equal(ok.status, 200);
    });
    assert.equal(enviados.length, 1);
    assert.equal(enviados[0].to, 'ana@invalid');
    const enlace = enviados[0].html.match(/restablecer-contrasena\?token=([^"&]+)/);
    assert.ok(enlace, 'el correo trae el enlace de restablecimiento');
    const payload = jwt.verify(decodeURIComponent(enlace[1]), secreto);
    assert.equal(payload.purpose, 'reset');
    assert.equal(payload.sub, 41);
    assert.equal(payload.exp - payload.iat, service.MINUTOS_ENLACE * 60);
    assert.doesNotMatch(enviados[0].html, /contraseña temporal/i);

    await conReemplazos(mailer, { enviarCorreo: async () => { throw new Error('SMTP caído'); } }, async () => {
      const falla = await pedir('POST', '/auth/forgot-password', { cuerpo: { identificador: unico('ana') } });
      assert.equal(falla.status, 503, 'el usuario se entera de que el correo no salió');
      assert.match(falla.body.error, /No pudimos enviar el correo/);
    });
  }));
});

test('restablecer: valida el enlace, exige contraseña fuerte y el enlace sirve una sola vez', async () => {
  const sinToken = await pedir('POST', '/auth/reset-password', { cuerpo: { nueva: 'Abcdef1.' } });
  assert.equal(sinToken.status, 400);
  const debil = await pedir('POST', '/auth/reset-password', { cuerpo: { token: 'x.y.z', nueva: '12345678' } });
  assert.match(debil.body.error, /mínimo 8 caracteres/);
  const invalido = await pedir('POST', '/auth/reset-password', { cuerpo: { token: 'x.y.z', nueva: 'Abcdef1.' } });
  assert.equal(invalido.status, 401);
  const otroFin = jwt.sign({ sub: 1, purpose: 'otro', h: 'x' }, secreto);
  assert.equal((await pedir('GET', `/auth/reset-password/info?token=${otroFin}`)).status, 401);
  assert.equal((await pedir('GET', '/auth/reset-password/info')).status, 400);

  // Usuario simulado: el hash cambia al restablecer, como en la base
  const cuenta = { id_usuario: 77, nombre_usuario: 'ana', contrasenia: '$2a$04$hashoriginal', estado: true, email: null, empleado_activo: true };
  await conReemplazos(repo, {
    credencial: async (id) => (Number(id) === 77 ? { ...cuenta } : null),
    actualizarPassword: async (_id, hash) => { cuenta.contrasenia = hash; },
    limpiarMarcaCambio: async () => {},
  }, async () => {
    const token = jwt.sign({ purpose: 'reset', sub: 77, h: huella(cuenta.contrasenia) }, secreto, { expiresIn: '30m' });
    const info = await pedir('GET', `/auth/reset-password/info?token=${encodeURIComponent(token)}`);
    assert.equal(info.status, 200);
    assert.equal(info.body.nombre_usuario, 'ana');

    const ok = await pedir('POST', '/auth/reset-password', { cuerpo: { token, nueva: 'NuevaClave#2026' } });
    assert.equal(ok.status, 200);
    assert.ok(await bcrypt.compare('NuevaClave#2026', cuenta.contrasenia), 'guarda la nueva contraseña con bcrypt');

    const otraVez = await pedir('POST', '/auth/reset-password', { cuerpo: { token, nueva: 'OtraClave#2026' } });
    assert.equal(otraVez.status, 401, 'el mismo enlace no sirve dos veces');
    const tokenSinUsar = jwt.sign({ purpose: 'reset', sub: 77, h: huella('$2a$04$hashoriginal') }, secreto, { expiresIn: '30m' });
    const viejo = await pedir('POST', '/auth/reset-password', { cuerpo: { token: tokenSinUsar, nueva: 'OtraClave#2026' } });
    assert.equal(viejo.status, 401, 'cualquier enlace anterior al cambio queda inválido');
  });
});

// El permiso (usuarios.roles) lo exige la aplicación completa: ver app.test.js
test('administrador: envía el enlace (nunca fija contraseñas) y valida id y correo', async () => {
  const admin = jwt.sign({ sub: 1, roles: ['RolGestionUsuarios'] }, secreto);
  const sinId = await pedir('POST', '/auth/admin/reset-user-password', { token: admin, cuerpo: {} });
  assert.equal(sinId.body.error, 'id_usuario inválido');
  const sinCorreo = await conCorreo({}, () => pedir('POST', '/auth/admin/reset-user-password', { token: admin, cuerpo: { id_usuario: 5 } }));
  assert.equal(sinCorreo.status, 503);
  await conCorreo(SMTP_FALSO, async () => {
    const inexistente = await pedir('POST', '/auth/admin/reset-user-password', { token: admin, cuerpo: { id_usuario: 987654321 } });
    assert.equal(inexistente.status, 404);
  });
});

test('usuarios activos devuelve una lista', async () => {
  const r = await pedir('GET', '/api/usuarios-activos');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body));
});
