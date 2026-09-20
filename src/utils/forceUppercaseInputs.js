// Fuerza a mayuscula el valor de todo input de texto/textarea de la app,
// interceptando el evento nativo "input" en fase de captura (antes de que
// React procese su propio onChange) - asi el estado controlado de React
// termina guardando el valor ya en mayuscula, sin tocar cada formulario.

const EXCLUDED_TYPES = new Set([
  "password",
  "email",
  "number",
  "date",
  "time",
  "datetime-local",
  "month",
  "week",
  "file",
  "checkbox",
  "radio",
  "range",
  "color",
  "hidden",
  "url",
  "tel",
  "search",
]);

function isUppercasable(el) {
  if (!el) return false;
  if (el.tagName === "TEXTAREA") return true;
  if (el.tagName !== "INPUT") return false;
  const type = (el.type || "text").toLowerCase();
  return !EXCLUDED_TYPES.has(type);
}

let nativeInputSetter = null;
let nativeTextareaSetter = null;

function getNativeSetter(el) {
  if (el.tagName === "TEXTAREA") {
    if (!nativeTextareaSetter) {
      nativeTextareaSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      ).set;
    }
    return nativeTextareaSetter;
  }
  if (!nativeInputSetter) {
    nativeInputSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
  }
  return nativeInputSetter;
}

function handleNativeInput(e) {
  const el = e.target;
  if (!isUppercasable(el)) return;

  const upper = el.value.toUpperCase();
  if (upper === el.value) return;

  const start = el.selectionStart;
  const end = el.selectionEnd;

  // Usa el setter nativo (no el proxy de React) para que React detecte el
  // cambio via su tracker interno cuando lea e.target.value en su propio
  // onChange, que se dispara despues de este listener (fase de captura).
  getNativeSetter(el).call(el, upper);

  try {
    el.setSelectionRange(start, end);
  } catch {
    // Algunos inputs (ej. type="search" ya excluido, o estados intermedios) no soportan selectionRange.
  }
}

let installed = false;

export function installForceUppercaseInputs() {
  if (installed) return;
  installed = true;
  document.addEventListener("input", handleNativeInput, true);
}
