// Acceso a datos de autenticación. Cada lectura con refcursor corre en su propia transacción.
const { pool, withTransaction, fetchCursor } = require('../../shared/database');

const primera = async (promesa) => (await promesa)[0] || null;

const buscarUsuarioAuth = (usuario) =>
  primera(withTransaction((c) => fetchCursor(c, 'public.sp_buscar_usuario_auth', [usuario], 'cur_buscar_usuario_auth')));

const usuarioAutenticado = (id) =>
  primera(withTransaction((c) => fetchCursor(c, 'public.sp_usuario_autenticado', [id], 'cur_usuario_autenticado')));

async function empleadoActivo(idUsuario) {
  const fila = await primera(withTransaction((c) => fetchCursor(c, 'public.sp_usuario_empleado_estado_get', [idUsuario], 'cur_empleado_estado')));
  return fila?.empleado_activo === true;
}

async function nombresDeRoles(idUsuario) {
  const filas = await withTransaction((c) => fetchCursor(c, 'public.sp_roles_usuario', [idUsuario], 'cur_roles_usuario'));
  return filas.map((r) => r.nombre);
}

// { activo, permisos } vigentes: usuario y empleado activos y los códigos de pestaña de sus roles activos
async function accesoDeUsuario(idUsuario) {
  const fila = await primera(withTransaction((c) => fetchCursor(c, 'public.sp_acceso_usuario', [idUsuario], 'cur_acceso_usuario')));
  return { activo: fila?.activo === true, permisos: fila?.permisos || [] };
}

async function debeCambiarPassword(idUsuario) {
  const fila = await primera(withTransaction((c) => fetchCursor(c, 'public.sp_usuario_flag_force_change_get', [idUsuario], 'cur_flag_force_change')));
  return fila?.usuario_actualizacion === 'FORCE_CHANGE_PASSWORD';
}

async function emailDeUsuario(id) {
  const fila = await primera(withTransaction((c) => fetchCursor(c, 'public.sp_usuario_email_by_id', [id], 'cur_usuario_email')));
  return fila?.email || null;
}

const passwordGuardada = (id) =>
  primera(withTransaction((c) => fetchCursor(c, 'public.sp_confirmar_pasword_usuario', [id], 'cur_confirmar_password')));

const usuariosActivos = () =>
  withTransaction((c) => fetchCursor(c, 'public.sp_usuarios_activos', [], 'cur_usuarios_activos'));

const actualizarPassword = (id, hash) => pool.query('CALL public.sp_actualizar_password_usuario($1, $2)', [id, hash]);

const marcarCambioObligatorio = (id, valor) => pool.query('CALL public.sp_usuario_flag_force_change_set($1, $2)', [id, valor]);

// Usuarios activos (con empleado activo) por nombre de usuario o correo del empleado, para la recuperación
const usuariosParaRecuperacion = async (identificador) => (await pool.query(
  `SELECT u.id_usuario, u.nombre_usuario, u.contrasenia, e.email
   FROM public.tbl_usuarios u
   JOIN public.tbl_empleados e ON e.id_empleado = u.id_empleado
   WHERE u.estado = true AND e.estado = true
     AND (lower(u.nombre_usuario) = lower($1) OR lower(e.email) = lower($1))`, [identificador])).rows;

// Datos para validar un enlace de restablecimiento: hash vigente, estado y correo
const credencial = async (id) => (await pool.query(
  `SELECT u.id_usuario, u.nombre_usuario, u.contrasenia, u.estado, e.email, e.estado AS empleado_activo
   FROM public.tbl_usuarios u
   LEFT JOIN public.tbl_empleados e ON e.id_empleado = u.id_empleado
   WHERE u.id_usuario = $1`, [id])).rows[0] || null;

// Quita la marca de "debe cambiar la contraseña" tras un cambio voluntario
const limpiarMarcaCambio = (id) =>
  pool.query('UPDATE public.tbl_usuarios SET usuario_actualizacion = NULL, fecha_actualizacion = NOW() WHERE id_usuario = $1', [id]);

module.exports = {
  buscarUsuarioAuth, usuarioAutenticado, empleadoActivo, nombresDeRoles, accesoDeUsuario, debeCambiarPassword, emailDeUsuario,
  passwordGuardada, usuariosActivos, actualizarPassword, marcarCambioObligatorio, limpiarMarcaCambio,
  usuariosParaRecuperacion, credencial,
};
