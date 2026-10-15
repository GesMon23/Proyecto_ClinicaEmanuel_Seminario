// Eventos de llamado de turnos (pantalla de TV): historial acotado en memoria y clientes SSE conectados.
// Si el servidor se reinicia el historial se pierde; las pantallas se reconectan solas.
//
// La hora (ts) y el número (id) los pone SIEMPRE el servidor: la TV pide "lo posterior a X" con el reloj del
// servidor, y si se usara la hora del equipo que llama, un reloj atrasado unos segundos hacía que la TV de otro
// equipo nunca recibiera el llamado.
class EventosLlamado {
  constructor({ maximo = 500, ahora = Date.now } = {}) {
    this.maximo = maximo;
    this.ahora = ahora;
    this.secuencia = 0;
    this.eventos = [];
    this.clientes = new Set(); // { id, res }
  }

  // Formato SSE: el id permite que el navegador, al reconectarse, pida lo que se perdió (Last-Event-ID)
  static comoSse(e) {
    return `id: ${e.id}\ndata: ${JSON.stringify(e)}\n\n`;
  }

  // Normaliza el evento, lo guarda y lo envía a todos los clientes SSE.
  // idLlamado: identificador que pone quien llama, para que la TV no anuncie dos veces el mismo llamado
  // cuando le llega por dos vías (mismo navegador y servidor).
  publicar(evt) {
    this.secuencia += 1;
    const e = {
      id: this.secuencia,
      idLlamado: evt?.idLlamado ? String(evt.idLlamado).slice(0, 64) : null,
      clinica: String(evt?.clinica || ''),
      accion: String(evt?.accion || ''),
      turnoId: evt?.turnoId ? String(evt.turnoId) : null,
      ts: this.ahora(),
    };
    this.eventos.push(e);
    if (this.eventos.length > this.maximo) this.eventos.splice(0, this.eventos.length - this.maximo);
    const dato = EventosLlamado.comoSse(e);
    for (const c of this.clientes) {
      try { c.res.write(dato); } catch { /* cliente caído: lo quita su evento close */ }
    }
    return e;
  }

  // Eventos posteriores a `desde` (ms epoch del servidor), como máximo `max` (tope 200)
  desde(desde, max) {
    const tope = Math.min(200, Number(max || 100) || 100);
    return this.eventos.filter((e) => e.ts > (Number(desde || 0) || 0)).slice(-tope);
  }

  // Eventos con id mayor a `id` (reconexión SSE)
  despuesDeId(id) {
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? this.eventos.filter((e) => e.id > n) : [];
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
