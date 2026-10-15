// Código QR como imagen PNG (lo usa el reporte del frontend). También sin /api por proxies que lo quitan.
const express = require('express');
const QRCode = require('qrcode');

const router = express.Router();

// Lado en píxeles: entre 80 y 1024, 220 por omisión
const tamano = (valor) => Math.min(1024, Math.max(80, parseInt(valor || '220', 10) || 220));

router.get(['/api/qr', '/qr'], async (req, res) => {
  const texto = String(req.query.text || '').trim();
  if (!texto) return res.status(400).json({ error: 'text requerido' });
  try {
    const png = await QRCode.toBuffer(texto, { type: 'png', width: tamano(req.query.size), margin: 2, errorCorrectionLevel: 'Q' });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(png);
  } catch (err) {
    console.error('Error generando QR:', err);
    return res.status(500).json({ error: 'No se pudo generar el QR' });
  }
});

module.exports = { router, tamano };
