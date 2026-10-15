// Error con respuesta HTTP explícita (validaciones, "no encontrado", etc.)
class HttpError extends Error {
  constructor(status, body) {
    super(body && (body.message || body.error || body.detail) ? String(body.message || body.error || body.detail) : `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

function noCache(res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

// Envuelve un handler async: los HttpError se responden tal cual y el resto pasa por onError,
// que devuelve [status, body] (cada endpoint conserva el formato de error que ya consume el frontend).
function wrap(handler, onError) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (err instanceof HttpError) return res.status(err.status).json(err.body);
      const [status, body] = onError ? onError(err, req) : [500, { detail: err.message }];
      return res.status(status).json(body);
    }
  };
}

// Errores de regla de negocio que lanzan los procedimientos: RAISE EXCEPTION 'CODIGO: mensaje'
function parseBusinessError(err, codigos) {
  const msg = String((err && err.message) || '');
  const codigo = codigos.find((c) => msg.startsWith(c));
  if (!codigo) return null;
  return { codigo, mensaje: msg.slice(codigo.length).replace(/^:\s*/, '') };
}

module.exports = { HttpError, noCache, wrap, parseBusinessError };
