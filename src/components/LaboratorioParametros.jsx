// Componente para ingresar resultados de laboratorio por paciente
import React, { useRef } from "react";
import CustomModal from '@/components/CustomModal.jsx';
import { BOTON_LIMPIAR, BOTON_PRINCIPAL } from '@/constants/botones';
import { CAMPO, ETIQUETA } from '@/constants/formularios';
import { useAviso } from '@/hooks/useAviso';
import { cn } from '@/utils/cn';
import { CampoLab, SelectPeriodicidad } from './laboratorioParametros/CampoLab';
import SeccionExamen from './laboratorioParametros/SeccionExamen';
import { useLaboratorio } from './laboratorioParametros/useLaboratorio';

function LaboratorioParametros({ onSubmit }) {
  const { modal, mostrar } = useAviso();
  const lab = useLaboratorio({ mostrarAviso: mostrar, alGuardar: onSubmit });
  const refAfiliacion = useRef(null);
  const { valores, paciente } = lab;
  const campo = (name) => ({ value: valores[name] || '', onChange: (e) => lab.cambiar(name, e.target.value) });

  // Tras guardar, el foco vuelve al campo de No. Afiliación para el siguiente paciente
  const guardar = async (e) => {
    await lab.guardar(e);
    setTimeout(() => refAfiliacion.current?.focus(), 0);
  };

  return (
    <>
      <CustomModal {...modal} />
      <form onSubmit={guardar} className="space-y-6">
        {/* Búsqueda del paciente */}
        <div>
          <label htmlFor="lab-afiliacion" className={ETIQUETA}>No. Afiliación <span className="text-rose-500">*</span></label>
          <div className="mt-1 flex flex-col sm:flex-row gap-3">
            <input
              id="lab-afiliacion"
              type="text"
              value={lab.noAfiliacion}
              onChange={(e) => lab.setNoAfiliacion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lab.buscar(); } }}
              required
              placeholder="Ingrese número de afiliación"
              className={cn(CAMPO, 'mt-0 sm:max-w-md')}
              ref={refAfiliacion}
            />
            <button type="button" className={cn(BOTON_PRINCIPAL, 'w-full sm:w-auto')} onClick={lab.buscar}>Buscar</button>
            <button type="button" className={cn(BOTON_LIMPIAR, 'w-full sm:w-auto')} onClick={lab.limpiar}>Limpiar</button>
          </div>
        </div>

        {paciente && (
          <div className="rounded-xl border border-green-700 bg-green-50 px-4 py-3 text-center text-xl font-semibold tracking-wide text-green-900 dark:border-green-500 dark:bg-green-900/30 dark:text-green-100">
            {paciente}
          </div>
        )}

        {paciente && (
          <section className="rounded-xl border border-slate-200 p-4 sm:p-6 dark:border-slate-700 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CampoLab etiqueta="Examen realizado" requerido opciones={['Sí', 'No']} {...campo('examen_realizado')} />
              <CampoLab etiqueta="Fecha de laboratorio" requerido tipo="date" {...campo('fecha_laboratorio')} />
              <SelectPeriodicidad {...campo('idPerLaboratorio')} />
            </div>

            {/* "No": solo la causa */}
            {valores.examen_realizado === 'No' && (
              <CampoLab
                etiqueta="Causa de no realizado" requerido tipo="textarea" rows={4}
                placeholder="Indique por qué no se realizó el examen" {...campo('causa_no_realizado')}
              />
            )}

            {/* "Sí": parámetros y demás resultados */}
            {valores.examen_realizado === 'Sí' && <SeccionExamen lab={lab} />}
          </section>
        )}

        {lab.error && <p role="alert" className="text-red-600 dark:text-red-400 font-medium">{lab.error}</p>}

        {paciente && (
          <div className="flex justify-end">
            <button type="submit" className={BOTON_PRINCIPAL} disabled={lab.guardando}>
              {lab.guardando ? 'Guardando...' : 'Guardar resultados'}
            </button>
          </div>
        )}
      </form>
    </>
  );
}

export default LaboratorioParametros;
