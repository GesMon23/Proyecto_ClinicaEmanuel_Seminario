import React, { useEffect, useState } from 'react';
import api from '@/config/api';

// Una imagen ya local (foto recién tomada con la cámara): no se descarga
const esLocal = (ruta) => /^(data|blob):/.test(ruta);
// Las rutas pueden venir con el prefijo /api, que axios ya agrega
const sinApi = (ruta) => ruta.replace(/^\/api(?=\/)/, '');

// Foto de un paciente servida por la API. Las fotos exigen sesión y un <img src> no puede enviar el token,
// así que se descarga con axios y se muestra como URL local. Prueba las rutas en orden y, si ninguna sirve,
// muestra `alternativa` (la URL de una imagen o un elemento).
//   rutas: rutas de la API, p. ej. ['/foto/123?v=1', '/fotos/123.jpg']; las vacías se ignoran
export default function FotoPaciente({ rutas, alternativa = null, alt = 'Foto del paciente', className }) {
  const clave = (rutas || []).filter(Boolean).join('\n');
  const [src, setSrc] = useState(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    const lista = clave ? clave.split('\n') : [];
    let vigente = true;
    let creada = null;
    setSrc(null);
    setFallo(false);
    (async () => {
      for (const ruta of lista) {
        if (esLocal(ruta)) {
          setSrc(ruta);
          return;
        }
        try {
          const { data } = await api.get(sinApi(ruta), { responseType: 'blob' });
          if (!vigente) return;
          creada = URL.createObjectURL(data);
          setSrc(creada);
          return;
        } catch { /* se prueba la siguiente ruta */ }
      }
      if (vigente) setFallo(true);
    })();
    return () => {
      vigente = false;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [clave]);

  if (src) return <img alt={alt} src={src} className={className} />;
  if (!fallo) return null;
  return typeof alternativa === 'string' ? <img alt={alt} src={alternativa} className={className} /> : alternativa;
}
