// Ventanas de detalle de cada sección de la ficha del paciente.
import React, { useEffect } from 'react';
import { formatearFecha } from '@/utils/fechas';
import { nombreCompleto, resumenKdqol, textoPositivoNegativo } from './calculos';
import {
  imprimirFaltista, imprimirFormulario, imprimirLaboratorio, imprimirNutricion, imprimirPsicologia, imprimirReferencia, imprimirTurno,
} from './documentos';
import { useDetalleLaboratorio } from './useDetalleLaboratorio';
import IndicadorIMC from '../IndicadorIMC';

function VentanaDetalle({ titulo, onClose, onPdf, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">{titulo}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
          </div>
          <div className="space-y-4 text-sm">
            {children}
            <div className="flex justify-end gap-3">
              <button onClick={onPdf} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white">Descargar PDF</button>
              <button onClick={onClose} className="px-4 py-2 rounded-md bg-green-700 hover:bg-green-800 text-white">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Rejilla = ({ children }) => <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
const Dato = ({ etiqueta, children, ancho }) => (
  <div className={ancho ? 'md:col-span-2' : undefined}><span className="font-semibold">{etiqueta}:</span> {children}</div>
);
const Texto = ({ etiqueta, valor }) => (
  <div>
    <span className="font-semibold">{etiqueta}:</span>
    <div className="mt-1 p-2 rounded bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200">{valor || '—'}</div>
  </div>
);
const BORDE = 'border border-slate-200 dark:border-slate-700';

export function DetalleNutricion({ item, onClose }) {
  const it = item || {};
  return (
    <VentanaDetalle titulo="Detalle Nutrición" onClose={onClose} onPdf={() => imprimirNutricion(item)}>
      <Rejilla>
        {it.no_afiliacion && <Dato etiqueta="No. Afiliación">{it.no_afiliacion}</Dato>}
        {nombreCompleto(it) && <Dato etiqueta="Paciente">{nombreCompleto(it)}</Dato>}
        <Dato etiqueta="ID Informe">{it.id_informe ?? ''}</Dato>
        <Dato etiqueta="Fecha">{formatearFecha(it.fecha_creacion) || ''}</Dato>
        <Dato etiqueta="Usuario">{it.usuario_creacion ?? ''}</Dato>
        <Dato etiqueta="Motivo">{it.motivo_consulta ?? ''}</Dato>
        <Dato etiqueta="Altura (cm)">{it.altura_cm ?? ''}</Dato>
        <Dato etiqueta="Peso (kg)">{it.peso_kg ?? ''}</Dato>
      </Rejilla>
      <div>
        <span className="font-semibold">Estado Nutricional:</span>
        <div className="mt-1"><IndicadorIMC imc={it.imc} vacio="Sin IMC registrado" /></div>
      </div>
      <Texto etiqueta="Observaciones" valor={it.observaciones} />
    </VentanaDetalle>
  );
}

export function DetallePsicologia({ item, onClose }) {
  const it = item || {};
  const { kdqol, filas, promedio } = resumenKdqol(it);
  return (
    <VentanaDetalle titulo="Detalle del Informe de Psicología" onClose={onClose} onPdf={() => imprimirPsicologia(item)}>
      <Rejilla>
        <Dato etiqueta="No. Afiliación">{it.no_afiliacion || ''}</Dato>
        <Dato etiqueta="ID Informe">{it.id_informe || ''}</Dato>
        <Dato etiqueta="Paciente" ancho>{nombreCompleto(it)}</Dato>
        <Dato etiqueta="Sexo">{it.sexo ?? it.Sexo ?? ''}</Dato>
        <Dato etiqueta="Fecha">{formatearFecha(it.fecha_creacion)}</Dato>
      </Rejilla>
      <hr className="border-slate-200 dark:border-slate-700" />
      <Rejilla>
        <Dato etiqueta="Motivo">{it.motivo_consulta ?? ''}</Dato>
        <Dato etiqueta="Tipo de Consulta">{it.tipo_consulta ?? ''}</Dato>
        <Dato etiqueta="Tipo de Atención">{it.tipo_atencion ?? ''}</Dato>
        <Dato etiqueta="Pronóstico">{it.pronostico_paciente ?? it.pronostico ?? ''}</Dato>
      </Rejilla>
      <Texto etiqueta="Observaciones" valor={it.observaciones} />
      <div>
        <span className="font-semibold">KDQOL:</span>
        {kdqol?.id_kdqol != null && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span className="mr-2">ID KDQOL: {kdqol.id_kdqol ?? '—'}</span>
            <span>Fecha aplicación: {formatearFecha(kdqol.fecha_aplicacion) || '—'}</span>
          </div>
        )}
        {filas.length > 0 ? (
          <div className="mt-1 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className={`text-left ${BORDE} px-2 py-1`}>Dimensión</th>
                  <th className={`text-left ${BORDE} px-2 py-1`}>Puntaje</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((r) => (
                  <tr key={r.label}>
                    <td className={`${BORDE} px-2 py-1`}>{r.label}</td>
                    <td className={`${BORDE} px-2 py-1`}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2"><span className="font-semibold">Promedio KDQOL:</span> {promedio != null ? promedio : '—'}</div>
          </div>
        ) : (
          <div className="mt-1 p-2 rounded bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200">—</div>
        )}
      </div>
    </VentanaDetalle>
  );
}

export function DetalleFormulario({ item, onClose }) {
  const it = item || {};
  return (
    <VentanaDetalle titulo="Detalle Formulario" onClose={onClose} onPdf={() => imprimirFormulario(item)}>
      <Rejilla>
        <Dato etiqueta="No. Formulario">{it.numero_formulario ?? ''}</Dato>
        <Dato etiqueta="Registrado por">{it.usuario_creacion ?? ''}</Dato>
        <Dato etiqueta="Sesiones Autorizadas">{it.sesiones_autorizadas_mes ?? ''}</Dato>
        <Dato etiqueta="Sesiones Realizadas">{it.sesiones_realizadas_mes ?? '—'}</Dato>
        <Dato etiqueta="No Realizadas">{it.sesiones_no_realizadas_mes ?? '—'}</Dato>
        <Dato etiqueta="Inicio Prest.">{formatearFecha(it.inicio_prest_servicios) || ''}</Dato>
        <Dato etiqueta="Fin Prest.">{formatearFecha(it.fin_prest_servicios) || ''}</Dato>
      </Rejilla>
      <Texto etiqueta="Observaciones" valor={it.observaciones} />
    </VentanaDetalle>
  );
}

export function DetalleTurno({ item, onClose }) {
  const it = item || {};
  return (
    <VentanaDetalle titulo="Detalle Turno" onClose={onClose} onPdf={() => imprimirTurno(item)}>
      <Rejilla>
        <Dato etiqueta="No. Afiliación">{it.noafiliacion ?? ''}</Dato>
        <Dato etiqueta="Código Turno">{it.id_turno_cod || it.id_turno || ''}</Dato>
        <Dato etiqueta="Paciente" ancho>{it.nombrepaciente || ''}</Dato>
        <Dato etiqueta="Clínica">{it.nombre_clinica || ''}</Dato>
        <Dato etiqueta="Fecha">{formatearFecha(it.fecha_turno)}</Dato>
        <Dato etiqueta="Estado">{it.estado_descripcion || ''}</Dato>
        <Dato etiqueta="Fecha Asignación">{formatearFecha(it.fecha_asignacion) || '—'}</Dato>
      </Rejilla>
    </VentanaDetalle>
  );
}

export function DetalleFaltista({ item, onClose }) {
  const it = item || {};
  return (
    <VentanaDetalle titulo="Detalle Faltista" onClose={onClose} onPdf={() => imprimirFaltista(item)}>
      <Rejilla>
        <Dato etiqueta="No. Afiliación">{it.noafiliacion ?? ''}</Dato>
        <Dato etiqueta="Sexo">{it.sexo ?? ''}</Dato>
        <Dato etiqueta="Nombre" ancho>{[it.nombres || '', it.apellidos || ''].filter(Boolean).join(' ')}</Dato>
        <Dato etiqueta="Jornada">{it.jornada ?? ''}</Dato>
        <Dato etiqueta="Acceso Vascular">{it.accesovascular ?? ''}</Dato>
        <Dato etiqueta="Departamento">{it.departamento ?? ''}</Dato>
        <Dato etiqueta="Clínica">{it.clinica ?? ''}</Dato>
        <Dato etiqueta="Fecha Falta">{formatearFecha(it.fechafalta)}</Dato>
        <Dato etiqueta="Registrado por">{it.usuario_creacion ?? ''}</Dato>
      </Rejilla>
      <Texto etiqueta="Motivo de la falta" valor={it.motivo_falta} />
    </VentanaDetalle>
  );
}

const pretty = (s) => String(s).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

function TablaParametros({ encabezados, children }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className={`min-w-full ${BORDE} text-xs`}>
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-700">
            {encabezados.map((h) => <th key={h} className="px-2 py-1 text-left">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const FilaParametro = ({ children }) => <tr className="border-t border-slate-200 dark:border-slate-700">{children}</tr>;

// `ultimos`: { loading, error, data } con los últimos parámetros previos del paciente
export function DetalleLaboratorio({ item, ultimos, onClose }) {
  const it = item || {};
  const otros = Object.entries(it).filter(([, v]) => v !== null && v !== undefined && v !== '');
  const parametros = Array.isArray(it.parametros) ? it.parametros : [];
  return (
    <VentanaDetalle titulo="Detalle de Laboratorio" onClose={onClose} onPdf={() => imprimirLaboratorio(item, ultimos.data)}>
      <Rejilla>
        <Dato etiqueta="No. Afiliación">{it.no_afiliacion || ''}</Dato>
        <Dato etiqueta="ID Laboratorio">{it.id_laboratorio || it.idlaboratorio || ''}</Dato>
        <Dato etiqueta="Paciente" ancho>{nombreCompleto(it)}</Dato>
        <Dato etiqueta="Sexo">{it.sexo ?? ''}</Dato>
        <Dato etiqueta="Fecha">{formatearFecha(it.fecha_laboratorio || it.fecha)}</Dato>
      </Rejilla>
      <hr className="border-slate-200 dark:border-slate-700" />
      <Rejilla>
        <Dato etiqueta="Periodicidad">{it.periodicidad}</Dato>
        <Dato etiqueta="Examen Realizado">{it.examen_realizado ? 'Sí' : 'No'}</Dato>
        <Dato etiqueta="Causa No Realizado">{it.causa_no_realizado || '—'}</Dato>
        <Dato etiqueta="Virología">{it.virologia || '—'}</Dato>
        <Dato etiqueta="Ag. Hepatitis C">{textoPositivoNegativo(it.antigeno_hepatitis_c)}</Dato>
        <Dato etiqueta="Ag. Superficie">{textoPositivoNegativo(it.antigeno_superficie)}</Dato>
        <Dato etiqueta="HIV">{textoPositivoNegativo(it.hiv)}</Dato>
      </Rejilla>
      <Texto etiqueta="Observaciones" valor={it.observacion} />
      {it.examen_realizado && (
        <div>
          <span className="font-semibold">Parámetros:</span>
          <TablaParametros encabezados={['Parámetro', 'Valor']}>
            {parametros.length > 0 ? (
              parametros.map((p, i) => (
                <FilaParametro key={`${p.idparametro || i}-${p.parametro}`}>
                  <td className="px-2 py-1">{p.parametro ?? ''}</td>
                  <td className="px-2 py-1">{p.valor ?? ''}</td>
                </FilaParametro>
              ))
            ) : otros.length === 0 ? (
              <tr><td className="px-2 py-1" colSpan={2}>—</td></tr>
            ) : otros.map(([k, v]) => (
              <FilaParametro key={k}>
                <td className="px-2 py-1">{pretty(k)}</td>
                <td className="px-2 py-1">{typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v)}</td>
              </FilaParametro>
            ))}
          </TablaParametros>
        </div>
      )}
      <div>
        <span className="font-semibold">Últimos parámetros previos:</span>
        <div className="mt-2">
          {ultimos.loading ? (
            <div className="text-sm text-slate-600 dark:text-slate-300">Cargando últimos parámetros...</div>
          ) : ultimos.error ? (
            <div className="text-sm text-red-600 dark:text-red-400">{ultimos.error}</div>
          ) : ultimos.data.length > 0 ? (
            <TablaParametros encabezados={['Parámetro', 'Valor', 'Fecha Lab.']}>
              {ultimos.data.map((u, i) => (
                <FilaParametro key={`${u.idparametro || i}-${u.parametro}`}>
                  <td className="px-2 py-1">{u.parametro ?? ''}</td>
                  <td className="px-2 py-1">{u.valor ?? ''}</td>
                  <td className="px-2 py-1">{formatearFecha(u.fecha_laboratorio)}</td>
                </FilaParametro>
              ))}
            </TablaParametros>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-300">No hay registros previos.</div>
          )}
        </div>
      </div>
    </VentanaDetalle>
  );
}

export function DetalleReferencia({ item, onClose }) {
  const it = item || {};
  const paciente = [it.primernombre, it.segundonombre, it.primerapellido, it.segundoapellido].filter(Boolean).join(' ');
  return (
    <VentanaDetalle titulo="Detalle de Referencia" onClose={onClose} onPdf={() => imprimirReferencia(item)}>
      <Rejilla>
        <Dato etiqueta="ID Referencia">{it.idreferencia || ''}</Dato>
        <Dato etiqueta="No. Afiliación">{it.noafiliacion || ''}</Dato>
        <Dato etiqueta="Paciente" ancho>{paciente}</Dato>
        <Dato etiqueta="Sexo">{it.sexo || ''}</Dato>
        <Dato etiqueta="Fecha">{formatearFecha(it.fechareferencia)}</Dato>
      </Rejilla>
      <hr className="border-slate-200 dark:border-slate-700" />
      <Rejilla>
        <Dato etiqueta="Motivo Traslado">{it.motivotraslado || ''}</Dato>
        <Dato etiqueta="Especialidad">{it.especialidadreferencia || ''}</Dato>
        <Dato etiqueta="ID Médico">{it.idmedico || ''}</Dato>
        <Dato etiqueta="Médico">{it.nombremedico || ''}</Dato>
      </Rejilla>
    </VentanaDetalle>
  );
}

// Detalle de un laboratorio que trae por sí mismo los últimos parámetros previos del paciente
export function DetalleLaboratorioAuto({ item, onClose }) {
  const { ultimos, abrir } = useDetalleLaboratorio();
  useEffect(() => { abrir(item); }, [item, abrir]);
  return <DetalleLaboratorio item={item} ultimos={ultimos} onClose={onClose} />;
}
