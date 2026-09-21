// Contenido de cada pestaña de la ficha del paciente. Cada una recibe su lista ya cargada y maneja su propio
// buscador, paginación y ventana de detalle.
import React, { useState } from 'react';
import api from '@/config/api';
import { formatearFecha, calcularEstanciaRango } from '@/utils/fechas';
import { calcularEdad } from './calculos';
import TablaPaginada, { BotonDetalle } from './TablaPaginada';
import {
  DetalleFaltista, DetalleFormulario, DetalleLaboratorio, DetalleNutricion, DetallePsicologia, DetalleTurno,
} from './detalles';

const GRIS = 'text-gray-500 dark:text-gray-400';

export function DatosPersonales({ paciente }) {
  const campos = [
    ['No. Afiliación', paciente.no_afiliacion],
    ['DPI', paciente.dpi],
    ['No. Paciente Proveedor', paciente.no_paciente_proveedor],
    ['Primer Nombre', paciente.primer_nombre],
    ['Segundo Nombre', paciente.segundo_nombre],
    ['Otros Nombres', paciente.otros_nombres],
    ['Primer Apellido', paciente.primer_apellido],
    ['Segundo Apellido', paciente.segundo_apellido],
    ['Apellido de Casada', paciente.apellido_casada],
    ['Edad', paciente.edad || calcularEdad(paciente.fecha_nacimiento)],
    ['Fecha de Nacimiento', formatearFecha(paciente.fecha_nacimiento)],
    ['Sexo', paciente.sexo],
    ['Dirección', paciente.direccion],
    ['Fecha Ingreso', formatearFecha(paciente.fecha_ingreso)],
    ['Departamento', paciente.departamento_nombre],
    ['Estado', paciente.estado_descripcion],
    ['Acceso Vascular', paciente.acceso_descripcion],
    ['Número de Formulario Activo', paciente.numero_formulario_activo],
    ['Jornada', paciente.jornada_descripcion],
    ['Sesiones Autorizadas Mes', paciente.sesiones_autorizadas_mes],
    ['Fecha Registro', formatearFecha(paciente.fecha_registro)],
    ['Usuario Creación', paciente.usuario_creacion],
    ['Fecha Creación', formatearFecha(paciente.fecha_creacion)],
    ['Inicio Prestación Servicios', formatearFecha(paciente.inicio_prest_servicios)],
    ['Fin Prestación Servicios', formatearFecha(paciente.fin_prest_servicios)],
    ['Estancia Programa', calcularEstanciaRango(paciente.fecha_ingreso)],
  ];
  return (
    <section id="panel-Datos-Personales" role="tabpanel" className="w-full mb-10">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-green-50/60 dark:from-slate-800 dark:to-slate-800/60 shadow-sm p-6 md:p-8">
        <h4 className="text-xl font-bold text-green-800 dark:text-green-300 mb-4">Datos Personales</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campos.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="rounded-lg bg-white/70 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 p-3">
              <div className={`text-xs uppercase tracking-wide ${GRIS}`}>{etiqueta}</div>
              <div className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">{valor || '-'}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Historial({ items }) {
  return (
    <TablaPaginada
      id="Historial" marcador="Buscar en historial..." items={items} altoMax={420}
      claves={['numero_gestion', 'estado', 'no_formulario', 'descripcion', 'observaciones', 'causa_egreso', 'periodo']}
      columnas={[
        { titulo: 'Numero de Gestión', celda: (h, n) => h.numero_gestion ?? n + 1 },
        { titulo: 'Estado', celda: (h) => h.estado || '' },
        { titulo: 'No. Formulario', celda: (h) => h.no_formulario || '' },
        { titulo: 'Fecha', celda: (h) => formatearFecha(h.fecha) || '' },
        { titulo: 'Observaciones', celda: (h) => h.observaciones || '' },
        { titulo: 'Periodo', celda: (h) => h.periodo || '' },
        { titulo: 'Causa Egreso', celda: (h) => h.causa_egreso || '' },
        { titulo: 'Descripcion', celda: (h) => h.descripcion || '' },
      ]}
    />
  );
}

export function Referencias({ items }) {
  return (
    <TablaPaginada
      id="Referencias" marcador="Buscar en referencias..." items={items} altoMax={420}
      filaKey={(r, i) => r.id_referencia || i}
      claves={['id_referencia', 'fecha_referencia', 'motivo_traslado', 'nombre_medico', 'id_medico', 'especialidad_referencia']}
      columnas={[
        { titulo: 'ID Referencia', celda: (r) => r.id_referencia || '' },
        { titulo: 'Fecha Referencia', celda: (r) => formatearFecha(r.fecha_referencia) || '' },
        { titulo: 'Motivo Traslado', celda: (r) => r.motivo_traslado || '' },
        { titulo: 'Médico', celda: (r) => r.nombre_medico || r.id_medico || '' },
        { titulo: 'Especialidad Referencia', celda: (r) => r.especialidad_referencia || '' },
      ]}
    />
  );
}

export function Nutricion({ items }) {
  const [detalle, setDetalle] = useState(null);
  return (
    <>
      <TablaPaginada
        id="Nutrición" marcador="Buscar en nutrición..." items={items} altoMax={420}
        filaKey={(n, i) => n.id_informe || i}
        claves={['id_informe', 'motivo_consulta', 'estado_nutricional', 'observaciones', 'altura_cm', 'peso_kg', 'imc', 'usuario_creacion', 'fecha_creacion']}
        columnas={[
          { titulo: 'ID Informe', celda: (n) => n.id_informe || '' },
          { titulo: 'Motivo Consulta', celda: (n) => n.motivo_consulta || '' },
          { titulo: 'Estado Nutricional', celda: (n) => n.estado_nutricional || '' },
          { titulo: 'Observaciones', celda: (n) => n.observaciones || '' },
          { titulo: 'Altura (Cm)', celda: (n) => n.altura_cm ?? '' },
          { titulo: 'Peso (kg)', celda: (n) => n.peso_kg ?? '' },
          { titulo: 'IMC', celda: (n) => n.imc ?? '' },
          { titulo: 'Fecha', celda: (n) => formatearFecha(n.fecha_creacion) || '' },
          { titulo: 'Usuario', celda: (n) => n.usuario_creacion || '' },
          { titulo: 'Acciones', celda: (n) => <BotonDetalle onClick={() => setDetalle(n)} /> },
        ]}
      />
      {detalle && <DetalleNutricion item={detalle} onClose={() => setDetalle(null)} />}
    </>
  );
}

export function Psicologia({ items }) {
  const [detalle, setDetalle] = useState(null);
  return (
    <>
      <TablaPaginada
        id="Psicologia" marcador="Buscar en psicología..." items={items}
        vacio="No hay informes para mostrar." filaKey={(it, i) => it.id_informe || i}
        claves={['id_informe', 'motivo_consulta', 'tipo_consulta', 'observaciones', 'tipo_atencion', 'pronostico', 'kdqol']}
        columnas={[
          { titulo: '#', celda: (it, n) => <span className={GRIS}>{n + 1}</span> },
          { titulo: 'ID Informe', celda: (it) => it.id_informe ?? '' },
          { titulo: 'Fecha', celda: (it) => formatearFecha(it.fecha_creacion) },
          { titulo: 'Motivo', celda: (it) => it.motivo_consulta ?? '' },
          { titulo: 'Tipo Consulta', celda: (it) => it.tipo_consulta ?? '' },
          { titulo: 'Tipo Atención', celda: (it) => it.tipo_atencion ?? '' },
          { titulo: 'Pronóstico', celda: (it) => it.pronostico_paciente ?? it.pronostico ?? '' },
          { titulo: 'Usuario', celda: (it) => it.usuario_creacion ?? '' },
          { titulo: 'Acciones', celda: (it) => <BotonDetalle onClick={() => setDetalle(it)} /> },
        ]}
      />
      {detalle && <DetallePsicologia item={detalle} onClose={() => setDetalle(null)} />}
    </>
  );
}

export function Formularios({ items }) {
  const [detalle, setDetalle] = useState(null);
  return (
    <>
      <TablaPaginada
        id="Formularios" marcador="Buscar en formularios..." items={items} altoMax={420}
        filaKey={(f, i) => f.id_historial || i}
        claves={['numero_formulario', 'sesiones_autorizadas_mes', 'sesiones_realizadas_mes', 'sesiones_no_realizadas_mes', 'inicio_prest_servicios', 'fin_prest_servicios', 'id_historial']}
        columnas={[
          { titulo: 'Número Formulario', celda: (f) => f.numero_formulario || '' },
          { titulo: 'Sesiones Autorizadas (Mensuales)', celda: (f) => f.sesiones_autorizadas_mes ?? '' },
          { titulo: 'Inicio Prestaciones Servicios', celda: (f) => formatearFecha(f.inicio_prest_servicios) || '' },
          { titulo: 'Fin Prestaciones Servicios', celda: (f) => formatearFecha(f.fin_prest_servicios) || '' },
          { titulo: 'ID Historial', celda: (f) => f.id_historial ?? '' },
          { titulo: 'Acciones', celda: (f) => <BotonDetalle onClick={() => setDetalle(f)} /> },
        ]}
      />
      {detalle && <DetalleFormulario item={detalle} onClose={() => setDetalle(null)} />}
    </>
  );
}

export function Turnos({ items }) {
  const [detalle, setDetalle] = useState(null);
  return (
    <>
      <TablaPaginada
        id="Turnos" marcador="Buscar en turnos..." items={items} tamanos={[3, 5, 10, 15]}
        filaKey={(t, i) => t.id_turno || i}
        claves={['noafiliacion', 'nombrepaciente', 'id_turno_cod', 'id_turno', 'nombre_clinica', 'fecha_turno']}
        columnas={[
          { titulo: 'Código Turno', celda: (t) => t.id_turno_cod || t.id_turno },
          { titulo: 'Clínica', celda: (t) => t.nombre_clinica },
          { titulo: 'Fecha', celda: (t) => formatearFecha(t.fecha_turno) },
          { titulo: 'Acciones', celda: (t) => <BotonDetalle onClick={() => setDetalle(t)} /> },
        ]}
      />
      {detalle && <DetalleTurno item={detalle} onClose={() => setDetalle(null)} />}
    </>
  );
}

export function Faltistas({ items }) {
  const [detalle, setDetalle] = useState(null);
  return (
    <>
      <TablaPaginada
        id="Faltistas" marcador="Buscar en faltistas..." items={items} tamanos={[5, 10, 20]}
        filaKey={(f, i) => (f.noafiliacion || '') + (f.fechafalta || '') + i}
        claves={['noafiliacion', 'nombres', 'apellidos', 'sexo', 'jornada', 'accesovascular', 'departamento', 'clinica', 'fechafalta']}
        columnas={[
          { titulo: 'Clínica', celda: (f) => f.clinica || '' },
          { titulo: 'Fecha Falta', celda: (f) => formatearFecha(f.fechafalta) },
        ]}
      />
      {detalle && <DetalleFaltista item={detalle} onClose={() => setDetalle(null)} />}
    </>
  );
}

const SIN_ULTIMOS = { loading: false, error: '', data: [] };

export function Laboratorios({ items }) {
  const [detalle, setDetalle] = useState(null);
  const [ultimos, setUltimos] = useState(SIN_ULTIMOS);

  // Al abrir un laboratorio se cargan los últimos parámetros previos del paciente
  const abrir = (item) => {
    setDetalle(item);
    const afiliacion = item?.no_afiliacion || item?.noafiliacion || '';
    if (!afiliacion) return setUltimos(SIN_ULTIMOS);
    setUltimos({ loading: true, error: '', data: [] });
    api.get(`/laboratorios/${afiliacion}/parametros/ultimo`)
      .then(({ data }) => setUltimos({ loading: false, error: '', data: Array.isArray(data?.data) ? data.data : [] }))
      .catch(() => setUltimos({ loading: false, error: 'No se pudieron cargar los últimos parámetros.', data: [] }));
  };
  const cerrar = () => { setDetalle(null); setUltimos(SIN_ULTIMOS); };

  return (
    <>
      <TablaPaginada
        id="Laboratorios" marcador="Buscar en laboratorios..." items={items} tamanos={[5, 10, 20]}
        filaKey={(it, i) => `${it.id_laboratorio || ''}-${i}`}
        claves={['no_afiliacion', 'id_laboratorio', 'periodicidad', 'virologia', 'hiv', 'sexo', 'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido', 'primernombre', 'segundonombre', 'primerapellido', 'segundoapellido']}
        columnas={[
          { titulo: 'ID Lab', celda: (it) => it.id_laboratorio ?? it.idlaboratorio ?? '' },
          { titulo: 'Fecha', celda: (it) => formatearFecha(it.fecha_laboratorio ?? it.fecha ?? '') },
          { titulo: 'Periodicidad', celda: (it) => it.periodicidad || '' },
          { titulo: 'Examen', celda: (it) => (it.examen_realizado ? 'Sí' : 'No') },
          { titulo: 'Virología', celda: (it) => it.virologia || '' },
          { titulo: 'HIV', celda: (it) => it.hiv || '' },
          { titulo: 'Acciones', celda: (it) => <BotonDetalle onClick={() => abrir(it)} /> },
        ]}
      />
      {detalle && <DetalleLaboratorio item={detalle} ultimos={ultimos} onClose={cerrar} />}
    </>
  );
}
