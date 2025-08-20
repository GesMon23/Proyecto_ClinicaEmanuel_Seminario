import React from 'react';
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction"; // Para arrastrar eventos
const Calendar = () => {
    const handleDateClick = (info) => {
        alert('Fecha seleccionada: ' + info.dateStr);
    };

    return (
        <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            dateClick={handleDateClick}
            selectable={true}
            events={[
                { title: 'Disponible', date: '2025-02-23' },
                { title: 'No Disponible', date: '2025-02-25' }
            ]}
        />
    );
};

export default Calendar;