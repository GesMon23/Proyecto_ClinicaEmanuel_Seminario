import { useCallback, useMemo, useState } from 'react';

const CERRADO = { show: false, type: 'info', title: '', message: '' };

// Estado de un aviso modal. Uso:  const { modal, mostrar } = useAviso();  <CustomModal {...modal} />
//   mostrar('error', 'Título', 'Mensaje')  ·  modal.onClose lo cierra
export function useAviso() {
  const [aviso, setAviso] = useState(CERRADO);
  const mostrar = useCallback((type, title, message) => setAviso({ show: true, type, title, message }), []);
  const cerrar = useCallback(() => setAviso(CERRADO), []);
  const modal = useMemo(() => ({ ...aviso, onClose: cerrar }), [aviso, cerrar]);
  return { modal, mostrar, cerrar };
}
