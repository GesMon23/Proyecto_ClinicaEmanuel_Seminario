// Aplicación completa: CORS, montaje en raíz y /api, QR y llamados en tiempo real.
const { test, before, after } = require('node:test');
const http = require('node:http');
const { assert, pool } = require('./helpers');
const { crearApp } = require('../src/app');
const { origenPermitido } = require('../src/config/cors');
const { EventosLlamado } = require('../src/modules/llamados');
const { tamano } = require('../src/modules/qr');

let servidor;
let puerto;

before(async () => {
  servidor = await new Promise((ok) => { const s = crearApp().listen(0, () => ok(s)); });
  puerto = servidor.address().port;
});

after(async () => {
  servidor.closeAllConnections?.();
  await new Promise((ok) => servidor.close(ok));
  await pool.end();
});

function pedir(metodo, ruta, { cuerpo, headers = {}, binario = false } = {}) {
  return new Promise((ok, fallo) => {
    const datos = cuerpo ? JSON.stringify(cuerpo) : null;
    const h = { ...headers };
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

test('CORS: orígenes conocidos, subdominios y extraños', () => {
  assert.equal(origenPermitido(undefined), true);
  assert.equal(origenPermitido('http://localhost:3000'), true);
  assert.equal(origenPermitido('https://app.clinicaemanuel.com.gt'), true);
  assert.equal(origenPermitido('https://clinicaemanuel.com.gt.evil.com'), false);
  assert.equal(origenPermitido('https://evil.com'), false);
  assert.equal(origenPermitido('no-es-url'), false);
});

test('tamaño del QR: entre 80 y 1024, 220 por omisión', () => {
  assert.equal(tamano(undefined), 220);
  assert.equal(tamano('10'), 80);
  assert.equal(tamano('5000'), 1024);
  assert.equal(tamano('abc'), 220);
  assert.equal(tamano('300'), 300);
});

test('eventos de llamado: acotados, filtrados por tiempo y enviados a los clientes', () => {
  const store = new EventosLlamado({ maximo: 3, ahora: () => 100 });
  const recibido = [];
  const cliente = store.conectar({ write: (d) => recibido.push(d) });
  for (let i = 1; i <= 5; i++) store.publicar({ clinica: 'A', accion: 'llamar', turnoId: i, ts: i * 10 });
  assert.equal(store.eventos.length, 3, 'solo conserva los últimos');
  assert.deepEqual(store.desde(30, 100).map((e) => e.ts), [40, 50]);
  assert.equal(store.desde(0, 1).length, 1);
  assert.equal(recibido.length, 5);
  assert.match(recibido[0], /^data: \{.*\}\n\n$/);
  store.desconectar(cliente);
  store.publicar({ clinica: 'A', accion: 'x' });
  assert.equal(recibido.length, 5, 'un cliente desconectado ya no recibe');
  assert.equal(store.eventos.at(-1).ts, 100, 'sin ts usa el reloj');
});

// ------------------------------------------------------------------ HTTP

test('los módulos responden en la raíz y bajo /api', async () => {
  assert.equal((await pedir('GET', '/medicos')).status, 200);
  assert.equal((await pedir('GET', '/api/medicos')).status, 200);
  assert.equal((await pedir('GET', '/GclinicasT')).status, 200);
  assert.equal((await pedir('GET', '/api/GclinicasT')).status, 200);
  assert.equal((await pedir('GET', '/api/estadisticas/pacientes-total')).status, 200);
});

test('CORS: rechaza un origen desconocido', async () => {
  const bueno = await pedir('GET', '/medicos', { headers: { Origin: 'http://localhost:3000' } });
  assert.equal(bueno.headers['access-control-allow-origin'], 'http://localhost:3000');
  const malo = await pedir('GET', '/medicos', { headers: { Origin: 'https://evil.com' }, binario: true });
  assert.notEqual(malo.status, 200);
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

  const ts = Date.now() + 1000;
  const publicado = await pedir('POST', '/api/turnos/llamado', { cuerpo: { clinica: 'PRUEBA', accion: 'llamar', turnoId: 7, ts } });
  assert.equal(publicado.status, 200);

  const r = await pedir('GET', `/api/turnos/llamado-events?since=${ts - 1}&max=10`);
  assert.equal(r.status, 200);
  assert.ok(r.body.events.some((e) => e.clinica === 'PRUEBA' && e.turnoId === '7'));
  assert.equal(typeof r.body.now, 'number');
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
