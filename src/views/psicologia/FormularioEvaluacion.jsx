import React from 'react';
import { Button } from 'react-bootstrap';
import { AREAS_KDQOL, promedioKdqol } from './psicologia';

const CLASE = 'mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600';
const ETIQUETA = 'block text-sm font-medium text-slate-700 dark:text-slate-200';
const Asterisco = () => <span className="text-rose-500">*</span>;

const Campo = ({ etiqueta, requerido, children }) => (
  <div>
    <label className={ETIQUETA}>{etiqueta} {requerido && <Asterisco />}</label>
    {children}
  </div>
);

const Opciones = ({ lista }) => lista.map((o) => <option key={o} value={o}>{o}</option>);

// Formulario de la evaluación psicológica (después de encontrar al paciente).
//   ev: valores  ·  onCambio(campo, valor)  ·  onPuntaje(campo, valor): campos KDQOL con formato validado
export default function FormularioEvaluacion({ ev, onCambio, onPuntaje }) {
  const conKdqol = ev.aplicacion_kdqol === 'Si';
  // Las observaciones aparecen al terminar el KDQOL (o si no se aplicó)
  const mostrarObservaciones = ev.aplicacion_kdqol === 'No' || (conKdqol && ev.vida_diaria);

  return (
    <>
      <hr className="my-6 border-gray-300 dark:border-gray-600" />
      <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">Evaluación Psicológica</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Campo etiqueta="Tipo de Consulta" requerido>
          <select value={ev.tipo_consulta} onChange={(e) => onCambio('tipo_consulta', e.target.value)} required className={CLASE}>
            <Opciones lista={['Consulta', 'Reconsulta']} />
          </select>
        </Campo>
        <Campo etiqueta="Motivo de Consulta" requerido>
          <input
            type="text" value={ev.motivo_consulta} onChange={(e) => onCambio('motivo_consulta', e.target.value)}
            placeholder="Describa el motivo de la consulta psicológica" required className={CLASE}
          />
        </Campo>
        <Campo etiqueta="Tipo de Atención" requerido>
          <select value={ev.tipo_atencion} onChange={(e) => onCambio('tipo_atencion', e.target.value)} required className={CLASE}>
            <Opciones lista={['Resiliente', 'Inmediata', 'Media']} />
          </select>
        </Campo>
        <div>
          <label className={`${ETIQUETA} mb-3`}>Aplicación de KDQOL <Asterisco /></label>
          <div className="flex gap-6">
            {['Si', 'No'].map((v) => (
              <div key={v} className="flex items-center">
                <input
                  type="radio" id={`kdqol_${v.toLowerCase()}`} name="aplicacion_kdqol" value={v}
                  checked={ev.aplicacion_kdqol === v} onChange={(e) => onCambio('aplicacion_kdqol', e.target.value)} required
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600"
                />
                <label htmlFor={`kdqol_${v.toLowerCase()}`} className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-200">{v}</label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {conKdqol && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {AREAS_KDQOL.map(({ campo, etiqueta }, i) => {
            const anterior = i > 0 ? ev[AREAS_KDQOL[i - 1].campo] : true;
            return (
              <Campo key={campo} etiqueta={etiqueta} requerido>
                <input
                  type="number" step="0.01" min="0" max="999.99" value={ev[campo]}
                  onChange={(e) => onPuntaje(campo, e.target.value)}
                  required={Boolean(anterior)} disabled={!anterior}
                  onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                  onPaste={(e) => { if (/^-/.test((e.clipboardData.getData('text') || '').trim())) e.preventDefault(); }}
                  className={`${CLASE} disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed`}
                />
              </Campo>
            );
          })}
          <Campo etiqueta="Promedio KDQOL">
            <input
              type="text" readOnly value={promedioKdqol(ev)}
              placeholder="Se calcula automáticamente cuando las 5 áreas están completas"
              className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            />
          </Campo>
        </div>
      )}

      <div className="mt-4">
        <Campo etiqueta="Pronóstico del Paciente" requerido>
          <select value={ev.pronostico_paciente} onChange={(e) => onCambio('pronostico_paciente', e.target.value)} required className={CLASE}>
            <option value="">Seleccionar...</option>
            <Opciones lista={['Desfavorable', 'Intermedio', 'Favorable']} />
          </select>
        </Campo>
      </div>

      {mostrarObservaciones && (
        <div className="mt-4">
          <Campo etiqueta="Observaciones (opcional)">
            <textarea
              value={ev.observaciones} onChange={(e) => onCambio('observaciones', e.target.value)} rows="4"
              placeholder="Ingrese las observaciones de la evaluación psicológica (opcional)" className={CLASE}
            />
          </Campo>
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <Button
            type="submit"
            className="!w-full sm:!w-56 !px-8 !py-3 !bg-blue-700 hover:!bg-blue-800 !text-white !text-lg !font-semibold !rounded-lg shadow-md transition duration-200 focus:!ring-2 focus:!ring-blue-600"
          >
            Guardar Evaluación
          </Button>
        </div>
      </div>
    </>
  );
}
