// Descarga del carné PDF del paciente (lo genera el backend en /carnet/forzar/:noafiliacion).
function guardarArchivo(href, nombre) {
  const a = document.createElement('a');
  a.href = href;
  a.download = nombre;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Primero por enlace directo (más compatible, evita problemas de CORS/Blob); si falla, por fetch con diagnóstico.
// Lanza un Error si ninguno funciona.
export async function descargarCarnet(noAfiliacion) {
  const url = `/api/carnet/forzar/${encodeURIComponent(noAfiliacion)}`;
  const nombre = `carnet_${noAfiliacion}.pdf`;
  try {
    guardarArchivo(url, nombre);
  } catch {
    const respuesta = await fetch(url, { method: 'GET' });
    if (!respuesta.ok) {
      const cuerpo = await respuesta.text().catch(() => '');
      throw new Error(`HTTP ${respuesta.status} ${respuesta.statusText} ${cuerpo}`);
    }
    const blob = await respuesta.blob();
    const objeto = window.URL.createObjectURL(blob);
    guardarArchivo(objeto, nombre);
    window.URL.revokeObjectURL(objeto);
  }
}
