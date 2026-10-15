import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';

// Animación de carga común de todo el sistema (la misma de Llamado de turnos): ícono girando + texto.
// Respeta "reducir movimiento" del sistema operativo y se anuncia a los lectores de pantalla.
//   variante: 'pantalla' (ocupa la vista), 'bloque' (dentro de una sección) o 'linea' (junto a otro contenido)
const VARIANTES = {
  pantalla: { caja: 'flex min-h-[60vh] flex-col items-center justify-center gap-4', icono: 'h-12 w-12', texto: 'text-lg' },
  bloque: { caja: 'flex flex-col items-center justify-center gap-3 py-10', icono: 'h-9 w-9', texto: 'text-base' },
  linea: { caja: 'inline-flex items-center gap-2', icono: 'h-4 w-4', texto: 'text-sm' },
};

export default function Cargando({ texto = 'Cargando datos...', variante = 'bloque', className }) {
  const v = VARIANTES[variante] || VARIANTES.bloque;
  return (
    <div role="status" aria-live="polite" className={cn(v.caja, className)}>
      <RefreshCw className={cn(v.icono, 'text-green-600 motion-safe:animate-spin dark:text-green-400')} aria-hidden="true" />
      <span className={cn(v.texto, 'font-medium text-slate-600 dark:text-slate-300')}>{texto}</span>
    </div>
  );
}

// Fila de tabla mientras se cargan los datos
export function CargandoFila({ colSpan, texto = 'Cargando datos...' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-6">
        <Cargando variante="linea" texto={texto} className="w-full justify-center" />
      </td>
    </tr>
  );
}

// Ícono pequeño para botones ("Buscando...", "Guardando...")
export function IconoCargando({ className }) {
  return <RefreshCw className={cn('h-4 w-4 motion-safe:animate-spin', className)} aria-hidden="true" />;
}
