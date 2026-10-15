// Permisos por pestaña: reglas de config/permisos.js, catálogo de la base y control de acceso (config/acceso.js).
const { test, after } = require('node:test');
const { assert, pool, tx, rechaza, paciente, clinicaHemodialisis, crearTurno } = require('./helpers');
const { crearApp } = require('../src/app');
const { SESION, permisosDeRuta, codigosUsados } = require('../src/config/permisos');
const { crearControlDeAcceso, olvidarAccesos, esPublica, sinPrefijoApi, VIGENCIA_MS } = require('../src/config/acceso');
const jwt = require('jsonwebtoken');

after(() => pool.end());

// Rutas montadas en la app (Express 4): [método, ruta con el prefijo del montaje]
function rutasMontadas(app) {
  const prefijo = (capa) => {
    const m = capa.regexp && capa.regexp.source.match(/^\^\\\/(.*?)\\\/\?\(\?=/);
    return m ? `/${m[1].replace(/\\\//g, '/')}` : '';
  };
  const rutas = [];
  const recorrer = (pila, base) => pila.forEach((capa) => {
    if (capa.route) {
      const caminos = Array.isArray(capa.route.path) ? capa.route.path : [capa.route.path];
      Object.keys(capa.route.methods).forEach((m) => caminos.forEach((c) => rutas.push([m.toUpperCase(), base + c])));
    } else if (capa.handle && capa.handle.stack) recorrer(capa.handle.stack, base + prefijo(capa));
  });
  recorrer(app._router.stack, '');
  return rutas;
}

test('toda ruta montada es pública o tiene regla de permiso', () => {
  const sinRegla = rutasMontadas(crearApp())
    .map(([m, r]) => [m, r.replace(/:\w+/g, 'x1').replace(/\/$/, '') || '/'])
    .filter(([m, r]) => !esPublica(m, r) && permisosDeRuta(m, sinPrefijoApi(r)) === null)
    .map(([m, r]) => `${m} ${r}`);
  assert.deepEqual([...new Set(sinRegla)], [], 'rutas sin regla en config/permisos.js');
  assert.notEqual(permisosDeRuta('GET', '/fotos/123.jpg'), null, 'las fotos estáticas también tienen regla');
});

test('los códigos de las reglas son exactamente los de tbl_permisos', async () => {
  const { rows } = await pool.query('SELECT codigo FROM public.tbl_permisos ORDER BY codigo');
  assert.deepEqual(codigosUsados(), rows.map((r) => r.codigo));
});

test('cada rol existente conserva todas las pestañas de su módulo', async () => {
  const { rows } = await pool.query(`
    SELECT r.nombre, array_agg(p.codigo ORDER BY p.codigo) AS codigos
    FROM public.tbl_roles r JOIN public.tbl_rol_permiso rp USING (id_rol) JOIN public.tbl_permisos p USING (id_permiso)
    GROUP BY r.nombre`);
  // Los administradores pueden agregar pestañas a los roles (Permisos de Roles): se comprueba que cada rol
  // conserve al menos las de su módulo, no que esté exactamente como lo dejó la migración
  const de = Object.fromEntries(rows.map((r) => [r.nombre, r.codigos]));
  const incluye = (rol, codigos) => codigos.forEach((c) => assert.ok(de[rol]?.includes(c), `${rol} debe tener ${c}`));
  incluye('RolTurnos', ['turnos.asignacion', 'turnos.consulta', 'turnos.crear', 'turnos.llamado']);
  incluye('RolConsulta', ['consulta.pacientes']);
  incluye('RolGestionPaciente', ['pacientes.registro', 'pacientes.reingreso', 'pacientes.egreso', 'pacientes.formularios', 'pacientes.actualizacion']);
  incluye('RolGestionUsuarios', ['usuarios.registro_empleados', 'usuarios.creacion', 'usuarios.empleados', 'usuarios.roles',
    'usuarios.permisos', 'turnos.clinicas']);
  const asignados = new Set(Object.values(de).flat());
  assert.deepEqual(codigosUsados().filter((c) => !asignados.has(c)), [], 'toda pestaña la tiene al menos un rol');
});

test('reglas: las rutas fijas ganan a las de parámetro, con o sin /api', () => {
  assert.deepEqual(permisosDeRuta('GET', '/pacientes/excel'), ['reportes.pacientes']);
  assert.deepEqual(permisosDeRuta('GET', '/pacientes/egreso'), ['pacientes.egreso', 'pacientes.reingreso']);
  assert.ok(permisosDeRuta('GET', '/pacientes/123').includes('nutricion.registro'));
  assert.deepEqual(permisosDeRuta('GET', '/referencias/consulta'), ['referencias.consulta']);
  assert.deepEqual(permisosDeRuta('GET', '/referencias/123'), ['consulta.pacientes']);
  assert.deepEqual(permisosDeRuta('GET', sinPrefijoApi('/api/api/estadisticas/psicologia-kdqol-total')), ['estadisticas.psicologia']);
  assert.deepEqual(permisosDeRuta('HEAD', '/fotos/1.jpg'), permisosDeRuta('GET', '/fotos/1.jpg'));
  assert.equal(permisosDeRuta('GET', '/auth/me'), SESION);
  assert.equal(permisosDeRuta('DELETE', '/pacientes/123'), null, 'método sin regla');
  assert.equal(permisosDeRuta('GET', '/no-existe'), null);
  assert.equal(permisosDeRuta('GET', '/fotos/a/b.jpg'), null, 'un parámetro no cruza segmentos');
});

// ------------------------------------------------------------ control de acceso

// Ejecuta el middleware con una petición simulada: { estado, cuerpo } o 'next'
function ejecutar(control, { metodo = 'GET', ruta, token }) {
  return new Promise((ok) => {
    const req = { method: metodo, path: ruta, headers: token ? { authorization: `Bearer ${token}` } : {} };
    const res = { status(s) { this.s = s; return this; }, json(c) { ok({ estado: this.s, cuerpo: c }); } };
    control(req, res, () => ok('next'));
  });
}

test('acceso: usuario inactivo -> 401, sin permiso -> 403, con permiso o ruta de sesión -> pasa', async () => {
  const usuarios = { 1: { activo: true, permisos: ['turnos.llamado'] }, 2: { activo: false, permisos: ['turnos.llamado'] } };
  const control = crearControlDeAcceso({ cargarAcceso: async (id) => usuarios[id] });
  const token = (sub) => jwt.sign({ sub }, process.env.JWT_SECRET);

  assert.deepEqual(await ejecutar(control, { ruta: '/api/Gturno-actual-usuario' }), { estado: 401, cuerpo: { error: 'Sesión requerida' } });
  assert.equal(await ejecutar(control, { ruta: '/api/Gturno-actual-usuario', token: token(1) }), 'next');
  assert.equal(await ejecutar(control, { ruta: '/api/medicos', token: token(1) }), 'next', 'catálogo: basta la sesión');
  assert.deepEqual(await ejecutar(control, { ruta: '/api/GturnosT', token: token(1) }), { estado: 403, cuerpo: { error: 'No autorizado' } });
  assert.equal((await ejecutar(control, { ruta: '/api/no-existe', token: token(1) })).estado, 403, 'ruta sin regla');
  assert.equal((await ejecutar(control, { ruta: '/api/Gturno-actual-usuario', token: token(2) })).estado, 401, 'usuario dado de baja');
  assert.equal((await ejecutar(control, { ruta: '/api/medicos', token: token(3) })).estado, 401, 'usuario inexistente');
  assert.equal(await ejecutar(control, { ruta: '/api/turnos-tv/foto/1' }), 'next', 'ruta pública');
  assert.equal(await ejecutar(control, { metodo: 'OPTIONS', ruta: '/api/GturnosT' }), 'next', 'preflight de CORS');
});

test('acceso: se guarda VIGENCIA_MS y olvidarAccesos() aplica un cambio de inmediato', async () => {
  let reloj = 0;
  let lecturas = 0;
  let permisos = ['turnos.consulta'];
  const control = crearControlDeAcceso({ cargarAcceso: async () => { lecturas += 1; return { activo: true, permisos }; }, ahora: () => reloj });
  const token = jwt.sign({ sub: 7 }, process.env.JWT_SECRET);

  assert.equal(await ejecutar(control, { ruta: '/GturnosT', token }), 'next');
  permisos = [];
  assert.equal(await ejecutar(control, { ruta: '/GturnosT', token }), 'next', 'dentro de la vigencia usa lo guardado');
  assert.equal(lecturas, 1);

  reloj = VIGENCIA_MS + 1;
  assert.equal((await ejecutar(control, { ruta: '/GturnosT', token })).estado, 403, 'vencido: vuelve a leer');
  permisos = ['turnos.consulta'];
  olvidarAccesos();
  assert.equal(await ejecutar(control, { ruta: '/GturnosT', token }), 'next', 'olvidarAccesos() fuerza la lectura');
  assert.equal(lecturas, 3);
});

test('acceso: si la base falla responde 503 sin dejar pasar', async () => {
  const control = crearControlDeAcceso({ cargarAcceso: async () => { throw new Error('sin conexión'); } });
  const original = console.error;
  console.error = () => {};
  try {
    const r = await ejecutar(control, { ruta: '/medicos', token: jwt.sign({ sub: 1 }, process.env.JWT_SECRET) });
    assert.equal(r.estado, 503);
  } finally {
    console.error = original;
  }
});

// ------------------------------------------------------------ base de datos

test('sp_acceso_usuario: permisos de los roles activos y baja del usuario', async () => {
  await tx(async (c) => {
    const leer = async (id) => {
      await c.query(`CALL sp_acceso_usuario($1, 'acceso_prueba')`, [id]);
      const fila = (await c.query('FETCH ALL FROM acceso_prueba')).rows[0];
      await c.query('CLOSE acceso_prueba');
      return fila;
    };
    const { rows: [e] } = await c.query(`
      INSERT INTO tbl_empleados (dpi, primer_nombre, primer_apellido, estado) VALUES ('9999999999999', 'PRUEBA', 'PERMISOS', true)
      RETURNING id_empleado`);
    const { rows: [u] } = await c.query(`
      INSERT INTO tbl_usuarios (nombre_usuario, contrasenia, id_empleado, estado) VALUES ('prueba_permisos', 'x', $1, true)
      RETURNING id_usuario`, [e.id_empleado]);
    assert.deepEqual(await leer(u.id_usuario), { activo: true, permisos: [] }, 'sin roles no tiene pestañas');

    await c.query(`INSERT INTO tbl_usuario_rol (id_usuario, id_rol) SELECT $1, id_rol FROM tbl_roles WHERE nombre IN ('RolNutricion', 'RolConsulta')`, [u.id_usuario]);
    assert.deepEqual((await leer(u.id_usuario)).permisos, ['consulta.pacientes', 'nutricion.consulta', 'nutricion.registro']);

    await c.query(`UPDATE tbl_roles SET estado = false WHERE nombre = 'RolNutricion'`);
    assert.deepEqual((await leer(u.id_usuario)).permisos, ['consulta.pacientes'], 'un rol inactivo no da pestañas');

    await c.query('UPDATE tbl_empleados SET estado = false WHERE id_empleado = $1', [e.id_empleado]);
    assert.equal((await leer(u.id_usuario)).activo, false, 'empleado de baja');
    assert.equal(await leer(987654321), undefined, 'usuario inexistente: sin fila');
  });
});

test('sp_guardar_rol: crea, edita, valida nombre y pestañas, y no deja el sistema sin administradores', async () => {
  await tx(async (c) => {
    const guardar = async (id, nombre, permisos, estado = true) => {
      await c.query(`CALL sp_guardar_rol($1, $2, 'prueba', $3, $4, 'test', 'rol_prueba')`, [id, nombre, estado, permisos]);
      const fila = (await c.query('FETCH ALL FROM rol_prueba')).rows[0];
      await c.query('CLOSE rol_prueba');
      return fila.id_rol;
    };
    const pestanasDe = async (id) => (await c.query(
      'SELECT array_agg(p.codigo ORDER BY p.codigo) AS c FROM tbl_rol_permiso rp JOIN tbl_permisos p USING (id_permiso) WHERE rp.id_rol = $1', [id])).rows[0].c;

    const id = await guardar(null, 'Prueba Llamado', ['turnos.llamado']);
    assert.deepEqual(await pestanasDe(id), ['turnos.llamado'], 'rol nuevo con una sola pestaña');
    await guardar(id, 'Prueba Llamado', ['turnos.llamado', 'turnos.consulta'], false);
    assert.deepEqual(await pestanasDe(id), ['turnos.consulta', 'turnos.llamado'], 'las pestañas se reemplazan');
    assert.equal((await c.query('SELECT estado FROM tbl_roles WHERE id_rol = $1', [id])).rows[0].estado, false);

    const rolPrueba = `CALL sp_guardar_rol($1, $2, NULL, true, $3, 'test', 'rol_error')`;
    await rechaza(c, rolPrueba, [null, 'prueba llamado', []], /ROL_DUPLICADO/);
    await rechaza(c, rolPrueba, [null, 'Otro Rol', ['turnos.inventado']], /PERMISO_INVALIDO: .*turnos\.inventado/);
    await rechaza(c, rolPrueba, [987654321, 'No existe', []], /ROL_NO_ENCONTRADO/);

    // Quitar "Permisos de Roles" al único rol que la tiene dejaría el sistema sin administradores
    const admin = (await c.query(`SELECT id_rol, nombre FROM tbl_roles WHERE nombre = 'RolGestionUsuarios'`)).rows[0];
    assert.ok((await c.query(`SELECT fn_usuarios_con_permiso('usuarios.permisos') AS n`)).rows[0].n > 0, 'hay administradores');
    await rechaza(c, rolPrueba, [admin.id_rol, admin.nombre, ['usuarios.roles']], /SIN_ADMINISTRADOR/);
  });
});

test('sinPerderAdministradores: revierte (409) si el cambio deja sin administradores a un sistema que los tenía', async () => {
  const { sinPerderAdministradores, SIN_ADMINISTRADOR } = require('../src/modules/usuarios/usuarios.repository');
  const cliente = (conteos) => ({ query: async () => ({ rows: [{ n: conteos.shift() }] }) });
  assert.equal(await sinPerderAdministradores(cliente([2, 1]), async () => 'ok'), 'ok');
  assert.equal(await sinPerderAdministradores(cliente([0, 0]), async () => 'ok'), 'ok', 'sin administradores previos no bloquea');
  await assert.rejects(sinPerderAdministradores(cliente([1, 0]), async () => 'ok'),
    (err) => err.status === 409 && err.body.error === SIN_ADMINISTRADOR);
});

test('fn_paciente_en_atencion: solo con un turno en atención (estado 4)', async () => {
  await tx(async (c) => {
    const noaf = await paciente(c);
    const enAtencion = async () => (await c.query('SELECT fn_paciente_en_atencion($1) AS v', [noaf])).rows[0].v;
    const turno = await crearTurno(c, noaf, await clinicaHemodialisis(c));
    assert.equal(await enAtencion(), false, 'turno creado');
    await c.query('UPDATE tbl_turnos SET id_estado_turno = 4 WHERE id_turno = $1', [turno]);
    assert.equal(await enAtencion(), true, 'turno en atención');
  });
});
