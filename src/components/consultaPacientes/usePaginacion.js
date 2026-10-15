import { useEffect, useMemo, useState } from 'react';

const texto = (v) => (v ?? '').toString().toLowerCase();

// Búsqueda por columnas y paginación de una lista en memoria
export function usePaginacion(items, claves, tamanoInicial = 10) {
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [tamano, setTamano] = useState(tamanoInicial);

  useEffect(() => { setPagina(1); }, [busqueda, tamano]);

  const filtrados = useMemo(() => {
    if (!busqueda) return items;
    const q = busqueda.toLowerCase();
    return items.filter((it) => claves.some((k) => texto(it[k]).includes(q)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / tamano));
  const visibles = useMemo(() => filtrados.slice((pagina - 1) * tamano, pagina * tamano), [filtrados, pagina, tamano]);

  return { busqueda, setBusqueda, pagina, setPagina, tamano, setTamano, totalPaginas, visibles };
}
