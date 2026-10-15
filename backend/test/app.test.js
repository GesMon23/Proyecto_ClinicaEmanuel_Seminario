// Aplicación completa: CORS, montaje en raíz y /api, QR y llamados en tiempo real.
const { test, before, after } = require('node:test');
const http = require('node:http');
const { assert, pool } = require('./helpers');
const { crearApp } = require('../src/app');
const jwt = require('jsonwebtoken');
const { origenPermitido, origenesConfigurados } = require('../src/config/cors');
const { esPublica, sinPrefijoApi } = require('../src/config/acceso');
const { codigosUsados } = require('../src/config/permisos');
const { EventosLlamado } = require('../src/modules/llamados');
const { tamano } = require('../src/modules/qr');

let servidor;
let puerto;

// Usuarios simulados (el servidor no ve los datos de las transacciones de prueba):
// 999999 con todas las pestañas, 999990 solo con Turnos > Llamado y 999980 dado de baja
const USUARIOS = {
  999999: { activo: true, permisos: codigosUsados() },
  999990: { activo: true, permisos: ['turnos.llamado'] },
  999980: { activo: false, permisos: codigosUsados() },
};

before(async () => {
  const app = crearApp({ cargarAcceso: async (id) => USUARIOS[id] });
  servidor = await new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
  puerto = servidor.address().port;
});

after(async () => {
  servidor.closeAllConnections?.();
  await new Promise((ok) => servidor.close(ok));
  await pool.end();
});

// Las peticiones llevan la sesión de 999999 salvo { sinSesion: true } o { token }
const tokenDe = (sub) => jwt.sign({ sub, nombre_usuario: 'prueba', roles: [] }, process.env.JWT_SECRET);
const TOKEN = tokenDe(999999);

function pedir(metodo, ruta, { cuerpo, headers = {}, binario = false, sinSesion = false, token = TOKEN } = {}) {
  return new Promise((ok, fallo) => {
    const datos = cuerpo ? JSON.stringify(cuerpo) : null;
    const h = sinSesion ? { ...headers } : { Authorization: `Bearer ${token}`, ...headers };
    if (datos) { h['Content-Type'] = 'application/json'; h['Content-Length'] = Buffer.byteLength(datos); }
    const req = http.request({ host: 'localhost', port: puerto, path: ruta, method: metodo, headers: h }, (res) => {
      const trozos = [];
      res.on('data', (d) => trozos.push(d));
      res.on('end', () => {
        const buf = Buffer.concat(trozos);
        ok({ status: res.statusCode, headers: res.headers, body: binario ? buf : (buf.length ? JSON.parse(buf.toString()) : null) });
      });
    });
    req.on('error', fallo);
    if (datos) req.write(datos);
    req.end();
  });
}

// ------------------------------------------------------------------ unitarias

test('CORS: mismo origen, orígenes configurados, subdominios y extraños', () => {
  const origenes = origenesConfigurados({ CORS_ORIGENES: 'https://app.ejemplo.com, *.clinicaemanuel.com.gt', NODE_ENV: 'production' });
  assert.equal(origenPermitido(undefined, 'x', origenes), true);
  assert.equal(origenPermitido('https://pre.clinicaemanuel.com.gt', 'pre.clinicaemanuel.com.gt', []), true, 'mismo origen');
  assert.equal(origenPermitido('http://localhost:8080', 'localhost:8080', []), true, 'mismo origen con puerto');
  assert.equal(origenPermitido('https://app.ejemplo.com', 'api.ejemplo.com', origenes), true);
  assert.equal(origenPermitido('https://pre.clinicaemanuel.com.gt', 'otro', origenes), true, 'comodín de subdominio');
  assert.equal(origenPermitido('https://clinicaemanuel.com.gt.evil.com', 'otro', origenes), false);
  assert.equal(origenPermitido('https://evil.com', 'otro', origenes), false);
  assert.equal(origenPermitido('http://localhost:3000', 'otro', origenes), false, 'Vite solo fuera de producción');
  assert.equal(origenPermitido('http://localhost:3000', 'otro', origenesConfigurados({})), true);
  assert.equal(origenPermitido('no-es-url', 'otro', origenes), false);
});

