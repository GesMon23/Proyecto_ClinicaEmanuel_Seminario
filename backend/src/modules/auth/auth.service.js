// Casos de uso de autenticación y recuperación de contraseña. Los errores usan el formato { error } del frontend.
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const repo = require('./auth.repository');
const mail = require('./auth.mail');
const { intentos, tokensUsados, solicitudesRecuperacion } = require('./memoria');
const { HttpError } = require('../../shared/http');
const { jwtSecret } = require('../../shared/auth');
const { correoConfigurado } = require('../../utils/mailer');

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

// ------------------------------------------------- Recuperación (autoservicio por correo)
// El usuario pide un enlace con su usuario o su correo y crea él mismo la contraseña nueva. Las contraseñas
// nunca viajan por correo y la respuesta no revela si el usuario existe.

const MINUTOS_ENLACE = 30;
const SIN_CORREO = 'El envío de correos no está configurado. Contacta al administrador del sistema.';
const FALLO_CORREO = 'No pudimos enviar el correo en este momento. Intenta más tarde o contacta al administrador.';
const ENLACE_INVALIDO = 'El enlace no es válido, ya se usó o venció. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".';
const MENSAJE_SOLICITUD = 'Si el usuario existe y tiene un correo registrado, recibirás un enlace para crear una nueva contraseña. '
  + 'Si no llega en unos minutos, revisa la carpeta de spam o contacta al administrador.';

// Huella de la contraseña vigente dentro del token: cuando la contraseña cambia, todos los enlaces anteriores
// dejan de servir (un solo uso que sobrevive a reinicios del servidor)
const huella = (hash) => crypto.createHash('sha256').update(String(hash || '')).digest('hex').slice(0, 16);

const tokenRestablecimiento = (usuario) => jwt.sign(
  { purpose: 'reset', sub: usuario.id_usuario, h: huella(usuario.contrasenia) },
  jwtSecret(),
  { expiresIn: `${MINUTOS_ENLACE}m` },
);

async function enviarEnlace(usuario, porAdministrador = false) {
  try {
    await mail.enlaceRestablecimiento({
      to: usuario.email, nombreUsuario: usuario.nombre_usuario, token: tokenRestablecimiento(usuario), minutos: MINUTOS_ENLACE, porAdministrador,
    });
  } catch (err) {
    registrarFallo('No fue posible enviar el enlace de restablecimiento:')(err);
    throw new HttpError(503, { error: FALLO_CORREO });
  }
}

// "¿Olvidaste tu contraseña?": identificador = usuario o correo del empleado
async function solicitarRecuperacion({ identificador, usuario } = {}) {
  const id = String(identificador ?? usuario ?? '').trim();
  if (!id) throw new HttpError(400, { error: 'Ingresa tu usuario o tu correo electrónico' });
  if (!correoConfigurado()) throw new HttpError(503, { error: SIN_CORREO });

  // Misma espera para usuarios existentes o no: no revela cuáles existen
  const espera = solicitudesRecuperacion.intentar(id);
  if (espera) throw new HttpError(429, { error: `Ya recibimos una solicitud. Espera ${Math.ceil(espera / 1000)} segundos para intentarlo de nuevo.` });

  const usuarios = (await repo.usuariosParaRecuperacion(id)).filter((u) => u.email);
  for (const u of usuarios) await enviarEnlace(u);
  return { mensaje: MENSAJE_SOLICITUD };
}

async function leerTokenRestablecimiento(token) {
  let payload;
  try {
    payload = jwt.verify(String(token), jwtSecret());
  } catch {
    throw new HttpError(401, { error: ENLACE_INVALIDO });
  }
  if (!payload || payload.purpose !== 'reset' || !payload.sub || !payload.h || tokensUsados.usado(token)) {
    throw new HttpError(401, { error: ENLACE_INVALIDO });
  }
  const usuario = await repo.credencial(payload.sub);
  if (!usuario || !usuario.estado || usuario.empleado_activo === false || huella(usuario.contrasenia) !== payload.h) {
    throw new HttpError(401, { error: ENLACE_INVALIDO });
  }
  return { payload, usuario };
}

// La pantalla de restablecimiento valida el enlace al abrirse (muestra el usuario o el aviso de vencido)
async function infoRestablecimiento(token) {
  if (!token) throw new HttpError(400, { error: 'token es requerido' });
  const { usuario } = await leerTokenRestablecimiento(token);
  return { nombre_usuario: usuario.nombre_usuario, minutos: MINUTOS_ENLACE };
}

async function restablecerConToken({ token, nueva } = {}) {
  if (!token || !nueva) throw new HttpError(400, { error: 'token y nueva son requeridos' });
  if (!PASSWORD_FUERTE.test(String(nueva))) throw new HttpError(400, { error: MENSAJE_PASSWORD_FUERTE });
  const { payload, usuario } = await leerTokenRestablecimiento(token);

  await repo.actualizarPassword(usuario.id_usuario, await bcrypt.hash(String(nueva), 10));
  try { await repo.limpiarMarcaCambio(usuario.id_usuario); } catch { /* la marca puede quedar; no invalida el cambio */ }
  tokensUsados.marcar(token, payload.exp);
  intentos.limpiar(usuario.nombre_usuario);

  // Aviso de seguridad (no bloquea: la contraseña ya cambió)
  if (usuario.email) {
    mail.avisoPasswordCambiada({ to: usuario.email, nombreUsuario: usuario.nombre_usuario })
      .catch(registrarFallo('No fue posible enviar el aviso de cambio de contraseña:'));
  }
}

// El administrador envía el enlace a un usuario (p. ej. si sospecha que su contraseña se filtró)
async function enviarEnlaceComoAdmin(user, { id_usuario: idUsuario } = {}) {
  const roles = Array.isArray(user && user.roles) ? user.roles : [];
  if (!roles.includes(ROL_ADMIN)) throw new HttpError(403, { error: `Requiere rol de administrador (${ROL_ADMIN})` });
  const id = Number(idUsuario);
  if (!id || Number.isNaN(id)) throw new HttpError(400, { error: 'id_usuario inválido' });
  if (!correoConfigurado()) throw new HttpError(503, { error: SIN_CORREO });

  const usuario = await repo.credencial(id);
  if (!usuario || !usuario.estado) throw new HttpError(404, { error: 'Usuario no encontrado o inactivo' });
  if (!usuario.email) throw new HttpError(409, { error: 'El usuario no tiene un correo registrado: actualiza los datos del empleado' });
  await enviarEnlace(usuario, true);
}

module.exports = {
  coincidePassword, mensajeBloqueo, PASSWORD_FUERTE, MINUTOS_ENLACE,
  login, perfil, usuariosActivos, confirmarPassword, cambiarPassword,
  solicitarRecuperacion, infoRestablecimiento, restablecerConToken, enviarEnlaceComoAdmin,
};