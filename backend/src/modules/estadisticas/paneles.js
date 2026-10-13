// Un panel de Estadísticas por petición: todas las distribuciones de la sección con los MISMOS filtros,
// consultadas en una sola transacción. Los totales se calculan de esas mismas filas, así que siempre
// coinciden con las gráficas.
const repo = require('./estadisticas.repository');
const P = require('./parametros');

// Estados de paciente fuera del programa (el resto cuenta como dentro)
const FUERA_DEL_PROGRAMA = new Set(['egresado', 'fallecido']);
const DIMENSIONES_KDQOL = ['fisico_mental', 'enfermedad_renal', 'sintomas_problemas', 'efectos_enfermedad', 'vida_diaria'];

const numero = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const sumar = (filas) => filas.reduce((a, f) => a + f.total, 0);
const nombreSexo = (v) => {
  const s = String(v || '').trim().toLowerCase();
  if (s.startsWith('m')) return 'Masculino';
  if (s.startsWith('f')) return 'Femenino';
  return null;
};

// [{ <campo>: 'X', total: '3' }] -> [{ nombre: 'X', total: 3 }]; sin valor -> 'Sin dato'
const aSerie = (filas, campo, etiqueta = (v) => v) => filas.map((f) => ({
  nombre: etiqueta(f[campo]) || 'Sin dato',
  total: Number(f.total) || 0,
}));

// Las gráficas "por sexo" / "por motivo" agrupan por la misma dimensión que se filtra: se deja la fila
// filtrada (es exacto, no una aproximación)
const soloFiltrado = (serie, valor) => (valor ? serie.filter((f) => f.nombre === valor) : serie);

const promedioPonderado = (filas, campo) => {
  const validas = filas.filter((f) => f[campo] !== null && f.total > 0);
  const peso = sumar(validas);
  return peso ? Number((validas.reduce((a, f) => a + f[campo] * f.total, 0) / peso).toFixed(2)) : null;
};

async function pacientes(q = {}) {
  const filtros = { acceso: P.texto(q.acceso), estado: P.texto(q.estado), jornada: P.texto(q.jornada), sexo: nombreSexo(q.sexo) };
  const valores = [filtros.acceso, filtros.estado, filtros.jornada, P.sexoInicial(q.sexo)];
  const [estado, acceso, jornada, sexo, departamento] = await repo.consultarVarios([
    ['sp_pacientes_por_estado', valores, 'cur_pac_por_estado'],
    ['sp_pacientes_por_acceso', valores, 'cur_pac_por_acceso'],
    ['sp_pacientes_por_jornada', valores, 'cur_pac_por_jornada'],
    ['sp_pacientes_por_sexo', valores, 'cur_pac_por_sexo'],
    ['sp_pacientes_por_departamento_filtros', valores, 'cur_pac_por_dep'],
  ]);
  const porEstado = aSerie(estado, 'estado');
  const fuera = sumar(porEstado.filter((f) => FUERA_DEL_PROGRAMA.has(f.nombre.toLowerCase())));
  const total = sumar(porEstado);
  return {
    filtros,
    total,
    programa: { dentro: total - fuera, fuera },
    porEstado,
    porAcceso: aSerie(acceso, 'acceso'),
    porJornada: aSerie(jornada, 'jornada'),
    porSexo: aSerie(sexo, 'sexo', nombreSexo),
    porDepartamento: aSerie(departamento, 'departamento').sort((a, b) => b.total - a.total),
  };
}

