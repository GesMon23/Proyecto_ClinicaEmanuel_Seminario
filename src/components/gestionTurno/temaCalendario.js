// Colores del calendario según el tema claro/oscuro (clase "dark" en <html>). FullCalendar pinta con estilos
// propios, así que se fuerzan con una hoja de estilos inyectada y con estilos en línea.
import { useEffect } from 'react';

const ID_HOJA = 'dynamic-calendar-colors';

export function aplicarTemaCalendario() {
  const oscuro = document.documentElement.classList.contains('dark');
  const numeros = oscuro ? '#94a3b8' : '#000000';

  const titulo = document.querySelector('.fc-toolbar-title');
  if (titulo) titulo.style.color = oscuro ? '#f1f5f9' : '#1e293b';
  document.querySelectorAll('.fc-daygrid-day-number').forEach((n) => n.style.setProperty('color', numeros, 'important'));

  const anterior = document.getElementById(ID_HOJA);
  if (anterior) anterior.remove();
  const hoja = document.createElement('style');
  hoja.id = ID_HOJA;
  hoja.textContent = `
    .fc-daygrid-day-number,
    .fc-daygrid-day-top .fc-daygrid-day-number,
    .fc-daygrid-day-frame .fc-daygrid-day-number {
      color: ${numeros} !important;
    }
    .fc-highlight {
      background: ${oscuro ? 'linear-gradient(135deg, #14532d 0%, #166534 100%)' : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'} !important;
      border: 3px solid ${oscuro ? '#22c55e' : '#16a34a'} !important;
      border-radius: 0.5rem !important;
      box-shadow: 0 0 0 2px ${oscuro ? 'rgba(34, 197, 94, 0.4)' : 'rgba(22, 163, 74, 0.3)'} !important;
    }
    /* Días disponibles: verde más discreto que el de la selección */
    .fc .fc-daygrid-day.dia-disponible {
      background-color: ${oscuro ? '#0f2a1d' : '#e6f7ec'} !important;
      cursor: pointer;
    }
    .fc .fc-daygrid-day.dia-disponible:hover {
      background-color: ${oscuro ? '#14532d' : '#d1f0dc'} !important;
    }
    /* Domingos y días anteriores a hoy: bloqueados */
    .fc .fc-daygrid-day.dia-bloqueado,
    .fc .fc-daygrid-day.dia-bloqueado:hover {
      background-color: ${oscuro ? '#1e293b' : '#e5e7eb'} !important;
      cursor: not-allowed;
    }
    .fc .fc-daygrid-day.dia-bloqueado .fc-daygrid-day-number {
      color: ${oscuro ? '#64748b' : '#9ca3af'} !important;
    }
  `;
  document.head.appendChild(hoja);
}

// Reaplica los colores cuando cambia la clase del <html> (cambio de tema)
export function useTemaCalendario() {
  useEffect(() => {
    const observador = new MutationObserver((mutaciones) => {
      if (mutaciones.some((m) => m.type === 'attributes' && m.attributeName === 'class')) {
        setTimeout(aplicarTemaCalendario, 50);
      }
    });
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observador.disconnect();
  }, []);
}
