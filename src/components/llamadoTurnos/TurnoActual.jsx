import React from 'react';
import { formatearFecha } from '@/utils/fechas';
import FotoPaciente from '@/components/pacientes/FotoPaciente';
import { rutasFotoDeTurno, volverALlamar } from './llamados';

const TARJETA_DATO = 'bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg';

// Tarjeta del paciente que el usuario tiene en atención en la clínica seleccionada (o aviso de que no hay ninguno)
export default function TurnoActual({ clinica, turno }) {
  return (
    <div className="mb-6">
      <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Turno Actual - {clinica}</h4>

      {turno ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden border border-green-100 dark:border-slate-700 transition-all duration-300 hover:shadow-xl">
          <div className="bg-gradient-to-r from-green-800 to-green-700 p-4 text-white">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Paciente Actual</h3>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">{clinica}</span>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <Foto turno={turno} />
              <div className="flex-1 w-full mt-4 md:mt-0">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{turno.nombrepaciente}</h2>
                <p className="text-green-600 dark:text-green-400 mb-6">
                  <span className="font-medium">Código:</span> {turno.id_turno_cod}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={TARJETA_DATO}>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-300 mb-1">No. Afiliación</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{turno.no_afiliacion}</p>
                  </div>
                  <div className={TARJETA_DATO}>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha y Hora</p>
                    <p className="text-gray-700 dark:text-gray-300">{formatearFecha(turno.fecha_turno)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>En atención</span>
              </div>
              <button
                onClick={() => volverALlamar(clinica, turno)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Llamar Nuevamente
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
          <div className="text-gray-400 dark:text-gray-500">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">No hay turno en atención</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Elija un turno para comenzar la atención.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Foto del paciente; si no carga (o no hay), su inicial. Sin servicios externos: el nombre no sale de la clínica.
function Foto({ turno }) {
  const nombre = turno.nombrepaciente || '?';
  const inicial = (
    <div className="w-full h-full flex items-center justify-center bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 text-5xl">
      {nombre.charAt(0).toUpperCase()}
    </div>
  );
  return (
    <div className="relative group">
      <div className="w-36 h-36 rounded-xl overflow-hidden border-4 border-green-100 dark:border-green-900 bg-gray-100 dark:bg-slate-700 flex-shrink-0 relative transition-transform duration-300 group-hover:scale-105">
        <FotoPaciente rutas={rutasFotoDeTurno(turno)} alternativa={inicial} className="w-full h-full object-cover" />
      </div>
    </div>
  );
}