async function nutricion(q = {}) {
  const rango = P.rangoAbierto(q);
  const sexo = P.sexoCompleto(q.sexo);
  const motivo = P.motivo(q.motivo);
  const [tipo, jornada, porSexo, porMotivo] = await repo.consultarVarios([
    ['sp_nutricion_por_tipo', [rango.desde, rango.hasta, sexo, motivo], 'cur_nutri_tipo'],
    ['sp_nutricion_por_jornada', [rango.desde, rango.hasta, sexo, motivo], 'cur_nutri_jornada'],
    ['sp_nutricion_por_sexo', [rango.desde, rango.hasta, motivo], 'cur_nutri_sexo'],
    ['sp_nutricion_por_motivo', [rango.desde, rango.hasta, sexo], 'cur_nutri_motivo'],
  ]);
  const porEstadoNutricional = tipo.map((f) => ({
    nombre: f.estado || 'Sin clasificar',
    total: Number(f.total) || 0,
    imc: numero(f.imc_promedio),
    peso: numero(f.peso_promedio),
    altura: numero(f.altura_promedio),
  }));
  return {
    rango,
    filtros: { sexo, motivo },
    total: sumar(porEstadoNutricional),
    promedios: {
      imc: promedioPonderado(porEstadoNutricional, 'imc'),
      peso: promedioPonderado(porEstadoNutricional, 'peso'),
      altura: promedioPonderado(porEstadoNutricional, 'altura'),
    },
    porEstadoNutricional,
    porJornada: aSerie(jornada, 'jornada'),
    porSexo: soloFiltrado(aSerie(porSexo, 'sexo', nombreSexo), sexo),
    porMotivo: soloFiltrado(aSerie(porMotivo, 'motivo'), motivo),
  };
}

async function psicologia(q = {}) {
  const rango = P.rangoAbierto(q);
  const sexo = P.sexoMF(q.sexo);
  const conSexo = [rango.desde, rango.hasta, sexo];
  const sinSexo = [rango.desde, rango.hasta];
  const [tipo, atencion, pronostico, jornada, porSexo, kdqolTotal, kdqolProm, kdqolJornada, kdqolSexo] = await repo.consultarVarios([
    ['sp_psicologia_por_tipo', conSexo, 'cur_psico_tipo'],
    ['sp_psicologia_por_atencion', conSexo, 'cur_psico_atencion'],
    ['sp_psicologia_por_pronostico', conSexo, 'cur_psico_pronostico'],
    ['sp_psicologia_por_jornada', conSexo, 'cur_psico_jornada_sexo'],
    ['sp_psico_informes_por_sexo', sinSexo, 'cur_psico_sexo'],
    ['sp_psicologia_kdqol_total', conSexo, 'cur_kdqol_total'],
    ['sp_psicologia_kdqol_promedios', conSexo, 'cur_kdqol_prom'],
    ['sp_psicologia_kdqol_por_jornada', conSexo, 'cur_kdqol_jornada'],
    ['sp_psicologia_kdqol_por_sexo', sinSexo, 'cur_kdqol_sexo'],
  ]);
  const sexoNombre = nombreSexo(sexo);
  const fila = kdqolProm[0] || {};
  const promedios = DIMENSIONES_KDQOL.map((campo) => ({ campo, valor: numero(fila[campo]) }));
  const presentes = promedios.filter((p) => p.valor !== null);
  const porTipo = aSerie(tipo, 'tipo');
  return {
    rango,
    filtros: { sexo: sexoNombre },
    total: sumar(porTipo),
    porTipo,
    porAtencion: aSerie(atencion, 'atencion'),
    porPronostico: aSerie(pronostico, 'pronostico'),
    porJornada: aSerie(jornada, 'jornada'),
    porSexo: soloFiltrado(aSerie(porSexo, 'sexo', nombreSexo), sexoNombre),
    kdqol: {
      total: Number(kdqolTotal[0]?.total) || 0,
      promedios,
      global: presentes.length ? Number((presentes.reduce((a, p) => a + p.valor, 0) / presentes.length).toFixed(2)) : null,
      porJornada: aSerie(kdqolJornada, 'jornada'),
      porSexo: soloFiltrado(aSerie(kdqolSexo, 'sexo', nombreSexo), sexoNombre),
    },
  };
}

module.exports = { pacientes, nutricion, psicologia, nombreSexo };
