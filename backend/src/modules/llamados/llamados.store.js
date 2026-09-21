// Eventos de llamado de turnos (pantalla de TV): historial acotado en memoria y clientes SSE conectados.
// Si el servidor se reinicia el historial se pierde; las pantallas se reconectan solas.
class EventosLlamado {
  constructor({ maximo = 500, ahora = Date.now } = {}) {
    this.maximo = maximo;
    this.ahora = ahora;
    this.eventos = [];
    this.clientes = new Set(); // { id, res }
  }

  // Normaliza el evento, lo guarda y lo envía a todos los clientes SSE
  publicar(evt) {
    const e = {
      clinica: String(evt?.clinica || ''),
      accion: String(evt?.accion || ''),
      turnoId: evt?.turnoId ? String(evt.turnoId) : null,
      ts: Number(evt?.ts) || this.ahora(),
      turno: evt?.turno || null,
    };
    this.eventos.push(e);
    if (this.eventos.length > this.maximo) this.eventos.splice(0, this.eventos.length - this.maximo);
    const dato = `data: ${JSON.stringify(e)}\n\n`;
    for (const c of this.clientes) {
      try { c.res.write(dato); } catch { /* cliente caído: lo quita su evento close */ }
    }
    return e;
  }

  // Eventos posteriores a `desde` (ms epoch), como máximo `max` (tope 200)
  desde(desde, max) {
    const tope = Math.min(200, Number(max || 100) || 100);
    return this.eventos.filter((e) => e.ts > (Number(desde || 0) || 0)).slice(-tope);
  }

  conectar(res) {
    const cliente = { id: Math.random().toString(36).slice(2), res };
    this.clientes.add(cliente);
    return cliente;
  }

  desconectar(cliente) {
    this.clientes.delete(cliente);
  }
}

module.exports = { EventosLlamado, eventos: new EventosLlamado() };
