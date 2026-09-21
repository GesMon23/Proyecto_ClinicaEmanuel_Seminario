// Detalles imprimibles (ventana nueva + diálogo de impresión) de cada sección de la ficha del paciente.
import logoClinica from '@/assets/logoClinica2.png';
import { formatearFecha } from '@/utils/fechas';
import { nombreCompleto, resumenKdqol } from './calculos';

const ESTILOS = `
  body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
  h1 { color: #166534; font-size: 20px; margin-bottom: 8px; }
  h2 { color: #065f46; font-size: 16px; margin: 16px 0 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .row { margin: 6px 0; }
  .label { font-weight: bold; }
  .box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
  th { background: #f1f5f9; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
  .logo { display: block; margin: 0 auto 12px auto; height: 104px; }
  .title { text-align: center; }
  @page { size: A4 landscape; margin: 16mm; }
`;

const escapar = (valor) => String(valor).replace(/</g, '&lt;').replace(/>/g, '&gt;');
const caja = (valor) => `<div class="box">${escapar(valor || '—')}</div>`;
const campo = (etiqueta, valor, ancho) =>
  `<div class="row"${ancho ? ' style="grid-column: 1 / -1;"' : ''}><span class="label">${etiqueta}:</span> ${valor ?? ''}</div>`;
const tabla = (encabezados, filas) => `
  <table>
    <thead><tr>${encabezados.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${filas.join('') || `<tr><td colspan="${encabezados.length}">—</td></tr>`}</tbody>
  </table>`;

