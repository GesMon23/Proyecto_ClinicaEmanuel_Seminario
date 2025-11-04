import React, { useEffect } from 'react';
import LlamadoTurnosTV from '@/components/LlamadoTurnosTV';

// Esta página no usará el layout principal
function TurnosTVPage() {
  // Efecto para prevenir el scroll y ajustar el tamaño
  useEffect(() => {
    // Prevenir el scroll
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Restaurar el scroll al desmontar el componente
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
      <LlamadoTurnosTV />
    </div>
  );
}

export default TurnosTVPage;