test('acceso: solo las rutas de la lista son públicas, con o sin prefijo /api', () => {
  assert.equal(sinPrefijoApi('/api/api/pacientes'), '/pacientes');
  assert.equal(sinPrefijoApi('/apisomething'), '/apisomething', 'solo quita el prefijo /api completo');
  for (const [m, r] of [['GET', '/health'], ['POST', '/api/auth/login'], ['POST', '/auth/forgot-password'],
    ['GET', '/api/auth/reset-password/info'], ['POST', '/api/api/auth/reset-password'], ['GET', '/api/GclinicasT'],
    ['GET', '/api/Gturno-actual/HEMODI%C3%81LISIS'], ['GET', '/api/turnos/llamado-sse'], ['GET', '/api/turnos/llamado-events'],
    ['GET', '/api/turnos-tv/foto/123'], ['HEAD', '/turnos-tv/foto/123']]) {
    assert.equal(esPublica(m, r), true, `${m} ${r} debe ser pública`);
  }
  for (const [m, r] of [['POST', '/api/turnos/llamado'], ['GET', '/api/Gturno-actual-usuario'], ['GET', '/api/pacientes'],
    ['GET', '/medicos'], ['POST', '/auth/change-password'], ['GET', '/api/qr'], ['GET', '/api/foto/123'], ['GET', '/fotos/123.jpg'],
    ['GET', '/api/estadisticas/panel/pacientes'], ['GET', '/fotos/../../etc/passwd'], ['GET', '/api/auth/reset-password/info/x']]) {
    assert.equal(esPublica(m, r), false, `${m} ${r} debe exigir sesión`);
  }
});

test('tamaño del QR: entre 80 y 1024, 220 por omisión', () => {
  assert.equal(tamano(undefined), 220);
  assert.equal(tamano('10'), 80);
  assert.equal(tamano('5000'), 1024);
  assert.equal(tamano('abc'), 220);
  assert.equal(tamano('300'), 300);
});

test('eventos de llamado: hora y número del servidor, acotados, filtrados y enviados a los clientes', () => {
  let reloj = 0;
  const store = new EventosLlamado({ maximo: 3, ahora: () => reloj });
  const recibido = [];
  const cliente = store.conectar({ write: (d) => recibido.push(d) });
  for (let i = 1; i <= 5; i++) {
    reloj = i * 10;
    // La hora que manda el equipo que llama se ignora: un reloj atrasado hacía que la TV no recibiera el llamado
    store.publicar({ clinica: 'A', accion: 'llamar', turnoId: i, ts: 1, idLlamado: `ll-${i}` });
  }
  assert.equal(store.eventos.length, 3, 'solo conserva los últimos');
  assert.deepEqual(store.desde(30, 100).map((e) => e.ts), [40, 50], 'filtra con la hora del servidor');
  assert.deepEqual(store.eventos.map((e) => e.id), [3, 4, 5], 'número correlativo');
  assert.equal(store.eventos[0].idLlamado, 'll-3');
  assert.deepEqual(store.despuesDeId(3).map((e) => e.id), [4, 5], 'lo perdido desde una reconexión');
  assert.deepEqual(store.despuesDeId('x'), []);
  assert.equal(store.desde(0, 1).length, 1);
  assert.equal(recibido.length, 5);
  assert.match(recibido[0], /^id: 1\ndata: \{.*\}\n\n$/);
  store.desconectar(cliente);
  store.publicar({ clinica: 'A', accion: 'x' });
  assert.equal(recibido.length, 5, 'un cliente desconectado ya no recibe');
});

// ------------------------------------------------------------------ HTTP

test('los módulos responden en la raíz y bajo /api', async () => {
  assert.equal((await pedir('GET', '/medicos')).status, 200);
  assert.equal((await pedir('GET', '/api/medicos')).status, 200);
  assert.equal((await pedir('GET', '/GclinicasT')).status, 200);
  assert.equal((await pedir('GET', '/api/GclinicasT')).status, 200);
  assert.equal((await pedir('GET', '/api/estadisticas/pacientes-total')).status, 200);
});

