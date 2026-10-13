import React, { useState } from 'react';
import { Clock, User } from 'lucide-react';
import { obtenerClinicaConfig } from './clinicas';

// Foto del paciente en atención. La TV no tiene sesión: usa la ruta pública que solo entrega la foto de quien
// está en atención. Si no hay foto, su inicial (sin servicios externos: el nombre no sale de la clínica).
function FotoTV({ turno }) {
  const [fallo, setFallo] = useState(false);
  const src = `/api/turnos-tv/foto/${encodeURIComponent(turno.no_afiliacion)}?v=${encodeURIComponent(turno.id_turno_cod || '1')}`;
  if (fallo) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-5xl font-bold">
        {(turno.nombrepaciente || '?').charAt(0).toUpperCase()}
      </div>
    );
  }
  return <img key={src} src={src} alt="Foto del paciente" className="w-full h-full object-cover" onError={() => setFallo(true)} />;
}

// Una clínica en la pantalla de la TV: nombre, estado y paciente en atención
export default function TarjetaClinicaTV({ clinica, turno }) {
  const config = obtenerClinicaConfig(clinica);
  const Icono = config.icon;

  return (
    <div className={`flex-1 ${config.color} rounded-xl border-2 ${config.borderColor} p-3 flex flex-col overflow-hidden`}>
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Icono className={`w-7 h-7 ${config.iconColor}`} />
          <h2 className={`text-lg font-bold ${config.textColor}`}>{clinica}</h2>
        </div>
        <div className={`${config.badgeColor} px-3 py-1 rounded-full`}>
          <span className="text-xs font-bold uppercase">{turno ? 'EN ATENCIÓN' : 'SIN TURNO'}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex items-center py-1">
        {turno ? (
          <div className="w-full h-full bg-white/90 rounded-lg p-3 shadow-sm flex items-center gap-6">
            <div className="h-[90%] aspect-square rounded-full overflow-hidden border-4 border-white shadow-md flex-shrink-0 bg-gray-100">
              {turno.no_afiliacion ? (
                <FotoTV key={`${turno.no_afiliacion}-${turno.id_turno_cod}`} turno={turno} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <User className="w-1/2 h-1/2" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 mb-1">
                <User className={`w-4 h-4 ${config.iconColor}`} />
                <span className="text-sm font-bold text-gray-600 uppercase leading-none">Paciente</span>
              </div>
              <p className={`text-4xl font-bold ${config.textColor} leading-tight truncate`}>{turno.nombrepaciente || 'Sin nombre'}</p>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center">
            <Clock className="w-10 h-10 text-gray-300 mb-1.5" />
            <p className="text-sm font-semibold text-gray-500">No hay turnos activos</p>
          </div>
        )}
      </div>
    </div>
  );
}
