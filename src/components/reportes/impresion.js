// Impresión (ventana nueva + diálogo de imprimir) de los reportes de pacientes.
import logoClinica from '@/assets/logoClinica2.png';

const escapar = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const BASE = `
  body { font-family: Arial, sans-serif; color: #0f172a; padding: 28px; }
  h1 { color: #166534; font-size: 22px; margin: 4px 0 8px; text-align: center; }
  .meta { color: #475569; font-size: 12px; margin-bottom: 12px; text-align: center; }
  .logo { display: block; margin: 0 auto 10px auto; height: 96px; }
`;

function abrir(titulo, estilos, cuerpo) {
  const html = `<html><head><meta charset="utf-8" /><title>${escapar(titulo)}</title><style>${BASE}${estilos}</style></head><body>
    <img src="${logoClinica}" class="logo" />${cuerpo}</body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 300);
}

// Listado: una fila por paciente. columnas: [{ titulo, valor(p) }]
export function imprimirListado({ asunto, titulo, columnas }, filas) {
  const encabezado = ['#', ...columnas.map((c) => c.titulo)].map((t) => `<th>${escapar(t)}</th>`).join('');
  const cuerpo = filas.map((p, i) => `<tr><td>${i + 1}</td>${columnas.map((c) => `<td>${escapar(c.valor(p))}</td>`).join('')}</tr>`).join('');
  abrir(asunto, `
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
    th { background: #f1f5f9; }
    @page { size: A4 landscape; margin: 14mm; }`, `
    <h1>${escapar(titulo)}</h1>
    <div class="meta">Generado: ${new Date().toLocaleString()} — Registros: ${filas.length}</div>
    <table><thead><tr>${encabezado}</tr></thead><tbody>${cuerpo}</tbody></table>`);
}

// Detalle de un paciente. campos: [{ etiqueta, valor(p), completo }]
export function imprimirDetalle({ titulo, campos }, paciente) {
  const filas = campos.map((c) => `
    <div class="row"${c.completo ? ' style="grid-column: 1 / -1;"' : ''}><span class="label">${escapar(c.etiqueta)}:</span> ${escapar(c.valor(paciente))}</div>`).join('');
  abrir(`${titulo} ${paciente.noafiliacion || ''}`, `
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
    .row { margin: 6px 0; }
    .label { font-weight: 700; }
    @page { size: A4 portrait; margin: 14mm; }`, `
    <h1>${escapar(titulo)}</h1>
    <div class="meta">Generado: ${new Date().toLocaleString()}</div>
    <div class="section"><div class="grid">${filas}</div></div>`);
}
