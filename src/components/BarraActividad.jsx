import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { peticionesEnCurso, suscribirActividad } from '@/config/api';

const RETRASO_MS = 300; // las peticiones rápidas no muestran la barra (evita parpadeos)

// Barra fina en la parte superior mientras hay peticiones al servidor: toda pantalla indica que está cargando,
// aunque no tenga su propia animación
export default function BarraActividad() {
  const activas = useSyncExternalStore(suscribirActividad, peticionesEnCurso);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (activas === 0) { setVisible(false); return undefined; }
    const t = setTimeout(() => setVisible(true), RETRASO_MS);
    return () => clearTimeout(t);
  }, [activas]);

  if (!visible) return null;
  return (
    <div role="progressbar" aria-label="Cargando" className="fixed inset-x-0 top-0 z-[200] h-1 overflow-hidden bg-green-100 dark:bg-green-950">
      <div className="h-full w-1/3 rounded-full bg-green-600 motion-safe:animate-[barra-actividad_1.1s_ease-in-out_infinite] dark:bg-green-400" />
    </div>
  );
}
