const nodemailer = require('nodemailer');
let sgMail = null;
try { sgMail = require('@sendgrid/mail'); } catch { /* opcional */ }

// Transport configurable por variables de entorno
// Ejemplo de .env para SMTP 2525 (SendGrid como referencia):
// SMTP_HOST=smtp.sendgrid.net
// SMTP_PORT=2525
// SMTP_SECURE=false
// SMTP_USER=apikey
// SMTP_PASS=SG.xxxxxx
// MAIL_FROM="Clinica Emanuel <no-reply@tudominio.gt>"

let cachedTransport = null;
let provider = (process.env.MAIL_PROVIDER || '').toLowerCase();
const FROM_DEFAULT = process.env.MAIL_FROM || process.env.ADMIN_EMAIL || 'no-reply@example.com';

function canUseSendgridApi() {
  return provider === 'sendgrid' && !!sgMail && !!process.env.MAIL_API_KEY;
}

function getTransport() {
  if (cachedTransport) return cachedTransport;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '2525', 10);
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !port || !user || !pass) {
    throw new Error('SMTP config incompleta. Verifique SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
  }
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return cachedTransport;
}

async function enviarCorreo({ to, subject, html, text }) {
  const from = FROM_DEFAULT;
  if (canUseSendgridApi()) {
    sgMail.setApiKey(process.env.MAIL_API_KEY);
    const msg = { to, from, subject, text, html };
    const [resp] = await sgMail.send(msg);
    return { messageId: resp?.headers?.['x-message-id'] || resp?.headers?.['x-message-id'.toLowerCase()] || null };
  }
  const transport = getTransport();
  const info = await transport.sendMail({ from, to, subject, html, text });
  return info;
}

module.exports = { getTransport, enviarCorreo };
