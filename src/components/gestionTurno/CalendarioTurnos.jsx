import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { aplicarTemaCalendario } from './temaCalendario';
import { esDiaSeleccionable, parseYMDToLocalDate } from './turnos';

const CONFIGURACION = {
  initialView: 'dayGridMonth',
  headerToolbar: { left: 'prev,next', center: 'title', right: 'today' },
  height: 'auto',
  locale: 'es',
  buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana' },
  dayHeaderFormat: { weekday: 'short' },
  eventDisplay: 'block',
  eventBackgroundColor: '#10b981',
  eventBorderColor: '#10b981',
  eventTextColor: '#ffffff',
  selectMirror: true,
  unselectAuto: false,
  dayMaxEvents: 2,
  moreLinkText: '+ más',
  aspectRatio: 1.35,
};

const reaplicarTema = () => { setTimeout(aplicarTemaCalendario, 100); };

// Calendario mensual: los domingos y días pasados quedan bloqueados y no se puede navegar a meses anteriores.
//   habilitado: hay un paciente cargado  ·  eventos: turnos del paciente
//   onSeleccionar(Date)  ·  onEvento(evento de FullCalendar)
export default function CalendarioTurnos({ habilitado, eventos, onSeleccionar, onEvento }) {
  const alSeleccionar = (info) => {
    if (!esDiaSeleccionable(new Date(info.start))) return;
    // startStr viene como YMD en eventos de día completo: se convierte a fecha local
    onSeleccionar(parseYMDToLocalDate(info.startStr || info.start));
  };

  const seleccionPermitida = (info) => {
    const dia = new Date(info.start);
    while (dia < info.end) {
      if (!esDiaSeleccionable(dia)) return false;
      dia.setDate(dia.getDate() + 1);
    }
    return true;
  };

  const clasesDia = (arg) => {
    if (!esDiaSeleccionable(arg.date)) return ['dia-bloqueado'];
    return habilitado ? ['dia-disponible'] : [];
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-slate-700">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold text-green-800 dark:text-green-700 mb-2">Calendario de Turnos</h3>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${habilitado
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}
          >
            {habilitado ? '✓ Activo' : 'X Inactivo'}
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {habilitado ? 'Haz clic en una fecha para programar un nuevo turno' : 'Busca un paciente para activar el calendario'}
        </p>
        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600 dark:text-gray-300">
          <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-400" /> Disponible</span>
          <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-400" /> No disponible</span>
        </div>
      </div>

      <div className="calendar-wrapper bg-white dark:bg-slate-800 rounded-xl p-4 shadow-inner border border-gray-200 dark:border-slate-600">
        <FullCalendar
          {...CONFIGURACION}
          plugins={[dayGridPlugin, interactionPlugin]}
          selectable={habilitado}
          events={eventos}
          select={habilitado ? alSeleccionar : null}
          validRange={(hoy) => ({ start: new Date(hoy.getFullYear(), hoy.getMonth(), 1) })}
          selectAllow={seleccionPermitida}
          dayCellClassNames={clasesDia}
          eventClick={(clic) => onEvento(clic.event)}
          viewDidMount={reaplicarTema}
          datesSet={reaplicarTema}
        />
      </div>
    </div>
  );
}
