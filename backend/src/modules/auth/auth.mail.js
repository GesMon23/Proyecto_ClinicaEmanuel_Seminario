// Correos del flujo de contraseñas. Todo dato ingresado por el usuario se escapa antes de entrar al HTML.
const { enviarCorreo } = require('../../utils/mailer');

const baseApp = () => process.env.APP_BASE_URL || 'http://localhost:3000';

function escapeHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Marco común de los correos: encabezado verde, cuerpo y pie
function plantilla({ titulo, cuerpo, pie }) {
  return `
<!doctype html>
<html>
  <body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#2d3748;">
    <div style="max-width:640px;margin:24px auto;padding:0 16px;">
      <div style="background:#16a34a;color:#fff;padding:16px 20px;border-top-left-radius:8px;border-top-right-radius:8px;">
        <h1 style="margin:0;font-size:18px;">${titulo}</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-bottom-left-radius:8px;border-bottom-right-radius:8px;padding:20px;">
        ${cuerpo}
      </div>
      <div style="text-align:center;color:#94a3b8;font-size:12px;margin-top:10px;">
        ${pie}
      </div>
    </div>
  </body>
</html>`.trim();
}

const boton = (enlace, texto) =>
  `<a href="${escapeHtml(enlace)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">${texto}</a>`;

// Al usuario: su contraseña fue restablecida
function passwordRestablecida({ to, password }) {
  return enviarCorreo({
    to,
    subject: 'Credenciales actualizadas',
    html: plantilla({
      titulo: 'Tu contraseña ha sido restablecida',
      cuerpo: `
        <p style="margin:0 0 12px;">Se ha restablecido tu contraseña en el sistema.</p>
        <p style="margin:0 0 8px;font-weight:bold;">Nueva contraseña temporal:</p>
        <div style="background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:6px;padding:10px 12px;margin:0 0 16px;">
          <code style="font-family:Consolas,Monaco,monospace;font-size:14px;">${escapeHtml(password)}</code>
        </div>
        ${boton(baseApp(), 'Ir al inicio de sesión')}
        <p style="margin:16px 0 0;color:#64748b;">Por seguridad, cambia tu contraseña al iniciar sesión.</p>`,
      pie: 'Clínica Renal Emanuel — Soporte',
    }),
  });
}

// Al administrador: solicitud de recuperación con enlace de acción rápida (idUsuario/token opcionales)
function solicitudRecuperacion({ to, datos, idUsuario, token }) {
  const enlace = token ? `${baseApp()}/admin/reset-user?token=${token}` : `${baseApp()}/admin/reset-user`;
  return enviarCorreo({
    to,
    subject: 'Solicitud de recuperación de contraseña (acción requerida)',
    html: plantilla({
      titulo: 'Solicitud de recuperación de contraseña',
      cuerpo: `
        <p style="margin:0 0 12px;">Se recibió una solicitud de recuperación de contraseña desde el login.</p>
        <p style="margin:0 0 8px;font-weight:bold;">Datos suministrados por el usuario:</p>
        <ul style="margin:0 0 16px;padding-left:18px;line-height:1.6;">
          <li><strong>DPI:</strong> ${escapeHtml(datos.dpi)}</li>
          <li><strong>Nombres:</strong> ${escapeHtml(datos.nombres)}</li>
          <li><strong>Apellidos:</strong> ${escapeHtml(datos.apellidos)}</li>
          <li><strong>Teléfono:</strong> ${escapeHtml(datos.telefono)}</li>
          <li><strong>Usuario:</strong> ${escapeHtml(datos.usuario)}</li>
        </ul>
        ${idUsuario ? `<p style="margin:0 0 16px;"><strong>ID Usuario en sistema:</strong> ${escapeHtml(idUsuario)}</p>` : ''}
        ${boton(enlace, 'Abrir acción rápida (expira en 15 min)')}
        <p style="margin:16px 0 0;color:#64748b;">Favor validar la identidad y proceder al cambio de contraseña en el sistema si corresponde.</p>`,
      pie: 'Clínica Renal Emanuel — Sistema de Gestión',
    }),
  });
}

// Al usuario: acuse de recibo de su solicitud
function acuseSolicitud({ to }) {
  return enviarCorreo({
    to,
    subject: 'Hemos recibido tu solicitud de recuperación de contraseña',
    html: plantilla({
      titulo: 'Solicitud recibida',
      cuerpo: `
        <p style="margin:0 0 12px;">Hemos recibido tu solicitud para recuperar tu contraseña.</p>
        <p style="margin:0 0 12px;">El equipo de administración revisará tus datos y, de ser procedente, te enviará una nueva contraseña o un enlace para restablecerla.</p>
        ${boton(baseApp(), 'Ir al inicio')}`,
      pie: 'Clínica Renal Emanuel — Soporte',
    }),
  });
}

module.exports = { escapeHtml, passwordRestablecida, solicitudRecuperacion, acuseSolicitud };
