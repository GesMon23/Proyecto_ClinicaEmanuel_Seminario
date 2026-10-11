import React from 'react';
import { Button } from 'react-bootstrap';
import IndicadorIMC from '@/components/IndicadorIMC';
import { calcularIMC } from '@/utils/imc';

const ETIQUETA = 'block text-sm font-medium text-slate-700 dark:text-slate-200';
const CAMPO = 'mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100';
const OBLIGATORIO = <span className="text-rose-500">*</span>;

function Medida({ etiqueta, valor, placeholder, onCambio }) {
  return (
    <div>
      <label className={ETIQUETA}>{etiqueta} {OBLIGATORIO}</label>
      <input
        type="number"
        step="0.1"
        min="0"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
        placeholder={placeholder}
        required
        className={CAMPO}
      />
    </div>
  );
}

// Datos antropométricos y de la consulta; `onCambio(campo, valor)` y `onGuardar` vienen de la pantalla
export default function FormularioNutricion({ form, onCambio, onMedida, onGuardar }) {
  return (
    <>
      <hr className="my-6 border-gray-300 dark:border-gray-600" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Medida etiqueta="Altura (CM)" valor={form.alturaCm} placeholder="Ingrese la altura en centímetros" onCambio={(v) => onMedida('alturaCm', v)} />
        <Medida etiqueta="Peso (KG)" valor={form.pesoKg} placeholder="Ingrese el peso en kilogramos" onCambio={(v) => onMedida('pesoKg', v)} />
      </div>
      <div className="mt-4">
        <label className={ETIQUETA}>Estado Nutricional</label>
        <div className="mt-1">
          <IndicadorIMC imc={calcularIMC(form.alturaCm, form.pesoKg)} />
        </div>
      </div>

      <hr className="my-6 border-gray-300 dark:border-gray-600" />
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className={ETIQUETA}>Motivo de Consulta {OBLIGATORIO}</label>
          <select value={form.motivoConsulta} onChange={(e) => onCambio('motivoConsulta', e.target.value)} required className={CAMPO}>
            <option value="">Seleccionar...</option>
            <option value="Nuevo">Nuevo</option>
            <option value="Reconsulta">Reconsulta</option>
          </select>
        </div>
        <div>
          <label className={ETIQUETA}>Observaciones (opcional)</label>
          <textarea
            value={form.observaciones}
            onChange={(e) => onCambio('observaciones', e.target.value)}
            rows="3"
            placeholder="Ingrese observaciones relevantes (opcional)"
            className={CAMPO}
          />
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <Button
            type="button"
            className="!w-full sm:!w-56 !px-8 !py-3 !bg-blue-700 hover:!bg-blue-800 !text-white !text-lg !font-semibold !rounded-lg shadow-md transition duration-200 focus:!ring-2 focus:!ring-blue-600"
            onClick={onGuardar}
          >
            Guardar Resultados
          </Button>
        </div>
      </div>
    </>
  );
}
