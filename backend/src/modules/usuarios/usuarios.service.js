// Casos de uso de empleados, usuarios y roles. Todos los errores conservan el formato { error } del frontend.
const bcrypt = require('bcryptjs');
const repo = require('./usuarios.repository');
const { HttpError } = require('../../shared/http');

const PASSWORD_INICIAL = 'Clinica1.';
const REGEX_USUARIO = /^[a-z]{8}$/;
const REGEX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CAMPOS_EMPLEADO = [
  'dpi', 'primer_nombre', 'segundo_nombre', 'otros_nombres', 'primer_apellido', 'segundo_apellido',
  'apellido_casada', 'fecha_nacimiento', 'sexo', 'direccion', 'telefono', 'email', 'fecha_ingreso',
];

// Datos del token con los nombres de claim que ya usaba cada pantalla
const nombreDeToken = (user) => (user && (user.nombre_usuario || user.usuario)) || null;
const idDeToken = (user) => Number(user && (user.id_usuario || user.id || user.sub)) || null;

const actorAuditoria = (user) => repo.resolverActor(nombreDeToken(user), idDeToken(user));

// ---------------------------------------------------------------- Empleados

async function registrarEmpleados(empleados, user) {
  if (!Array.isArray(empleados) || empleados.length === 0) {
    throw new HttpError(400, { error: 'Body inválido. Se requiere empleados[]' });
  }
  await repo.registroMasivoEmpleados(JSON.stringify(empleados), await actorAuditoria(user));
}

// Valida el registro unitario; devuelve el mensaje de error o null
function errorDeEmpleado(b) {
  if (!b.dpi || !b.primer_nombre || !b.primer_apellido || !b.fecha_nacimiento || !b.sexo
      || !b.direccion || !b.telefono || !b.email || !b.fecha_ingreso) {
    return 'Faltan campos obligatorios.';
  }
  if (typeof b.dpi !== 'string' || b.dpi.length !== 13) return 'El DPI debe tener exactamente 13 caracteres.';
  if (typeof b.telefono !== 'string' || !/^\d{8}$/.test(b.telefono)) return 'El teléfono debe contener exactamente 8 dígitos.';
  if (typeof b.email !== 'string' || !REGEX_EMAIL.test(b.email)) return 'El email no tiene un formato válido.';
  return null;
}

async function registrarEmpleado(b, user) {
  const mensaje = errorDeEmpleado(b);
  if (mensaje) throw new HttpError(400, { error: mensaje });
  const actor = await actorAuditoria(user);
  await repo.insertarEmpleado([
    b.dpi, b.primer_nombre, b.segundo_nombre || null, b.otros_nombres || null,
    b.primer_apellido, b.segundo_apellido || null, b.apellido_casada || null,
    b.fecha_nacimiento || null, b.sexo, b.direccion, b.telefono || null, b.email || null,
    b.fecha_ingreso, typeof b.activo === 'boolean' ? b.activo : true, actor,
  ]);
}

function listarEmpleados(query) {
  const { q = '', estado, limit = 50, offset = 0 } = query || {};
  const hayEstado = typeof estado !== 'undefined' && estado !== '';
  return repo.listarEmpleados(String(q || '').trim() || null, hayEstado ? String(estado) === 'true' : null, Number(limit) || 50, Number(offset) || 0);
}

// Solo los campos permitidos presentes en el cuerpo ('' -> null)
function camposEmpleado(body) {
  const datos = {};
  for (const clave of CAMPOS_EMPLEADO) {
    if (Object.prototype.hasOwnProperty.call(body || {}, clave)) datos[clave] = body[clave] === '' ? null : body[clave];
  }
  return datos;
}

async function actualizarEmpleado(dpi, body, user) {
  if (!dpi) throw new HttpError(400, { error: 'DPI requerido' });
  const datos = camposEmpleado(body);
  if (Object.keys(datos).length === 0) throw new HttpError(400, { error: 'No hay campos válidos para actualizar' });
  const actor = await actorAuditoria(user);
  let filas;
  try {
    filas = await repo.actualizarEmpleado(dpi, JSON.stringify(datos), actor);
  } catch (err) {
    if (err && err.code === '23505') throw new HttpError(409, { error: 'Conflicto de datos', detalle: 'El DPI ya existe.' });
    throw new HttpError(501, {
      error: 'Actualización no disponible',
      detalle: 'Verifica que exista sp_actualizar_empleado(original_dpi, datos jsonb, actor, refcursor) en la BD.',
    });
  }
  if (filas[0]?.success !== true) throw new HttpError(404, { error: 'Empleado no encontrado' });
}