function imprimir(titulo, encabezado, cuerpo) {
  const html = `
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${titulo}</title>
      <style>${ESTILOS}</style>
    </head>
    <body>
      <img src="${logoClinica}" alt="Logo Clínica" class="logo" />
      <h1 class="title">${encabezado}</h1>
      ${cuerpo}
    </body>
    </html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 300);
}

const pretty = (s) => String(s).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

// `ultimos`: últimos parámetros previos del paciente, ya cargados por la pestaña de laboratorios
export function imprimirLaboratorio(item, ultimos = []) {
  const it = item || {};
  const id = it.id_laboratorio || it.idlaboratorio || '';
  const excluidas = new Set([
    'id_laboratorio', 'idlaboratorio', 'no_afiliacion', 'noafiliacion', 'primer_nombre', 'primernombre', 'segundo_nombre', 'segundonombre',
    'primer_apellido', 'primerapellido', 'segundo_apellido', 'segundoapellido', 'sexo', 'fecha_laboratorio', 'fecha', 'periodicidad',
    'examen_realizado', 'causa_no_realizado', 'infeccion_acceso', 'complicacion_acceso', 'virologia', 'antigeno_hepatitis_c',
    'antigeno_superficie', 'hiv', 'observacion', 'usuario_creacion', 'fecha_registro', 'idperlaboratorio', 'parametros',
  ]);
  const otros = Object.entries(it).filter(([k, v]) => !excluidas.has(k) && v !== null && v !== undefined && v !== '');

  let filasParametros = [];
  if (it.examen_realizado) {
    filasParametros = Array.isArray(it.parametros) && it.parametros.length > 0
      ? it.parametros.map((p) => `<tr><td>${p.parametro ?? ''}</td><td>${p.valor ?? ''}</td></tr>`)
      : otros.map(([k, v]) => `<tr><td>${pretty(k)}</td><td>${typeof v === 'boolean' ? (v ? 'Sí' : 'No') : v}</td></tr>`);
  }
  const seccionParametros = it.examen_realizado ? `<h2>Parámetros</h2>${tabla(['Parámetro', 'Valor'], filasParametros)}` : '';

  imprimir(`Informe de Laboratorio ${id}`, 'Detalle de Laboratorio', `
    <div class="grid">
      ${campo('No. Afiliación', it.no_afiliacion || '')}
      ${campo('ID Laboratorio', id)}
      ${campo('Paciente', nombreCompleto(it), true)}
      ${campo('Sexo', it.sexo ?? '')}
      ${campo('Fecha de Laboratorio', formatearFecha(it.fecha_laboratorio || it.fecha))}
      ${campo('Periodicidad', it.periodicidad || '')}
    </div>
    <hr />
    <h2>Resultados/Estado</h2>
    <div class="grid">
      ${campo('Examen Realizado', it.examen_realizado ? 'Sí' : 'No')}
      ${campo('Causa No Realizado', it.causa_no_realizado || '—')}
      ${campo('Infección de Acceso', it.infeccion_acceso || '—')}
      ${campo('Complicación de Acceso', it.complicacion_acceso || '—')}
      ${campo('Virología', it.virologia || '—')}
      ${campo('Ag. Hepatitis C', it.antigeno_hepatitis_c ? 'Positivo' : 'Negativo')}
      ${campo('Ag. Superficie', it.antigeno_superficie ? 'Positivo' : 'Negativo')}
      ${campo('HIV', it.hiv || '—')}
    </div>
    <h2>Observaciones</h2>
    ${caja(it.observacion)}
    ${seccionParametros}
    <h2>Últimos parámetros previos</h2>
    ${tabla(['Parámetro', 'Valor', 'Fecha Lab.'],
      (Array.isArray(ultimos) ? ultimos : []).map((u) => `<tr><td>${u.parametro ?? ''}</td><td>${u.valor ?? ''}</td><td>${formatearFecha(u.fecha_laboratorio)}</td></tr>`))}`);
}

// Listado de los laboratorios que muestra la consulta (una fila por registro)
export function imprimirListadoLaboratorios(filas) {
  const rows = filas.map((it, i) => `
    <tr>
      <td>${i + 1}</td><td>${it.no_afiliacion ?? ''}</td><td>${nombreCompleto(it)}</td><td>${it.sexo ?? ''}</td>
      <td>${it.id_laboratorio ?? ''}</td><td>${formatearFecha(it.fecha_laboratorio)}</td><td>${it.periodicidad ?? ''}</td>
      <td>${it.examen_realizado ? 'Sí' : 'No'}</td><td>${it.virologia ?? ''}</td><td>${it.hiv ?? ''}</td><td>${it.usuario_creacion ?? ''}</td>
    </tr>`);
  imprimir('Listado de Laboratorios', 'Listado de Laboratorios', `
    <div style="color:#64748b; font-size:12px; margin-bottom:16px;">Generado: ${new Date().toLocaleString()} - Registros: ${filas.length}</div>
    ${tabla(['#', 'No. Afiliación', 'Paciente', 'Sexo', 'ID Laboratorio', 'Fecha', 'Periodicidad', 'Examen', 'Virología', 'HIV', 'Usuario'], rows)}`);
}

export function imprimirFaltista(item) {
  const it = item || {};
  imprimir(`Detalle de Faltista ${it.noafiliacion || ''}`, 'Detalle de Faltista', `
    <div class="grid">
      ${campo('No. Afiliación', it.noafiliacion ?? '')}
      ${campo('Nombre', [it.nombres || '', it.apellidos || ''].filter(Boolean).join(' '), true)}
      ${campo('Sexo', it.sexo ?? '')}
      ${campo('Jornada', it.jornada ?? '')}
      ${campo('Acceso Vascular', it.accesovascular ?? '')}
      ${campo('Departamento', it.departamento ?? '')}
      ${campo('Clínica', it.clinica ?? '')}
      ${campo('Fecha Falta', formatearFecha(it.fechafalta))}
    </div>`);
}

export function imprimirTurno(item) {
  const it = item || {};
  imprimir(`Detalle de Turno ${it.id_turno || it.id_turno_cod || ''}`, 'Detalle de Turno', `
    <div class="grid">
      ${campo('No. Afiliación', it.noafiliacion ?? '')}
      ${campo('Código Turno', it.id_turno_cod || it.id_turno || '')}
      ${campo('Paciente', it.nombrepaciente || '', true)}
      ${campo('Clínica', it.nombre_clinica || '')}
      ${campo('Fecha', formatearFecha(it.fecha_turno))}
    </div>`);
}

export function imprimirFormulario(item) {
  const it = item || {};
  imprimir(`Detalle de Formulario ${it.numero_formulario || ''}`, 'Detalle de Formulario', `
    <div class="grid">
      ${campo('Número Formulario', it.numero_formulario ?? '')}
      ${campo('ID Historial', it.id_historial ?? '')}
      ${campo('Sesiones Autorizadas', it.sesiones_autorizadas_mes ?? '')}
      ${campo('Sesiones Realizadas', it.sesiones_realizadas_mes ?? '')}
      ${campo('No Realizadas', it.sesiones_no_realizadas_mes ?? '')}
      ${campo('Inicio Prestaciones', it.inicio_prest_servicios ?? '')}
      ${campo('Fin Prestaciones', it.fin_prest_servicios ?? '')}
    </div>`);
}

export function imprimirPsicologia(item) {
  const it = item || {};
  const { kdqol, filas, promedio } = resumenKdqol(it);
  const meta = kdqol
    ? `<div class="meta" style="color:#64748b; font-size:12px; margin:4px 0 8px;">ID KDQOL: ${kdqol.id_kdqol ?? '—'} | Fecha aplicación: ${formatearFecha(kdqol.fecha_aplicacion) || '—'}</div>`
    : '';
  const seccionKdqol = filas.length > 0
    ? `${tabla(['Dimensión', 'Puntaje'], filas.map((r) => `<tr><td>${r.label}</td><td>${r.value}</td></tr>`))}
       ${promedio != null ? `<div style="margin-top:8px;"><span class='label'>Promedio KDQOL:</span> ${promedio}</div>` : ''}`
    : '<div class="box">—</div>';

  imprimir(`Informe de Psicología ${it.id_informe || ''}`, 'Detalle de Psicología', `
    <div class="grid">
      ${campo('No. Afiliación', it.no_afiliacion || '')}
      ${campo('ID Informe', it.id_informe || '')}
      ${campo('Paciente', nombreCompleto(it), true)}
      ${campo('Sexo', it.sexo ?? it.Sexo ?? '')}
      ${campo('Fecha', formatearFecha(it.fecha_creacion))}
    </div>
    <h2>Motivo de Consulta</h2>${caja(it.motivo_consulta)}
    <h2>Tipo de Consulta</h2>${caja(it.tipo_consulta)}
    <h2>Pronóstico</h2>${caja(it.pronostico)}
    <h2>Observaciones</h2>${caja(it.observaciones)}
    <h2>KDQOL</h2>
    ${meta}
    ${seccionKdqol}`);
}

export function imprimirNutricion(item) {
  const it = item || {};
  imprimir(`Informe de Nutrición ${it.id_informe || ''}`, 'Detalle de Nutrición', `
    <div class="grid">
      ${campo('No. Afiliación', it.no_afiliacion || '')}
      ${campo('ID Informe', it.id_informe || '')}
      ${campo('Estado Nutricional', it.estado_nutricional || '')}
      ${campo('IMC', it.imc ?? '')}
      ${campo('Altura (cm)', it.altura_cm ?? '')}
      ${campo('Peso (kg)', it.peso_kg ?? '')}
    </div>
    <h2>Motivo</h2>${caja(it.motivo_consulta)}
    <h2>Observaciones</h2>${caja(it.observaciones)}`);
}
