import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PESTANAS, tieneAlguno } from '@/constants/permisos';

// Pestañas de un módulo que el usuario puede ver y la activa (al entrar, la primera permitida).
export function usePestanas(modulo) {
  const { user } = useAuth() || {};
  const visibles = PESTANAS[modulo].filter((p) => tieneAlguno(user, [p.permiso]));
  const [elegida, setElegida] = useState(null);
  const activa = visibles.some((p) => p.clave === elegida) ? elegida : visibles[0]?.clave ?? null;
  return { visibles, activa, setActiva: setElegida };
}
