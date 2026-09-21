// Llamados de turnos en tiempo real: publicación (LlamadoTurnos.jsx), suscripción SSE y polling (LlamadoTurnosTV.jsx).
const express = require('express');
const { eventos } = require('./llamados.store');

const router = express.Router();
const INTERVALO_PING_MS = 25000;

router.post('/api/turnos/llamado', (req, res) => {
  const { clinica, accion, turnoId, ts } = req.body || {};
  if (!clinica || !accion) return res.status(400).json({ error: 'clinica y accion son requeridos' });
  eventos.publicar({ clinica, accion, turnoId, ts });
  return res.json({ ok: true });
});

router.get('/api/turnos/llamado-sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (res.flushHeaders) res.flushHeaders();

  const cliente = eventos.conectar(res);
  // Latido para que los proxies no cierren la conexión inactiva
  const ping = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { /* lo limpia close */ }
  }, INTERVALO_PING_MS);
  try { res.write(': connected\n\n'); } catch { /* lo limpia close */ }

  req.on('close', () => {
    clearInterval(ping);
    eventos.desconectar(cliente);
    try { res.end(); } catch { /* ya cerrada */ }
  });
});

router.get('/api/turnos/llamado-events', (req, res) => {
  res.json({ events: eventos.desde(req.query.since, req.query.max), now: Date.now() });
});

module.exports = router;
