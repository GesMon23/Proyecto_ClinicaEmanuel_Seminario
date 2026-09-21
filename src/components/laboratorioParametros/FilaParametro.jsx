import React from 'react';
import { Button, Col, Form } from 'react-bootstrap';
import { valorParametroValido } from './parametros';

const BOTON = 'w-full sm:w-auto flex items-center justify-center text-white font-semibold py-2 px-4 rounded shadow-md';
const CIRCULO = 'w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center ml-2';

// Un parámetro numérico del laboratorio. Los que vienen del historial están bloqueados hasta pulsar "Actualizar";
// los agregados a mano se pueden eliminar.
//   lab: el objeto de useLaboratorio  ·  esUltimo: es el último parámetro de la lista (muestra "Agregar")
export default function FilaParametro({ parametro: { label, param }, lab, esUltimo, onAgregar }) {
  const bloqueado = Boolean(lab.bloqueados[param]);
  const extra = lab.esExtra(param);

  const alEscribir = (e) => {
    const raw = (e.target.value ?? '').trim();
    if (raw === '') return lab.cambiar(param, '');
    if (!valorParametroValido(raw)) return undefined; // se ignoran los cambios inválidos
    const num = parseFloat(raw);
    return Number.isNaN(num) ? undefined : lab.cambiar(param, Math.max(0, num).toString());
  };

  return (
    <Col md={6} sm={12} xs={12} className="mb-3">
      <Form.Group>
        <Form.Label className="dark:text-gray-300">{label}</Form.Label>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          <Form.Control
            type="number" inputMode="decimal" step="0.01" min="0"
            value={lab.valores[param] || ''}
            onChange={alEscribir}
            onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
            onPaste={(e) => { if (/^[-+]/.test((e.clipboardData.getData('text') || '').trim())) e.preventDefault(); }}
            placeholder={`Ingrese ${label.toLowerCase()}`}
            className={`w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 ${bloqueado ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-90' : ''}`}
            readOnly={bloqueado}
          />
          {lab.fechas[param] && (
            <div className="flex items-center sm:ml-2">
              <span
                className="inline-flex items-center gap-2 py-1.5 px-3 rounded shadow-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-700/60 font-semibold"
                title="Fecha del laboratorio de origen"
              >
                <span className="leading-none">📅</span>
                <span className="leading-none text-sm">{lab.fechas[param]}</span>
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:flex md:flex-row md:flex-wrap md:gap-2 md:w-auto md:ml-2">
            {bloqueado ? (
              <Button className={`${BOTON} bg-blue-700 hover:bg-blue-800`} onClick={() => lab.bloquear(param, false)} title="Actualizar este campo">
                Actualizar
              </Button>
            ) : (
              <>
                <Button className={`${BOTON} bg-emerald-700 hover:bg-emerald-800`} onClick={() => lab.bloquear(param, true)} title="Finalizar edición de este campo">
                  Listo
                </Button>
                <Button className={`${BOTON} bg-red-600 hover:bg-red-700`} onClick={() => lab.restaurar(param)} title="Cancelar edición y restaurar valor anterior">
                  Cancelar
                </Button>
              </>
            )}
            {extra && (
              <>
                <Button className={`${BOTON} bg-red-700 hover:bg-red-800`} onClick={() => lab.eliminarParametro(param)} title="Eliminar este parámetro">
                  Eliminar
                  <span className={CIRCULO}><i className="fas fa-times text-white text-xs font-bold" /></span>
                </Button>
                {esUltimo && (
                  <Button className={`${BOTON} bg-green-700 hover:bg-green-800`} onClick={onAgregar} title="Agregar nuevo parámetro">
                    Agregar
                    <span className={CIRCULO}><i className="nc-icon nc-simple-add text-white text-xs" /></span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </Form.Group>
    </Col>
  );
}
