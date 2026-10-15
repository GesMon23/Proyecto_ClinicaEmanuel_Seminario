// Correos del flujo de contraseñas. Nunca llevan contraseñas: solo un enlace de un solo uso o un aviso.
// Todo dato que viene de la base o del usuario se escapa antes de entrar al HTML.
const mailer = require('../../utils/mailer');

const baseApp = () => (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

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

const PIE = 'Clínica Renal Emanuel — Este es un correo automático, no lo respondas.';

// Enlace de un solo uso para crear una contraseña nueva
function enlaceRestablecimiento({ to, nombreUsuario, token, minutos, porAdministrador = false }) {
  const enlace = `${baseApp()}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
  const motivo = porAdministrador
    ? 'Un administrador del sistema solicitó que restablezcas tu contraseña.'
    : 'Recibimos una solicitud para restablecer tu contraseña.';
  return mailer.enviarCorreo({
    to,
    subject: 'Restablece tu contraseña — Clínica Renal Emanuel',
    text: `${motivo}\nUsuario: ${nombreUsuario}\nCrea tu nueva contraseña aquí (válido ${minutos} minutos, un solo uso):\n${enlace}\n\nSi no lo solicitaste, ignora este correo: tu contraseña actual sigue funcionando.`,
    html: plantilla({
      titulo: 'Restablece tu contraseña',
      cuerpo: `
        <p style="margin:0 0 12px;">${motivo}</p>
        <p style="margin:0 0 16px;">Usuario: <strong>${escapeHtml(nombreUsuario)}</strong></p>
        ${boton(enlace, 'Crear nueva contraseña')}
        <p style="margin:16px 0 0;color:#64748b;">El enlace vence en <strong>${minutos} minutos</strong> y solo se puede usar una vez.</p>
        <p style="margin:8px 0 0;color:#64748b;">Si no lo solicitaste, ignora este correo: tu contraseña actual sigue funcionando.</p>`,
      pie: PIE,
    }),
  });
}

// Aviso de seguridad: la contraseña acaba de cambiar
function avisoPasswordCambiada({ to, nombreUsuario }) {
  return mailer.enviarCorreo({
    to,
    subject: 'Tu contraseña fue cambiada — Clínica Renal Emanuel',
    text: `La contraseña del usuario ${nombreUsuario} se cambió correctamente. Si no fuiste tú, contacta de inmediato al administrador del sistema.`,
    html: plantilla({
      titulo: 'Tu contraseña fue cambiada',
      cuerpo: `
        <p style="margin:0 0 12px;">La contraseña del usuario <strong>${escapeHtml(nombreUsuario)}</strong> se cambió correctamente.</p>
        <p style="margin:0 0 16px;color:#b91c1c;"><strong>Si no fuiste tú</strong>, contacta de inmediato al administrador del sistema.</p>
        ${boton(baseApp(), 'Ir al inicio de sesión')}`,
      pie: PIE,
    }),
  });
}

module.exports = { escapeHtml, enlaceRestablecimiento, avisoPasswordCambiada };
