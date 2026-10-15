// Voz de la pantalla de llamados (síntesis de voz del navegador).
const soportaVoz = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

const vozEnEspanol = () => window.speechSynthesis.getVoices()
  .find((v) => v.lang?.startsWith('es') || v.name?.toLowerCase().includes('spanish'));

function decir(texto, velocidad) {
  try { window.speechSynthesis.resume(); } catch { /* el motor pudo quedar pausado */ }
  const voz = new SpeechSynthesisUtterance(texto);
  voz.rate = velocidad;
  voz.pitch = 1;
  const es = vozEnEspanol();
  if (es) voz.voice = es;
  window.speechSynthesis.speak(voz);
}

export function anunciarTurno(turno, clinica) {
  if (!turno || !soportaVoz()) return;
  try {
    window.speechSynthesis.cancel();
    decir(`${turno.nombrepaciente || ''} pasar a clínica ${clinica}.`, 0.8);
  } catch { /* sin voz disponible */ }
}

// Aviso corto: el navegador solo permite audio tras una interacción del usuario
export function anunciarAudioHabilitado() {
  if (!soportaVoz()) return;
  try { decir('Audio habilitado', 1); } catch { /* sin voz disponible */ }
}

// Pide al navegador que cargue las voces; `alCargar` se llama cuando estén (o tras 500 ms). Devuelve la función de limpieza.
export function precargarVoces(alCargar) {
  if (!soportaVoz()) return () => {};
  window.speechSynthesis.onvoiceschanged = alCargar;
  window.speechSynthesis.getVoices();
  const t = setTimeout(alCargar, 500);
  return () => { clearTimeout(t); try { window.speechSynthesis.onvoiceschanged = null; } catch { /* nada que limpiar */ } };
}
