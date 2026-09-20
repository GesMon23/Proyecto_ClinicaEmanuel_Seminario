const repo = require('./turnos.repository');

const INTERVALO_MS = 60 * 1000;

async function marcarFaltantesAutomaticos() {
  try {
    const total = await repo.marcarFaltantesAutomaticos();
    if (total > 0) console.log(`[turnos] ${total} turno(s) Creada vencidos marcados como Faltante`);
  } catch (err) {
    console.error('[turnos] Error al marcar faltantes automáticos:', err.message);
  }
}

// Tareas de fondo del módulo: al iniciar (cubre cambios de fecha con el servidor apagado) y cada minuto.
// Devuelve una función para detenerlas.
function iniciarTareas() {
  marcarFaltantesAutomaticos();
  const timer = setInterval(marcarFaltantesAutomaticos, INTERVALO_MS);
  timer.unref();
  return () => clearInterval(timer);
}

module.exports = { iniciarTareas, marcarFaltantesAutomaticos };
