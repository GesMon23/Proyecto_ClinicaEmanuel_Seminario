// Pantalla de Estadísticas. Una fila de filtros global (período y sexo) arriba de todo: cada panel
// muestra a qué período corresponde y se recalcula con los mismos filtros.
import React, { useState } from 'react';
import { usePestanas } from '@/hooks/usePestanas';
import { Fecha, FilaFiltros, Selector } from './componentes';
import PanelNutricion from './PanelNutricion';
import PanelPacientes from './PanelPacientes';
import PanelPsicologia from './PanelPsicologia';
import { PERIODOS, PERIODO_INICIAL, rangoDe } from './periodos';

const SEXOS = [['M', 'Masculino'], ['F', 'Femenino']];

export default function Estadisticas() {
  const [periodo, setPeriodo] = useState(PERIODO_INICIAL);
  const [personalizado, setPersonalizado] = useState({ desde: '', hasta: '' });
  const [sexo, setSexo] = useState('');
  // Cada panel es una "pestaña" con su propio permiso
  const { visibles } = usePestanas('estadisticas');
  const ve = (panel) => visibles.some((p) => p.clave === panel);

  // null mientras el período personalizado esté incompleto: los paneles conservan lo que muestran
  const rango = rangoDe(periodo, personalizado);
  const rangoInvalido = periodo === 'personalizado' && personalizado.desde && personalizado.hasta && !rango;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h1 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-slate-50">Estadísticas</h1>
        <FilaFiltros>
          <Selector
            etiqueta="Período" valor={periodo} onCambio={setPeriodo} todos={null}
            opciones={PERIODOS.map((p) => [p.valor, p.etiqueta])}
          />
          {periodo === 'personalizado' && (
            <>
              <Fecha etiqueta="Desde" valor={personalizado.desde} onCambio={(v) => setPersonalizado((p) => ({ ...p, desde: v }))} />
              <Fecha etiqueta="Hasta" valor={personalizado.hasta} onCambio={(v) => setPersonalizado((p) => ({ ...p, hasta: v }))} />
            </>
          )}
          <Selector etiqueta="Sexo" valor={sexo} onCambio={setSexo} opciones={SEXOS} />
        </FilaFiltros>
        {rangoInvalido && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">La fecha inicial debe ser anterior o igual a la final.</p>
        )}
        {ve('pacientes') && (ve('nutricion') || ve('psicologia')) && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            El período aplica a Nutrición y Psicología; Pacientes muestra la situación actual.
          </p>
        )}
      </div>

      {ve('pacientes') && <PanelPacientes sexo={sexo} />}
      {ve('nutricion') && <PanelNutricion rango={rango} sexo={sexo} />}
      {ve('psicologia') && <PanelPsicologia rango={rango} sexo={sexo} />}
    </div>
  );
}
