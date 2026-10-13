// Panel de pacientes: situación actual (no depende del período). Filtros propios: estado, acceso y jornada.
import React, { useEffect, useState } from 'react';
import { FilaCifras, FilaFiltros, RejillaGraficas, Seccion, Selector, TarjetaCifra, TarjetaGrafica } from './componentes';
import { usePanel } from './usePanel';

const FILTROS_VACIOS = { estado: '', acceso: '', jornada: '' };
const SERIES_DE_FILTRO = { estado: 'porEstado', acceso: 'porAcceso', jornada: 'porJornada' };

// Opciones de los filtros: lo visto en las respuestas (se acumula para que un filtro no esconda las demás)
function acumularOpciones(previas, datos) {
  const siguientes = { ...previas };
  for (const [filtro, serie] of Object.entries(SERIES_DE_FILTRO)) {
    const nombres = new Set([...previas[filtro], ...(datos[serie] || []).map((f) => f.nombre).filter((n) => n !== 'Sin dato')]);
    siguientes[filtro] = [...nombres].sort((a, b) => a.localeCompare(b, 'es'));
  }
  return siguientes;
}

export default function PanelPacientes({ sexo }) {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [opciones, setOpciones] = useState({ estado: [], acceso: [], jornada: [] });
  const { datos, cargando, error } = usePanel('pacientes', { ...filtros, sexo });

  useEffect(() => { if (datos) setOpciones((o) => acumularOpciones(o, datos)); }, [datos]);

  const cambiar = (clave) => (valor) => setFiltros((f) => ({ ...f, [clave]: valor }));
  const opcionesDe = (clave) => opciones[clave].map((n) => [n, n]);

  return (
    <Seccion
      titulo="Pacientes"
      subtitulo="Situación actual de los pacientes registrados · no depende del período"
      cargando={cargando}
      error={error}
      filtros={(
        <FilaFiltros>
          <Selector etiqueta="Estado" valor={filtros.estado} onCambio={cambiar('estado')} opciones={opcionesDe('estado')} />
          <Selector etiqueta="Acceso vascular" valor={filtros.acceso} onCambio={cambiar('acceso')} opciones={opcionesDe('acceso')} />
          <Selector etiqueta="Jornada" valor={filtros.jornada} onCambio={cambiar('jornada')} opciones={opcionesDe('jornada')} />
        </FilaFiltros>
      )}
    >
      {datos && (
        <>
          <FilaCifras>
            <TarjetaCifra etiqueta="Pacientes" valor={datos.total} />
            <TarjetaCifra etiqueta="Dentro del programa" valor={datos.programa.dentro} nota="Activo, nuevo ingreso o reingreso" />
            <TarjetaCifra etiqueta="Fuera del programa" valor={datos.programa.fuera} nota="Egresados" />
          </FilaCifras>
          <RejillaGraficas>
            <TarjetaGrafica titulo="Por estado" datos={datos.porEstado} etiquetaValor="Pacientes" />
            <TarjetaGrafica titulo="Por acceso vascular" datos={datos.porAcceso} etiquetaValor="Pacientes" />
            <TarjetaGrafica titulo="Por jornada" datos={datos.porJornada} etiquetaValor="Pacientes" />
            <TarjetaGrafica titulo="Por sexo" datos={datos.porSexo} etiquetaValor="Pacientes" />
            <TarjetaGrafica titulo="Por departamento" datos={datos.porDepartamento} etiquetaValor="Pacientes" ancho />
          </RejillaGraficas>
        </>
      )}
    </Seccion>
  );
}
