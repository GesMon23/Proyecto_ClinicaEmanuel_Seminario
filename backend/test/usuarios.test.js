// Empleados, usuarios y roles: autorización, validaciones y lecturas. No se escribe nada en la base.
const { test, before, after } = require('node:test');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');
const { assert, pool } = require('./helpers');
const { router } = require('../src/modules/usuarios');
const service = require('../src/modules/usuarios/usuarios.service');

let servidor;
let puerto;

const secreto = process.env.JWT_SECRET || 'dev_secret_change_me';
const tokenAdmin = jwt.sign({ sub: 999999, nombre_usuario: 'prueba', roles: ['RolGestionUsuarios'] }, secreto);
const tokenSinRol = jwt.sign({ sub: 999998, nombre_usuario: 'otro', roles: ['RolTurnos'] }, secreto);

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

test('errorDeEmpleado valida obligatorios, DPI, teléfono y email', () => {
  const ok = {
    dpi: '1234567890123', primer_nombre: 'A', primer_apellido: 'B', fecha_nacimiento: '1990-01-01', sexo: 'M',
    direccion: 'X', telefono: '12345678', email: 'a@b.co', fecha_ingreso: '2026-01-01',
  };
  assert.equal(service.errorDeEmpleado(ok), null);
  assert.match(service.errorDeEmpleado({ ...ok, direccion: '' }), /obligatorios/);
  assert.match(service.errorDeEmpleado({ ...ok, dpi: '123' }), /13 caracteres/);
  assert.match(service.errorDeEmpleado({ ...ok, telefono: '1234' }), /8 dígitos/);
  assert.match(service.errorDeEmpleado({ ...ok, email: 'no-es-email' }), /email/);
});

test('camposEmpleado deja solo los campos permitidos y convierte "" en null', () => {
  const r = service.camposEmpleado({ primer_nombre: 'ANA', segundo_nombre: '', id_empleado: 5, rol: 'x' });
  assert.deepEqual(r, { primer_nombre: 'ANA', segundo_nombre: null });
});

// ------------------------------------------------------------ autorización

test('sin token -> 401; token inválido -> 401; sin el rol -> 403', async () => {
  const sin = await pedir('GET', '/roles/activos');
  assert.equal(sin.status, 401);
  assert.equal(sin.body.error, 'Token requerido');

  const malo = await pedir('GET', '/roles/activos', { token: 'x.y.z' });
  assert.equal(malo.status, 401);
  assert.equal(malo.body.error, 'Token inválido');

  const prohibido = await pedir('GET', '/roles/activos', { token: tokenSinRol });
  assert.equal(prohibido.status, 403);
  assert.equal(prohibido.body.error, 'No autorizado');
});

test('registrar empleados solo exige sesión, no rol; valida antes de escribir', async () => {
  const sesion = await pedir('POST', '/empleados');
  assert.equal(sesion.status, 401);

  const invalido = await pedir('POST', '/empleados', { token: tokenSinRol, cuerpo: { dpi: '1' } });
  assert.equal(invalido.status, 400);
  assert.match(invalido.body.error, /obligatorios/);

  const masivo = await pedir('PUT', '/registro-empleados', { token: tokenSinRol, cuerpo: { empleados: [] } });
  assert.equal(masivo.status, 400);
});

// ------------------------------------------------------------ validaciones

test('usuarios: validaciones de creación, existencia y búsqueda', async () => {
  const corto = await pedir('POST', '/usuarios', { token: tokenAdmin, cuerpo: { usuario: 'abc', id_empleado: 1 } });
  assert.equal(corto.status, 400);
  assert.match(corto.body.error, /8 letras/);

  const sinEmpleado = await pedir('POST', '/usuarios', { token: tokenAdmin, cuerpo: { usuario: 'abcdefgh' } });
  assert.equal(sinEmpleado.status, 400);

  const vacio = await pedir('GET', '/usuarios/existe', { token: tokenAdmin });
  assert.equal(vacio.status, 400);

  const busqueda = await pedir('GET', '/usuarios/by-usuario?usuario=zzzzzzzz-no-existe', { token: tokenAdmin });
  assert.equal(busqueda.status, 404);
  assert.equal(busqueda.body.error, 'Usuario no encontrado');
});

test('roles y estado de usuario: id inválido, estado no booleano y auto-inactivación', async () => {
  const id = await pedir('GET', '/usuarios/abc/roles', { token: tokenAdmin });
  assert.equal(id.status, 400);

  const estado = await pedir('PATCH', '/usuarios/5/estado', { token: tokenAdmin, cuerpo: { estado: 'no' } });
  assert.equal(estado.status, 400);
  assert.match(estado.body.error, /boolean/);

  const propio = await pedir('PATCH', '/usuarios/999999/estado', { token: tokenAdmin, cuerpo: { estado: false } });
  assert.equal(propio.status, 400);
  assert.match(propio.body.error, /propio usuario/);

  const dpi = await pedir('PATCH', '/empleados/123/estado', { token: tokenAdmin, cuerpo: {} });
  assert.equal(dpi.status, 400);

  const vacio = await pedir('PUT', '/empleados/123', { token: tokenAdmin, cuerpo: { rol: 'x' } });
  assert.equal(vacio.status, 400);
  assert.match(vacio.body.error, /campos válidos/);
});

// ----------------------------------------------------------------- lecturas

test('roles activos, empleados sin usuario y existencia de usuario', async () => {
  const roles = await pedir('GET', '/roles/activos', { token: tokenAdmin });
  assert.equal(roles.status, 200);
  assert.ok(Array.isArray(roles.body));

  const libres = await pedir('GET', '/empleados/sin-usuario', { token: tokenAdmin });
  assert.equal(libres.status, 200);
  assert.ok(Array.isArray(libres.body));

  const existe = await pedir('GET', '/usuarios/existe?usuario=zzzzzzzz-no-existe', { token: tokenAdmin });
  assert.equal(existe.status, 200);
  assert.equal(existe.body.existe, false);

  const lista = await pedir('GET', '/empleados?limit=5', { token: tokenAdmin });
  assert.ok([200, 501].includes(lista.status));
  if (lista.status === 200) assert.ok(Array.isArray(lista.body));
});
