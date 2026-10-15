// Estilos comunes de los botones de acción, tomados de los botones Buscar y Limpiar de Consulta Pacientes.
// Uso: className={BOTON_PRINCIPAL}, o cn(BOTON_PRINCIPAL, 'w-full sm:w-auto') para sumar clases de ubicación.

// Buscar, Guardar, Registrar, Actualizar, Confirmar...
export const BOTON_PRINCIPAL =
  'inline-flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 disabled:text-gray-600 ' +
  'disabled:cursor-not-allowed text-white text-base font-semibold py-2.5 px-5 rounded-lg shadow-sm transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-white ' +
  'dark:bg-green-600 dark:hover:bg-green-700 dark:disabled:bg-gray-600 dark:focus:ring-offset-slate-900';

// Limpiar
export const BOTON_LIMPIAR =
  'inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-600 ' +
  'disabled:cursor-not-allowed text-white text-base font-semibold py-2.5 px-5 rounded-lg shadow-sm transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-white ' +
  'dark:bg-red-600 dark:hover:bg-red-700 dark:disabled:bg-gray-600 dark:focus:ring-offset-slate-900';
