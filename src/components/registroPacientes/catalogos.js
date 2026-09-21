// Catálogos del formulario de registro: departamentos, accesos vasculares y jornadas.
import api from '@/config/api';

// Departamento como { id, nombre }; acepta varias formas de columnas y el texto "(01,Guatemala)"
export function parseDepartamentoRecord(d) {
  const id = d?.iddepartamento ?? d?.id_departamento ?? d?.idDepartamento ?? d?.id;
  const nombre = d?.nombre ?? d?.descripcion ?? d?.nombredepartamento ?? d?.nombreDepartamento ?? d?.nombre_departamento;
  if (id && nombre) return { id: String(id).trim(), nombre: String(nombre).trim() };

  const registro = d?.fn_mostrar_departamentos ?? d?.record ?? d;
  if (registro) {
    const [idTexto, ...resto] = String(registro).replace(/[()"]/g, '').split(',');
    const idLimpio = (idTexto ?? '').trim();
    const nombreLimpio = resto.join(',').trim();
    if (idLimpio && nombreLimpio) return { id: idLimpio, nombre: nombreLimpio };
  }
  return null;
}

const aLista = (x) => (Array.isArray(x) ? x : x?.data ?? []);

// { departamentos, accesos, jornadas, falloAlguno }: lo que no se pudo cargar queda vacío
export async function cargarCatalogos() {
  const [dep, acc, jor] = await Promise.allSettled([
    api.get('/departamentos'),
    api.get('/accesos-vasculares'),
    api.get('/jornadas'),
  ]);
  const catalogos = { departamentos: [], accesos: [], jornadas: [], falloAlguno: [dep, acc, jor].some((r) => r.status === 'rejected') };

  if (dep.status === 'fulfilled') {
    catalogos.departamentos = aLista(dep.value.data).map(parseDepartamentoRecord).filter(Boolean);
  } else console.error('Departamentos falló:', dep.reason);

  if (acc.status === 'fulfilled') {
    catalogos.accesos = aLista(acc.value.data)
      .map((a) => ({ id: a.idacceso ?? a.id_acceso ?? a.idAcceso ?? a.id, descripcion: a.descripcion ?? '' }))
      .filter((a) => a.id != null);
  } else console.error('Accesos falló:', acc.reason);

  if (jor.status === 'fulfilled') {
    catalogos.jornadas = aLista(jor.value.data).map((j) => ({ id: j.idjornada ?? j.id_jornada ?? j.idJornada ?? j.id, descripcion: j.descripcion ?? '' }));
  } else console.error('Jornadas falló:', jor.reason);

  return catalogos;
}
