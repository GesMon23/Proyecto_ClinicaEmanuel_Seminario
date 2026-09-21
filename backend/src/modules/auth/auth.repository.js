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

// Quita la marca de "debe cambiar la contraseña" tras un cambio voluntario
const limpiarMarcaCambio = (id) =>
  pool.query('UPDATE public.tbl_usuarios SET usuario_actualizacion = NULL, fecha_actualizacion = NOW() WHERE id_usuario = $1', [id]);

module.exports = {
  buscarUsuarioAuth, usuarioAutenticado, empleadoActivo, nombresDeRoles, debeCambiarPassword, emailDeUsuario,
  passwordGuardada, usuariosActivos, actualizarPassword, marcarCambioObligatorio, limpiarMarcaCambio,
};