test('sin sesión: los datos exigen token y las rutas públicas responden', async () => {
  for (const ruta of ['/api/medicos', '/medicos', '/api/estadisticas/panel/pacientes', '/api/GestadosTurnoT', '/api/qr?text=x']) {
    const r = await pedir('GET', ruta, { sinSesion: true });
    assert.equal(r.status, 401, `${ruta} sin sesión`);
    assert.deepEqual(r.body, { error: 'Sesión requerida' });
  }
  const tokenFalso = await pedir('GET', '/api/medicos', { sinSesion: true, headers: { Authorization: 'Bearer x.y.z' } });
  assert.equal(tokenFalso.status, 401, 'un token inválido tampoco sirve');
  const publicar = await pedir('POST', '/api/turnos/llamado', { sinSesion: true, cuerpo: { clinica: 'X', accion: 'llamar' } });
  assert.equal(publicar.status, 401, 'publicar un llamado exige sesión');

  assert.equal((await pedir('GET', '/api/GclinicasT', { sinSesion: true })).status, 200, 'la TV lee las clínicas sin sesión');
  assert.equal((await pedir('GET', '/api/turnos/llamado-events', { sinSesion: true })).status, 200);
  assert.equal((await pedir('POST', '/api/auth/login', { sinSesion: true, cuerpo: {} })).status, 400, 'el login no exige sesión');
});

test('permisos: cada pestaña abre solo sus rutas; usuario dado de baja -> 401', async () => {
  const llamado = tokenDe(999990);
  const propia = await pedir('GET', '/api/Gturno-actual-usuario', { token: llamado });
  assert.ok(![401, 403].includes(propia.status), `su pestaña pasa el control de acceso (respondió ${propia.status})`);
  assert.equal((await pedir('GET', '/api/medicos', { token: llamado })).status, 200, 'catálogo: basta la sesión');
  for (const ruta of ['/api/GturnosT', '/api/pacientes/123', '/api/estadisticas/panel/pacientes', '/api/roles/activos']) {
    const r = await pedir('GET', ruta, { token: llamado });
    assert.equal(r.status, 403, `${ruta} sin la pestaña`);
    assert.deepEqual(r.body, { error: 'No autorizado' });
  }
  const sinRegla = await pedir('GET', '/api/ruta-sin-regla');
  assert.equal(sinRegla.status, 403, 'una ruta sin regla queda cerrada aunque tenga todas las pestañas');

  const baja = await pedir('GET', '/api/medicos', { token: tokenDe(999980) });
  assert.equal(baja.status, 401, 'la sesión de un usuario dado de baja deja de servir');
  assert.deepEqual(baja.body, { error: 'Sesión requerida' });
});

test('fotos: exigen sesión y la TV solo recibe la del paciente en atención', async () => {
  for (const ruta of ['/api/foto/123', '/api/fotos/123.jpg', '/fotos/123.jpg', '/api/Afoto/123', '/api/check-photo/123']) {
    assert.equal((await pedir('GET', ruta, { sinSesion: true })).status, 401, `${ruta} sin sesión`);
  }
  const tv = await pedir('GET', '/api/turnos-tv/foto/NO-EXISTE-123', { sinSesion: true });
  assert.equal(tv.status, 404, 'un paciente que no está en atención no expone su foto');
  assert.deepEqual(tv.body, { error: 'Foto no encontrada' });
});

test('laboratorios: el registro responde bajo /api/laboratorios (antes daba 404)', async () => {
  const ultimo = await pedir('GET', '/api/laboratorios/NO-EXISTE-123/parametros/ultimo');
  assert.equal(ultimo.status, 200);
  assert.deepEqual(ultimo.body.data, []);
  assert.equal((await pedir('POST', '/api/laboratorios', { cuerpo: {} })).status, 400, 'llega al handler (valida antes de escribir)');
});

test('un JSON malformado responde 400 en JSON, sin la traza ni las rutas del servidor', async () => {
  const r = await new Promise((ok, fallo) => {
    const req = http.request({
      host: 'localhost', port: puerto, path: '/api/laboratorios', method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    }, (res) => { let b = ''; res.on('data', (d) => { b += d; }); res.on('end', () => ok({ status: res.statusCode, body: b })); });
    req.on('error', fallo);
    req.end('{no_afiliacion:sin comillas}');
  });
  assert.equal(r.status, 400);
  assert.deepEqual(JSON.parse(r.body), { error: 'El cuerpo de la petición no es un JSON válido' });
  assert.ok(!/node_modules|at JSON\.parse/.test(r.body));
});

test('salud: responde ok con la BD disponible', async () => {
  for (const ruta of ['/health', '/api/health']) {
    const r = await pedir('GET', ruta, { sinSesion: true });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { estado: 'ok' });
  }
});

