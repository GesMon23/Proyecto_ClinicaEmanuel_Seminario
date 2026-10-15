import React from 'react';
import { CAMPO, ETIQUETA } from '@/constants/formularios';
import { cn } from '@/utils/cn';
import { PERIODICIDADES } from './parametros';

const Requerido = () => <span className="text-rose-500">*</span>;

// Campo de texto, textarea o select ('opciones': lista de textos o de { value, label }) con su etiqueta
export function CampoLab({ etiqueta, requerido, tipo = 'text', opciones, id, className, ...resto }) {
  const idCampo = id || `lab-${etiqueta.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}`;
  let control;
  if (opciones) {
    control = (
      <select id={idCampo} required={requerido} className={CAMPO} {...resto}>
        <option value="">Seleccione</option>
        {opciones.map((o) => {
          const { value, label } = typeof o === 'string' ? { value: o, label: o } : o;
          return <option key={value} value={value}>{label}</option>;
        })}
      </select>
    );
  } else if (tipo === 'textarea') {
    control = <textarea id={idCampo} required={requerido} className={cn(CAMPO, 'resize-y')} {...resto} />;
  } else {
    control = <input id={idCampo} type={tipo} required={requerido} className={CAMPO} {...resto} />;
  }
  return (
    <div className={className}>
      <label htmlFor={idCampo} className={ETIQUETA}>{etiqueta} {requerido && <Requerido />}</label>
      {control}
    </div>
  );
}

export const SelectPeriodicidad = (props) => <CampoLab etiqueta="Periodicidad" requerido opciones={PERIODICIDADES} {...props} />;
