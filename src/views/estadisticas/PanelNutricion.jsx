// Panel de nutrición: informes del período. Filtro propio: motivo de consulta.
import React, { useState } from 'react';
import { CATEGORIAS_IMC } from '@/utils/imc';
import { FilaCifras, FilaFiltros, RejillaGraficas, Seccion, Selector, TarjetaCifra, TarjetaGrafica } from './componentes';
import { describirRango } from './periodos';
import { usePanel } from './usePanel';

const MOTIVOS = [['Nuevo', 'Nuevo'], ['Reconsulta', 'Reconsulta']];
const ORDEN_OMS = CATEGORIAS_IMC.map((c) => c.nombre);

// Categorías de la OMS en su orden y con su color (el mismo de la escala del IMC); otras al final en el color de la serie
const estadosNutricionales = (filas) => filas
  .map((f) => ({ ...f, color: CATEGORIAS_IMC.find((c) => c.nombre === f.nombre)?.color }))
  .sort((a, b) => {
    const ia = ORDEN_OMS.indexOf(a.nombre);
    const ib = ORDEN_OMS.indexOf(b.nombre);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

export default function PanelNutricion({ rango, sexo }) {
  const [motivo, setMotivo] = useState('');
  const { datos, cargando, error } = usePanel('nutricion', rango && { ...rango, sexo, motivo });

  return (
    <Seccion
      titulo="Nutrición"
      subtitulo={`Informes de nutrición · ${describirRango(rango)}`}
      cargando={cargando}
      error={error}
      filtros={(
        <FilaFiltros>
          <Selector etiqueta="Motivo de consulta" valor={motivo} onCambio={setMotivo} opciones={MOTIVOS} />
        </FilaFiltros>
      )}
    >
      {datos && (
        <>
          <FilaCifras>
            <TarjetaCifra etiqueta="Informes" valor={datos.total} />
            <TarjetaCifra etiqueta="IMC promedio" valor={datos.promedios.imc} decimales={2} nota="kg/m²" />
            <TarjetaCifra etiqueta="Peso promedio" valor={datos.promedios.peso} decimales={2} nota="kg" />
            <TarjetaCifra etiqueta="Altura promedio" valor={datos.promedios.altura} decimales={2} nota="cm" />
          </FilaCifras>
          <RejillaGraficas>
            <TarjetaGrafica
              titulo="Por estado nutricional" nota="Clasificación del IMC según la OMS"
              datos={estadosNutricionales(datos.porEstadoNutricional)}
            />
            <TarjetaGrafica titulo="Por jornada" datos={datos.porJornada} />
            <TarjetaGrafica titulo="Por sexo" datos={datos.porSexo} />
            <TarjetaGrafica titulo="Por motivo de consulta" datos={datos.porMotivo} />
          </RejillaGraficas>
        </>
      )}
    </Seccion>
  );
}
