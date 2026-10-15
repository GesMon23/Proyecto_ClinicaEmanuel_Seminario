import React from 'react';

const TONOS = {
  info: { franja: 'bg-cyan-400', icono: 'text-cyan-500' },
  success: { franja: 'bg-green-500', icono: 'text-green-600' },
  error: { franja: 'bg-red-500', icono: 'text-red-600' },
};

// Aviso breve no bloqueante (arriba a la derecha). El estado se maneja con hooks/useToast.
export default function Toast({ show, message, tipo = 'info' }) {
  if (!show) return null;
  const tono = TONOS[tipo] || TONOS.info;
  return (
    <div className="fixed top-5 right-5 z-50 flex items-center w-80 rounded-lg shadow-lg overflow-hidden bg-white dark:bg-slate-600" role="alert">
      <div className={`w-1 self-stretch ${tono.franja}`} />
      <div className="flex-1 px-4 py-3 flex items-center space-x-3">
        <svg className={`w-6 h-6 ${tono.icono} flex-shrink-0`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <div className="flex-1 text-sm dark:text-white">{message}</div>
      </div>
    </div>
  );
}
