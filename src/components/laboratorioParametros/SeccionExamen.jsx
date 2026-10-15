import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { BOTON_LIMPIAR, BOTON_PRINCIPAL } from '@/constants/botones';
import { CAMPO, ETIQUETA } from '@/constants/formularios';
import { cn } from '@/utils/cn';
import FilaParametro from './FilaParametro';
import { CampoLab } from './CampoLab';

const POSITIVO_NEGATIVO = ['Positivo', 'Negativo'];

// Campos que aparecen cuando el examen fue realizado: parámetros numéricos, accesos, virología y observación
export default function SeccionExamen({ lab }) {
  const [agregando, setAgregando] = useState(false);
  const [nuevo, setNuevo] = useState('');
  const { parametros, valores } = lab;
  const campo = (name) => ({ value: valores[name] || '', onChange: (e) => lab.cambiar(name, e.target.value) });

  const confirmarNuevo = () => {
    if (lab.agregarParametro(nuevo)) { setNuevo(''); setAgregando(false); }
  };
  const cancelarNuevo = () => { setAgregando(false); setNuevo(''); };

  return (
    <>
      <div>
        <h3 className="mb-3 text-lg font-semibold text-green-800 dark:text-green-300">Parámetros</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
          {parametros.map((p) => <FilaParametro key={p.param} parametro={p} lab={lab} />)}
        </div>

        {agregando ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 dark:border-slate-600">
            <label htmlFor="lab-nuevo-parametro" className={ETIQUETA}>Nuevo parámetro de laboratorio</label>
            <div className="mt-1 flex flex-col sm:flex-row gap-3">
              <input
                id="lab-nuevo-parametro"
                type="text" value={nuevo} onChange={(e) => setNuevo(e.target.value)} autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmarNuevo(); } }}
                placeholder="Ingrese el nombre del nuevo parámetro"
                className={cn(CAMPO, 'mt-0 flex-1')}
              />
              <button type="button" className={BOTON_PRINCIPAL} onClick={confirmarNuevo} disabled={!nuevo.trim()}>Agregar</button>
              <button type="button" className={BOTON_LIMPIAR} onClick={cancelarNuevo}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAgregando(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-green-700 px-4 py-2 font-semibold text-green-800 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Agregar parámetro
          </button>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-green-800 dark:text-green-300">Acceso y virología</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CampoLab etiqueta="Infección de acceso" requerido {...campo('infeccion_acceso')} />
          <CampoLab etiqueta="Complicación de acceso" requerido {...campo('complicacion_acceso')} />
          <CampoLab etiqueta="Virología" requerido {...campo('virologia')} />
          <CampoLab etiqueta="Antígeno Hepatitis C" requerido opciones={POSITIVO_NEGATIVO} {...campo('antigeno_hepatitis_c')} />
          <CampoLab etiqueta="Antígeno de superficie" requerido opciones={POSITIVO_NEGATIVO} {...campo('antigeno_superficie')} />
          <CampoLab etiqueta="HIV" requerido opciones={POSITIVO_NEGATIVO} {...campo('hiv')} />
        </div>
      </div>

      <CampoLab etiqueta="Observación" tipo="textarea" rows={3} placeholder="Ingrese aquí las observaciones del laboratorio" {...campo('observacion')} />
    </>
  );
}
