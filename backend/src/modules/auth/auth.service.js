// Casos de uso de autenticación y recuperación de contraseña. Los errores usan el formato { error } del frontend.
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const repo = require('./auth.repository');
const mail = require('./auth.mail');
const { intentos, tokensUsados } = require('./memoria');
const { HttpError } = require('../../shared/http');

const jwtSecret = () => process.env.JWT_SECRET || 'dev_secret_change_me';
const ROL_ADMIN = 'RolGestionUsuarios';
// 8+ caracteres con minúscula, mayúscula, dígito y símbolo
const PASSWORD_FUERTE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const MENSAJE_PASSWORD_FUERTE = 'La contraseña debe tener mínimo 8 caracteres, incluir minúscula, mayúscula, número y símbolo';

const registrarFallo = (mensaje) => (err) => {
  console.error(mensaje, err);
};

// Las contraseñas se guardan siempre con bcrypt ($2...); cualquier otro valor guardado nunca coincide
async function coincidePassword(plano, guardada) {
  if (typeof guardada !== 'string' || !guardada.startsWith('$2')) return false;
  return bcrypt.compare(String(plano), guardada);
}

// Contraseña aleatoria con al menos una minúscula, mayúscula, dígito y símbolo
function generarPasswordFuerte(largo = 12) {
  const minusculas = 'abcdefghijklmnopqrstuvwxyz';
  const mayusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digitos = '0123456789';
  const simbolos = '!@#$%^&*()_+[]{}|;:,.<>?';
  const todos = minusculas + mayusculas + digitos + simbolos;
  const elegir = (texto) => texto[crypto.randomInt(texto.length)];
  const caracteres = [elegir(minusculas), elegir(mayusculas), elegir(digitos), elegir(simbolos)];
  while (caracteres.length < Math.max(4, largo)) caracteres.push(elegir(todos));
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join('');
}

function mensajeBloqueo(msRestantes) {
  const segundos = Math.ceil(msRestantes / 1000);
  return `Usuario bloqueado. Intenta nuevamente en ${Math.floor(segundos / 60)}m ${segundos % 60}s`;
}

// ------------------------------------------------------------------- Sesión

async function login({ usuario, password } = {}) {
  if (!usuario || !password) throw new HttpError(400, { error: 'usuario y password son requeridos' });

  const bloqueo = intentos.estado(usuario);
  if (bloqueo.bloqueado) throw new HttpError(429, { error: mensajeBloqueo(bloqueo.msRestantes) });

  const user = await repo.buscarUsuarioAuth(usuario);
  if (!user || !user.estado) {
    intentos.registrar(usuario);
    throw new HttpError(401, { error: 'Credenciales inválidas' });
  }
  if (!(await coincidePassword(password, user.contrasenia))) {
    const despues = intentos.registrar(usuario);
    if (despues.bloqueado) throw new HttpError(429, { error: mensajeBloqueo(despues.msRestantes) });
    throw new HttpError(401, { error: 'Credenciales inválidas' });
  }
  // El empleado asociado debe seguir activo
  if (!(await repo.empleadoActivo(user.id_usuario))) throw new HttpError(401, { error: 'Credenciales inválidas' });

  const roles = await repo.nombresDeRoles(user.id_usuario);
  intentos.limpiar(usuario);

  const token = jwt.sign({ sub: user.id_usuario, nombre_usuario: user.nombre_usuario, roles }, jwtSecret(), { expiresIn: '8h' });
  let mustChangePassword = false;
  try {
    mustChangePassword = await repo.debeCambiarPassword(user.id_usuario);
  } catch { /* la marca es opcional: no bloquea el ingreso */ }
  return { token, user: { id_usuario: user.id_usuario, nombre_usuario: user.nombre_usuario, roles }, mustChangePassword };
}

async function perfil(sub) {
  if (!sub) throw new HttpError(401, { error: 'No autorizado' });
  const user = await repo.usuarioAutenticado(sub);
  if (!user || !user.estado) throw new HttpError(401, { error: 'No autorizado' });
  if (!(await repo.empleadoActivo(user.id_usuario))) throw new HttpError(403, { error: 'Credenciales inválidas' });
  const roles = await repo.nombresDeRoles(user.id_usuario);
  return { id_usuario: user.id_usuario, nombre_usuario: user.nombre_usuario, roles };
}

