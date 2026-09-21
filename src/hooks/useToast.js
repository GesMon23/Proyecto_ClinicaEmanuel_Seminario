import { useCallback, useEffect, useRef, useState } from 'react';

// Estado de un aviso breve: const { toast, avisar } = useToast();  <Toast {...toast} />
//   avisar('mensaje', 'success' | 'error' | 'info')
export function useToast(duracion = 3000) {
  const [toast, setToast] = useState({ show: false, message: '', tipo: 'info' });
  const temporizador = useRef(null);
  const avisar = useCallback((message, tipo = 'info') => {
    clearTimeout(temporizador.current);
    setToast({ show: true, message, tipo });
    temporizador.current = setTimeout(() => setToast({ show: false, message, tipo }), duracion);
  }, [duracion]);
  useEffect(() => () => clearTimeout(temporizador.current), []);
  return { toast, avisar };
}
