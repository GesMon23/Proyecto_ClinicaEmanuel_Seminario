const nodemailer = require('nodemailer');
let sgMail = null;
try { sgMail = require('@sendgrid/mail'); } catch { /* opcional */ }

// Envío de correos según variables de entorno (se leen en cada envío):
//   SendGrid API: MAIL_PROVIDER=sendgrid, MAIL_API_KEY
//   SMTP (Gmail, SES, Brevo...): SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
//   Remitente: MAIL_FROM (si no, ADMIN_EMAIL)

let cachedTransport = null;

const usaSendgrid = () => (process.env.MAIL_PROVIDER || '').toLowerCase() === 'sendgrid' && !!sgMail && !!process.env.MAIL_API_KEY;
const smtpCompleto = () => ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].every((k) => !!process.env[k]);
const remitente = () => process.env.MAIL_FROM || process.env.ADMIN_EMAIL || '';

// true si hay un proveedor y un remitente configurados (sin esto no se intenta enviar)
function correoConfigurado() {
  return (usaSendgrid() || smtpCompleto()) && !!remitente();
}

function getTransport() {
  if (cachedTransport) return cachedTransport;
  if (!smtpCompleto()) {
    throw new Error('SMTP config incompleta. Verifique SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
  }
  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return cachedTransport;
}

async function enviarCorreo({ to, subject, html, text }) {
  const from = remitente();
  if (usaSendgrid()) {
    sgMail.setApiKey(process.env.MAIL_API_KEY);
    const [resp] = await sgMail.send({ to, from, subject, text, html });
    return { messageId: resp?.headers?.['x-message-id'] || null };
  }
  return getTransport().sendMail({ from, to, subject, html, text });
}

module.exports = { getTransport, enviarCorreo, correoConfigurado };
