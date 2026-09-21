// Estado en memoria del módulo de autenticación (se pierde al reiniciar; migrar a BD/Redis si se escala a varias instancias).

// Bloqueo temporal tras demasiados intentos fallidos de login
class IntentosFallidos {
  constructor({ maximo = 10, minutosBloqueo = 15, ahora = Date.now } = {}) {
    this.maximo = maximo;
    this.minutosBloqueo = minutosBloqueo;
    this.ahora = ahora;
    this.registros = new Map(); // usuario (minúsculas) -> { count, lockUntil }
  }

  clave(usuario) {
    return String(usuario).toLowerCase();
  }

  // { bloqueado, msRestantes }
  estado(usuario) {
    const rec = this.registros.get(this.clave(usuario));
    const restante = rec && rec.lockUntil ? rec.lockUntil - this.ahora() : 0;
    return restante > 0 ? { bloqueado: true, msRestantes: restante } : { bloqueado: false, msRestantes: 0 };
  }

  // Suma un fallo; al llegar al máximo bloquea la cuenta y reinicia el contador
  registrar(usuario) {
    const clave = this.clave(usuario);
    const rec = this.registros.get(clave) || { count: 0, lockUntil: 0 };
    rec.count += 1;
    if (rec.count >= this.maximo) {
      rec.lockUntil = this.ahora() + this.minutosBloqueo * 60 * 1000;
      rec.count = 0;
    }
    this.registros.set(clave, rec);
    return this.estado(usuario);
  }

  limpiar(usuario) {
    this.registros.delete(this.clave(usuario));
  }
}

// Tokens de acción de un solo uso (enlace del correo al administrador) hasta que expiren
class TokensUsados {
  constructor({ ahora = Date.now } = {}) {
    this.ahora = ahora;
    this.tokens = new Map(); // token -> expiración (ms)
  }

  usado(token) {
    const clave = String(token);
    const expira = this.tokens.get(clave);
    if (!expira) return false;
    if (this.ahora() >= expira) {
      this.tokens.delete(clave);
      return false;
    }
    return true;
  }

  // expSegundos: claim exp del JWT; sin él se recuerda 15 minutos
  marcar(token, expSegundos) {
    const ms = (Number(expSegundos) || 0) * 1000;
    this.tokens.set(String(token), ms > 0 ? ms : this.ahora() + 15 * 60 * 1000);
  }

  purgar() {
    for (const [token, expira] of this.tokens.entries()) {
      if (this.ahora() >= expira) this.tokens.delete(token);
    }
  }
}

const intentos = new IntentosFallidos({
  maximo: parseInt(process.env.LOGIN_MAX_ATTEMPTS || '10', 10),
  minutosBloqueo: parseInt(process.env.LOGIN_LOCK_MINUTES || '15', 10),
});
const tokensUsados = new TokensUsados();

const limpieza = setInterval(() => tokensUsados.purgar(), 5 * 60 * 1000);
if (limpieza.unref) limpieza.unref();

module.exports = { IntentosFallidos, TokensUsados, intentos, tokensUsados };
