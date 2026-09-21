// Acceso a datos de empleados, usuarios y roles.
const { pool, withTransaction, runWithUser, callProcedure, fetchCursor } = require('../../shared/database');

// Nombre que firma la auditoría (fn_resolver_actor)
async function resolverActor(nombre, id) {
  const { rows } = await pool.query('SELECT public.fn_resolver_actor($1, $2) AS actor_nombre', [nombre, id]);
  return rows[0]?.actor_nombre || null;
}

async function nombreUsuarioPorId(id) {
  const { rows } = await pool.query('SELECT nombre_usuario FROM public.tbl_usuarios WHERE id_usuario = $1 LIMIT 1', [id]);
  return rows[0]?.nombre_usuario || null;
}

// ---- Empleados ----
const registroMasivoEmpleados = (empleadosJson, actor) =>
  pool.query('CALL sp_registro_empleados($1, $2)', [empleadosJson, actor]);

const insertarEmpleado = (valores) =>
  pool.query('CALL sp_insertar_empleado($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)', valores);

const listarEmpleados = (q, activo, limit, offset) =>
  withTransaction((c) => fetchCursor(c, 'public.sp_listar_empleados', [q, activo, limit, offset], 'cur_listar_empleados'));

const actualizarEmpleado = (dpi, datosJson, actor) =>
  withTransaction((c) => fetchCursor(c, 'public.sp_actualizar_empleado', [dpi, datosJson, actor], 'cur_actualizar_empleado'));

const cambiarEstadoEmpleado = (dpi, activo, actor) =>
  withTransaction((c) => fetchCursor(c, 'public.sp_cambiar_estado_empleado', [dpi, activo, actor], 'cur_cambiar_estado_empleado'));

const empleadosSinUsuario = () =>
  withTransaction((c) => fetchCursor(c, 'public.sp_empleados_sin_usuario', [], 'cur_empleados_sin_usuario'));

// ---- Usuarios ----
async function usuarioExiste(usuario) {
  const filas = await withTransaction((c) => fetchCursor(c, 'public.sp_usuario_existe', [usuario], 'cur_usuario_existe'));
  return filas[0]?.existe === true;
}

// Crea el usuario con sus roles y lo marca para cambiar la contraseña en el primer login
const crearUsuarioConRoles = ({ usuario, idEmpleado, hash, roles, actor }) =>
  withTransaction(async (c) => {
    const filas = await fetchCursor(c, 'public.sp_crear_usuario_con_roles', [usuario, idEmpleado, hash, roles, actor], 'cur_crear_usuario_con_roles');
    const idUsuario = filas[0]?.id_usuario || null;
    if (idUsuario) {
      // El flag no debe impedir la creación: el SAVEPOINT evita que un fallo aborte toda la transacción
      await c.query('SAVEPOINT flag_cambio');
      try {
        await callProcedure(c, 'public.sp_usuario_flag_force_change_set', [idUsuario, true]);
      } catch {
        await c.query('ROLLBACK TO SAVEPOINT flag_cambio');
      }
    }
    return idUsuario;
  });

// ---- Roles ----
const rolesActivos = () =>
  withTransaction((c) => fetchCursor(c, 'public.sp_roles_activos', [], 'cur_roles_activos'));

async function buscarUsuarioPorNombre(usuario) {
  const filas = await withTransaction((c) => fetchCursor(c, 'public.sp_buscar_usuario_por_nombre', [usuario], 'cur_buscar_usuario_por_nombre'));
  return filas[0] || null;
}

const rolesDeUsuario = (id) =>
  withTransaction((c) => fetchCursor(c, 'public.sp_roles_usuario_detalle', [id], 'cur_roles_usuario_detalle'));

const actualizarRolesUsuario = (id, roles, actor, creador) =>
  runWithUser(actor, (c) => callProcedure(c, 'public.sp_actualizar_roles_usuario', [id, roles, creador]));

const actualizarEstadoUsuario = (id, estado, actor) =>
  runWithUser(actor, (c) => callProcedure(c, 'public.sp_actualizar_estado_usuario', [id, estado]));

module.exports = {
  resolverActor, nombreUsuarioPorId,
  registroMasivoEmpleados, insertarEmpleado, listarEmpleados, actualizarEmpleado, cambiarEstadoEmpleado, empleadosSinUsuario,
  usuarioExiste, crearUsuarioConRoles,
  rolesActivos, buscarUsuarioPorNombre, rolesDeUsuario, actualizarRolesUsuario, actualizarEstadoUsuario,
};