test('CORS: rechaza un origen desconocido', async () => {
  const bueno = await pedir('GET', '/medicos', { headers: { Origin: 'http://localhost:3000' } });
  assert.equal(bueno.headers['access-control-allow-origin'], 'http://localhost:3000');
  const malo = await pedir('GET', '/medicos', { headers: { Origin: 'https://evil.com' } });
  assert.equal(malo.status, 403);
  assert.deepEqual(malo.body, { error: 'Origen no permitido' });
  const mismo = await pedir('GET', '/medicos', { headers: { Origin: `http://localhost:${puerto}` } });
  assert.equal(mismo.status, 200, 'el mismo origen siempre se acepta');
});

test('QR: PNG válido y texto requerido', async () => {
  for (const ruta of ['/api/qr', '/qr']) {
    const ok = await pedir('GET', `${ruta}?text=hola&size=100`, { binario: true });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers['content-type'], 'image/png');
    assert.equal(ok.body.subarray(1, 4).toString(), 'PNG');
    assert.equal((await pedir('GET', ruta)).status, 400);
  }
});

test('llamados: publicar y consultar por polling', async () => {
  const sin = await pedir('POST', '/api/turnos/llamado', { cuerpo: { clinica: 'X' } });
  assert.equal(sin.status, 400);

  const antes = (await pedir('GET', '/api/turnos/llamado-events?since=0&max=1')).body.now;
  // Un reloj muy atrasado en el equipo que llama no impide que la TV reciba el llamado
  const publicado = await pedir('POST', '/api/turnos/llamado', { cuerpo: { clinica: 'PRUEBA', accion: 'llamar', turnoId: 7, ts: 1, idLlamado: 'abc' } });
  assert.equal(publicado.status, 200);
  assert.equal(typeof publicado.body.id, 'number');

  const r = await pedir('GET', `/api/turnos/llamado-events?since=${antes - 1}&max=10`);
  assert.equal(r.status, 200);
  const e = r.body.events.find((x) => x.clinica === 'PRUEBA' && x.turnoId === '7');
  assert.ok(e, 'la TV recibe el llamado aunque el reloj de quien llama esté atrasado');
  assert.equal(e.idLlamado, 'abc');
  assert.ok(e.ts >= antes, 'la hora es la del servidor');
  assert.equal(typeof r.body.now, 'number');
});

test('llamados: al reconectarse, la TV recibe por SSE lo que se perdió (Last-Event-ID)', async () => {
  const primero = (await pedir('POST', '/api/turnos/llamado', { cuerpo: { clinica: 'RECONEXION', accion: 'llamar' } })).body.id;
  await pedir('POST', '/api/turnos/llamado', { cuerpo: { clinica: 'PERDIDO', accion: 'llamar' } });
  await new Promise((ok, fallo) => {
    const req = http.get({ host: 'localhost', port: puerto, path: '/api/turnos/llamado-sse', headers: { 'Last-Event-ID': String(primero) } }, (res) => {
      assert.equal(res.headers['x-accel-buffering'], 'no');
      let acumulado = '';
      res.on('data', (d) => {
        acumulado += d.toString();
        if (acumulado.includes('"clinica":"PERDIDO"')) {
          assert.match(acumulado, /retry: \d+/);
          assert.ok(!acumulado.includes('"clinica":"RECONEXION"'), 'no repite lo que ya tenía');
          req.destroy(); ok();
        }
      });
    });
    req.on('error', (e) => { if (e.code !== 'ECONNRESET') fallo(e); });
  });
});

test('llamados: la suscripción SSE recibe los eventos nuevos', async () => {
  await new Promise((ok, fallo) => {
    const req = http.get({ host: 'localhost', port: puerto, path: '/api/turnos/llamado-sse' }, (res) => {
      assert.equal(res.headers['content-type'], 'text/event-stream');
      let acumulado = '';
      let publicado = false;
      res.on('data', (d) => {
        acumulado += d.toString();
        if (!publicado && acumulado.includes(': connected')) {
          publicado = true;
          pedir('POST', '/api/turnos/llamado', { cuerpo: { clinica: 'SSE', accion: 'llamar' } }).catch(fallo);
        }
        if (acumulado.includes('"clinica":"SSE"')) { req.destroy(); ok(); }
      });
    });
    req.on('error', (e) => { if (e.code !== 'ECONNRESET') fallo(e); });
  });
});