const usuariosActivos = () => repo.usuariosActivos();

// Confirma la contraseña del usuario ya autenticado (acciones sensibles)
async function confirmarPassword(user, password) {
  const sub = user && user.sub;
  if (!sub) throw new HttpError(401, { error: 'No autorizado' });
  if (!password) throw new HttpError(400, { error: 'password es requerido' });

  let fila = await repo.usuarioAutenticado(sub);
  if (!fila || fila.estado === false) throw new HttpError(401, { error: 'No autorizado' });

  const leer = (f) => f?.contrasenia ?? f?.contrasena ?? f?.password_hash ?? f?.password ?? null;
  let guardada = leer(fila);
  // Si el procedimiento no devolvió la contraseña, se busca por nombre de usuario
  if (!guardada && user.nombre_usuario) {
    try {
      fila = (await repo.buscarUsuarioAuth(user.nombre_usuario)) || fila;
      guardada = leer(fila);
    } catch { /* se evalúa con lo que haya */ }
  }
  if (!(await coincidePassword(password, guardada))) throw new HttpError(401, { error: 'Contraseña incorrecta' });
}

async function cambiarPassword(user, { actual, nueva } = {}) {
  const sub = user && user.sub;
  if (!sub) throw new HttpError(401, { error: 'No autorizado' });
  if (!actual || !nueva) throw new HttpError(400, { error: 'actual y nueva son requeridas' });
  if (String(nueva).length < 8) throw new HttpError(400, { error: 'La nueva contraseña debe tener al menos 8 caracteres' });

  const fila = await repo.passwordGuardada(sub);
  if (!fila || fila.estado === false) throw new HttpError(401, { error: 'No autorizado' });
  if (!(await coincidePassword(actual, fila.contrasenia))) throw new HttpError(401, { error: 'Contraseña actual incorrecta' });

  await repo.actualizarPassword(sub, await bcrypt.hash(String(nueva), 10));
  try { await repo.limpiarMarcaCambio(sub); } catch { /* la marca puede quedar; no invalida el cambio */ }
}

// -------------------------------------------------------------- Recuperación

