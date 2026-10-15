// Crea el primer usuario administrador de un entorno nuevo (sin usuarios no se puede iniciar sesión).
// Queda con todos los roles y debe cambiar la contraseña en su primer ingreso.
//
// Uso (en el servidor):
//   docker compose exec -e ADMIN_USUARIO=jperez -e ADMIN_CONTRASENIA='Temporal#2026' backend node db/crear-admin.js
// Opcionales: ADMIN_NOMBRE, ADMIN_APELLIDO, ADMIN_DPI (13 dígitos)
const path = require('node:path');
const bcrypt = require('bcryptjs');

async function crearAdmin(pool, env = process.env) {
  const usuario = (env.ADMIN_USUARIO || '').trim().toLowerCase();
  const contrasenia = env.ADMIN_CONTRASENIA || '';
  if (!usuario || contrasenia.length < 8) {
    throw new Error('Defina ADMIN_USUARIO y ADMIN_CONTRASENIA (mínimo 8 caracteres)');
  }
  const dpi = env.ADMIN_DPI || '0000000000001';
  if (!/^\d{13}$/.test(dpi)) throw new Error('ADMIN_DPI debe tener 13 dígitos');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existe = await client.query('SELECT 1 FROM public.tbl_usuarios WHERE nombre_usuario = $1', [usuario]);
    if (existe.rowCount) throw new Error(`El usuario ${usuario} ya existe`);

    const empleado = await client.query(
      `INSERT INTO public.tbl_empleados (dpi, primer_nombre, primer_apellido, sexo, fecha_ingreso, estado)
       VALUES ($1, $2, $3, 'Masculino', CURRENT_DATE, true)
       ON CONFLICT (dpi) DO UPDATE SET estado = true
       RETURNING id_empleado`,
      [dpi, (env.ADMIN_NOMBRE || 'ADMINISTRADOR').toUpperCase(), (env.ADMIN_APELLIDO || 'SISTEMA').toUpperCase()]);

    // usuario_actualizacion = FORCE_CHANGE_PASSWORD hace que el login pida cambiarla
    const nuevo = await client.query(
      `INSERT INTO public.tbl_usuarios (nombre_usuario, contrasenia, id_empleado, estado, usuario_actualizacion)
       VALUES ($1, $2, $3, true, 'FORCE_CHANGE_PASSWORD') RETURNING id_usuario`,
      [usuario, await bcrypt.hash(contrasenia, 10), empleado.rows[0].id_empleado]);

    const roles = await client.query(
      `INSERT INTO public.tbl_usuario_rol (id_usuario, id_rol) SELECT $1, id_rol FROM public.tbl_roles
       ON CONFLICT DO NOTHING`, [nuevo.rows[0].id_usuario]);
    await client.query('COMMIT');
    return { usuario, roles: roles.rowCount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { crearAdmin };

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
  const pool = require('./pool');
  crearAdmin(pool)
    .then(({ usuario, roles }) => console.log(`Usuario ${usuario} creado con ${roles} roles; debe cambiar la contraseña al ingresar.`))
    .catch((err) => { console.error(err.message); process.exitCode = 1; })
    .finally(() => pool.end());
}