async function cambiarEstadoEmpleado(dpi, activo, user) {
  if (!dpi || typeof activo === 'undefined') throw new HttpError(400, { error: 'dpi y activo son requeridos' });
  const actor = await actorAuditoria(user);
  let filas;
  try {
    filas = await repo.cambiarEstadoEmpleado(dpi, Boolean(activo), actor);
  } catch {
    throw new HttpError(501, {
      error: 'Cambio de estado no disponible',
      detalle: 'Verifica que exista sp_cambiar_estado_empleado(dpi, activo, actor, refcursor) en la BD.',
    });
  }
  if (filas[0]?.success !== true) throw new HttpError(404, { error: 'Empleado no encontrado' });
}

// ----------------------------------------------------------------- Usuarios

async function usuarioExiste(usuario) {
  const nombre = String(usuario || '').trim();
  if (!nombre) throw new HttpError(400, { error: 'usuario es requerido' });
  return repo.usuarioExiste(nombre);
}

async function crearUsuario(b, user) {
  const { usuario, id_empleado: idEmpleado, roles } = b || {};
  if (!usuario || !REGEX_USUARIO.test(usuario)) throw new HttpError(400, { error: 'usuario debe ser 8 letras (a-z)' });
  if (!idEmpleado) throw new HttpError(400, { error: 'id_empleado es requerido' });
  if (await repo.usuarioExiste(usuario)) throw new HttpError(409, { error: 'El nombre de usuario ya existe' });

  let actor = nombreDeToken(user);
  if (!actor && idDeToken(user)) {
    try { actor = await repo.nombreUsuarioPorId(idDeToken(user)); } catch { actor = null; }
  }
  const hash = await bcrypt.hash(PASSWORD_INICIAL, 10);
  return repo.crearUsuarioConRoles({
    usuario, idEmpleado, hash, roles: Array.isArray(roles) ? roles : [], actor: String(actor || 'sistema'),
  });
}

// -------------------------------------------------------------------- Roles

async function buscarUsuario(usuario) {
  const nombre = String(usuario || '').trim();
  if (!nombre) throw new HttpError(400, { error: 'usuario es requerido' });
  const fila = await repo.buscarUsuarioPorNombre(nombre);
  if (!fila) throw new HttpError(404, { error: 'Usuario no encontrado' });
  return fila;
}

function rolesDeUsuario(idParam) {
  const id = Number(idParam);
  if (!id) throw new HttpError(400, { error: 'id inválido' });
  return repo.rolesDeUsuario(id);
}

async function actualizarRoles(idParam, body, user) {
  const id = Number(idParam);
  if (!id) throw new HttpError(400, { error: 'id inválido' });
  const roles = Array.isArray(body?.roles) ? body.roles.map(Number).filter(Number.isInteger) : [];
  await repo.actualizarRolesUsuario(id, roles, String(user?.nombre_usuario || user?.sub || 'sistema'), String(user?.sub || 'sistema'));
}

async function actualizarEstadoUsuario(idParam, body, user) {
  const id = Number(idParam);
  const estado = body?.estado;
  if (!id) throw new HttpError(400, { error: 'id inválido' });
  if (typeof estado !== 'boolean') throw new HttpError(400, { error: 'estado debe ser boolean' });
  const actual = Number(user?.sub || user?.id_usuario || user?.id) || null;
  if (estado === false && actual && id === actual) {
    throw new HttpError(400, { error: 'No puedes inactivar tu propio usuario' });
  }
  await repo.actualizarEstadoUsuario(id, estado, String(user?.nombre_usuario || user?.sub || 'sistema'));
}

module.exports = {
  registrarEmpleados, registrarEmpleado, errorDeEmpleado, listarEmpleados, camposEmpleado, actualizarEmpleado, cambiarEstadoEmpleado,
  empleadosSinUsuario: repo.empleadosSinUsuario,
  usuarioExiste, crearUsuario,
  rolesActivos: repo.rolesActivos, buscarUsuario, rolesDeUsuario, actualizarRoles, actualizarEstadoUsuario,
};
