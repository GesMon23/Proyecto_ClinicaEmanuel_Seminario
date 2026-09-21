import React from 'react';

// Aviso breve no bloqueante (arriba a la derecha). Estado en hooks/useToast.
export default function Toast({ show, message }) {
  if (!show) return null;
  return (
    <div className="fixed top-5 right-5 z-50 flex items-center w-80 rounded-lg shadow-lg overflow-hidden bg-white dark:bg-slate-600" role="alert">
      <div className="w-1 self-stretch bg-cyan-400" />
      <div className="flex-1 px-4 py-3 flex items-center space-x-3">
        <svg className="w-6 h-6 text-cyan-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <div className="flex-1 text-sm dark:text-white">{message}</div>
      </div>
    </div>
  );
}
