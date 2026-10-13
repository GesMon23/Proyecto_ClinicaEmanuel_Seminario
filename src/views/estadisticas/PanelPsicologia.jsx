// Panel de psicología: informes del período y resultados KDQOL.
import React from 'react';
import { AREAS_KDQOL } from '@/views/psicologia/psicologia';
import { FilaCifras, RejillaGraficas, Seccion, TarjetaCifra, TarjetaGrafica } from './componentes';
import { describirRango } from './periodos';
import { usePanel } from './usePanel';

const ETIQUETA_AREA = Object.fromEntries(AREAS_KDQOL.map((a) => [a.campo, a.etiqueta]));

export default function PanelPsicologia({ rango, sexo }) {
  const { datos, cargando, error } = usePanel('psicologia', rango && { ...rango, sexo });
  const promediosKdqol = (datos?.kdqol.promedios || [])
    .filter((p) => p.valor !== null)
    .map((p) => ({ nombre: ETIQUETA_AREA[p.campo] || p.campo, total: p.valor, valor: p.valor }));

  return (
    <Seccion titulo="Psicología" subtitulo={`Informes de psicología · ${describirRango(rango)}`} cargando={cargando} error={error}>
      {datos && (
        <>
          <FilaCifras>
            <TarjetaCifra etiqueta="Informes" valor={datos.total} />
            <TarjetaCifra etiqueta="Evaluaciones KDQOL" valor={datos.kdqol.total} />
            <TarjetaCifra etiqueta="Promedio KDQOL" valor={datos.kdqol.global} decimales={2} nota="Promedio de las 5 áreas" />
          </FilaCifras>
          <RejillaGraficas>
            <TarjetaGrafica titulo="Por tipo de consulta" datos={datos.porTipo} />
            <TarjetaGrafica titulo="Por tipo de atención" datos={datos.porAtencion} />
            <TarjetaGrafica titulo="Por pronóstico" datos={datos.porPronostico} />
            <TarjetaGrafica titulo="Por jornada" datos={datos.porJornada} />
            <TarjetaGrafica titulo="Por sexo" datos={datos.porSexo} />
          </RejillaGraficas>

          <h3 className="mb-3 mt-6 text-lg font-semibold text-slate-900 dark:text-slate-50">Resultados KDQOL</h3>
          <RejillaGraficas>
            <TarjetaGrafica
              titulo="Promedio por área" nota="Puntaje promedio de las evaluaciones del período"
              datos={promediosKdqol} etiquetaValor="Promedio" decimales={2}
            />
            <TarjetaGrafica titulo="Evaluaciones por jornada" datos={datos.kdqol.porJornada} etiquetaValor="Evaluaciones" />
            <TarjetaGrafica titulo="Evaluaciones por sexo" datos={datos.kdqol.porSexo} etiquetaValor="Evaluaciones" />
          </RejillaGraficas>
        </>
      )}
    </Seccion>
  );
}
