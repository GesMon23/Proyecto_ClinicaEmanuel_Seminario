import { useCallback, useEffect, useRef, useState } from 'react';

// Estado de un aviso breve: const { toast, avisar } = useToast();  <Toast {...toast} />
export function useToast(duracion = 3000) {
  const [toast, setToast] = useState({ show: false, message: '' });
  const temporizador = useRef(null);
  const avisar = useCallback((message) => {
    clearTimeout(temporizador.current);
    setToast({ show: true, message });
    temporizador.current = setTimeout(() => setToast({ show: false, message }), duracion);
  }, [duracion]);
  useEffect(() => () => clearTimeout(temporizador.current), []);
  return { toast, avisar };
}
