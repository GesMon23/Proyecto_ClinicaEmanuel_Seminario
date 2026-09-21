import React from 'react';
import { Form } from 'react-bootstrap';
import { PERIODICIDADES } from './parametros';

const CONTROL = 'w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300';
const SELECT = 'w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium rounded px-3 py-2 text-base';

// Campo de texto, textarea o select ('opciones': lista de textos) con su etiqueta
export function CampoLab({ etiqueta, requerido, tipo = 'text', opciones, ancho = '', ...resto }) {
  return (
    <Form.Group>
      <Form.Label className="dark:text-gray-300">{etiqueta} {requerido && <span className="text-rose-500">*</span>}</Form.Label>
      {opciones ? (
        <>
          <br />
          <Form.Select required={requerido} className={`${SELECT} ${ancho}`} {...resto}>
            <option value="">Seleccione</option>
            {opciones.map((o) => <option key={o} value={o}>{o}</option>)}
          </Form.Select>
        </>
      ) : tipo === 'textarea' ? (
        <Form.Control as="textarea" className={`${CONTROL} resize-none`} {...resto} />
      ) : (
        <Form.Control type={tipo} required={requerido} className={CONTROL} {...resto} />
      )}
    </Form.Group>
  );
}

export function SelectPeriodicidad(props) {
  return (
    <Form.Group>
      <Form.Label className="dark:text-gray-300">Periodicidad <span className="text-rose-500">*</span></Form.Label>
      <Form.Select
        className="w-full sm:min-w-[240px] md:min-w-[260px] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded px-3 py-2 text-base"
        {...props}
      >
        <option value="">Seleccione</option>
        {PERIODICIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </Form.Select>
    </Form.Group>
  );
}