// Cambio con el token de recuperación (purpose = reset)
async function restablecerConToken({ token, nueva } = {}) {
  if (!token || !nueva) throw new HttpError(400, { error: 'token y nueva son requeridos' });
  if (String(nueva).length < 8) throw new HttpError(400, { error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  let payload;
  try {
    payload = jwt.verify(token, jwtSecret());
  } catch {
    throw new HttpError(401, { error: 'Token inválido o expirado' });
  }
  if (!payload || payload.purpose !== 'reset' || !payload.sub) throw new HttpError(401, { error: 'Token inválido' });
  await repo.actualizarPassword(payload.sub, await bcrypt.hash(String(nueva), 10));
}

// Cambia la contraseña de otro usuario, lo obliga a cambiarla al entrar y le avisa por correo
async function restablecerPasswordDeUsuario(id, plano) {
  await repo.actualizarPassword(id, await bcrypt.hash(String(plano), 10));
  try { await repo.marcarCambioObligatorio(id, true); } catch { /* no bloquea el restablecimiento */ }

  try {
    let correo = null;
    try { correo = await repo.emailDeUsuario(id); } catch { /* usa el correo del administrador */ }
    const destino = correo || process.env.ADMIN_EMAIL;
    if (destino) await mail.passwordRestablecida({ to: destino, password: plano });
  } catch (err) {
    registrarFallo('No fue posible enviar el correo de nueva contraseña:')(err);
  }
}

// El administrador fija una contraseña nueva a un usuario
async function restablecerComoAdmin(user, { id_usuario: idUsuario, nueva } = {}) {
  const roles = Array.isArray(user && user.roles) ? user.roles : [];
  if (!roles.includes(ROL_ADMIN)) throw new HttpError(403, { error: `Requiere rol de administrador (${ROL_ADMIN})` });
  const id = Number(idUsuario);
  if (!id || Number.isNaN(id)) throw new HttpError(400, { error: 'id_usuario inválido' });
  if (!nueva) throw new HttpError(400, { error: 'La nueva contraseña es requerida' });
  if (!PASSWORD_FUERTE.test(String(nueva))) throw new HttpError(400, { error: MENSAJE_PASSWORD_FUERTE });
  await restablecerPasswordDeUsuario(id, String(nueva));
}

// Valida el token de acción del enlace de correo del administrador (sin consumirlo)
function leerTokenAccion(token) {
  let payload;
  try {
    payload = jwt.verify(String(token), jwtSecret());
  } catch {
    throw new HttpError(401, { error: 'Token inválido o expirado' });
  }
  if (tokensUsados.usado(token)) throw new HttpError(401, { error: 'Token ya utilizado' });
  if (!payload || payload.purpose !== 'admin_reset_user' || !payload.target) throw new HttpError(401, { error: 'Token inválido' });
  return payload;
}

// Restablece con el token de acción; sin contraseña en el cuerpo genera una fuerte aleatoria
async function restablecerConTokenDeAccion({ token, nueva } = {}) {
  if (!token) throw new HttpError(400, { error: 'token es requerido' });
  const payload = leerTokenAccion(token);
  const dada = nueva && String(nueva).trim().length > 0;
  if (dada && !PASSWORD_FUERTE.test(String(nueva))) throw new HttpError(400, { error: MENSAJE_PASSWORD_FUERTE });

  await restablecerPasswordDeUsuario(payload.target, dada ? String(nueva) : generarPasswordFuerte(12));
  if (payload.exp) tokensUsados.marcar(token, payload.exp);
}

async function infoTokenDeAccion(token) {
  if (!token) throw new HttpError(400, { error: 'token es requerido' });
  const payload = leerTokenAccion(token);
  let nombre = null;
  try { nombre = (await repo.usuarioAutenticado(payload.target))?.nombre_usuario || null; } catch { /* solo informativo */ }
  return { id_usuario: payload.target, nombre_usuario: nombre };
}

// Captura la solicitud y avisa al administrador; la respuesta al solicitante es siempre genérica
async function solicitarRecuperacion(datos = {}) {
  const { dpi, nombres, apellidos, telefono, usuario } = datos;
  if (!dpi || String(dpi).length < 6) throw new HttpError(400, { error: 'DPI inválido' });
  if (!nombres || !apellidos) throw new HttpError(400, { error: 'Nombres y apellidos son requeridos' });
  if (!telefono) throw new HttpError(400, { error: 'Teléfono es requerido' });
  if (!usuario) throw new HttpError(400, { error: 'Usuario es requerido' });

  let user = null;
  try { user = await repo.buscarUsuarioAuth(usuario); } catch { /* respuesta genérica igualmente */ }

  try {
    const admin = process.env.ADMIN_EMAIL;
    if (admin) {
      const token = user && user.id_usuario
        ? jwt.sign({ purpose: 'admin_reset_user', target: user.id_usuario }, jwtSecret(), { expiresIn: '15m' })
        : null;
      // Sin await: el correo no debe retrasar la respuesta HTTP
      mail.solicitudRecuperacion({ to: admin, datos, idUsuario: user && user.id_usuario, token })
        .catch(registrarFallo('Error enviando correo forgot-password (async):'));
    }
    if (user && user.id_usuario) {
      const correo = await repo.emailDeUsuario(user.id_usuario).catch(() => null);
      if (correo) await mail.acuseSolicitud({ to: correo });
    }
  } catch (err) {
    registrarFallo('Error enviando correo forgot-password:')(err);
  }
}

module.exports = {
  coincidePassword, generarPasswordFuerte, mensajeBloqueo, PASSWORD_FUERTE,
  login, perfil, usuariosActivos, confirmarPassword, cambiarPassword,
  restablecerConToken, restablecerComoAdmin, restablecerConTokenDeAccion, infoTokenDeAccion, solicitarRecuperacion,
};
