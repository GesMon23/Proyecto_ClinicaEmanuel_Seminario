// Rutas de estadísticas: /api/estadisticas/* (server.js las monta en la raíz y bajo /api).
const express = require('express');
const service = require('./estadisticas.service');
const definiciones = require('./definiciones');
const paneles = require('./paneles');
const { wrap } = require('../../shared/http');

const router = express.Router();

// PostgreSQL devuelve COUNT()/AVG() como texto (bigint/numeric); las gráficas (Recharts) solo dibujan
// valores numéricos, así que se convierten los campos de conteo/promedio a número.
const CAMPOS_NUMERICOS = new Set([
  'total', 'imc_promedio', 'peso_promedio', 'altura_promedio',
  'fisico_mental', 'enfermedad_renal', 'sintomas_problemas', 'efectos_enfermedad', 'vida_diaria', 'global', 'dentro', 'fuera',
]);

function numerar(valor) {
  if (Array.isArray(valor)) return valor.map(numerar);
  if (valor && typeof valor === 'object') {
    const salida = {};
    for (const [clave, v] of Object.entries(valor)) {
      salida[clave] = CAMPOS_NUMERICOS.has(clave) && typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))
        ? Number(v)
        : numerar(v);
    }
    return salida;
  }
  return valor;
}

router.use('/api/estadisticas', (req, res, next) => {
  const json = res.json.bind(res);
  res.json = (cuerpo) => json(numerar(cuerpo));
  next();
});

// GET /api/estadisticas/<ruta>: consulta -> JSON o { error } con el mensaje de la ruta
function publicar(ruta, consultar, mensajeError) {
  router.get(`/api/estadisticas/${ruta}`, wrap(
    async (req, res) => res.json(await consultar(req.query || {})),
    (err) => {
      console.error(`[Estadisticas] ${ruta} error:`, err);
      return [500, { error: mensajeError }];
    }
  ));
}

for (const def of definiciones) {
  publicar(def.ruta, (q) => service.ejecutar(def, q), def.error);
}

// Pantalla de Estadísticas: un panel completo por petición, con los mismos filtros en todas sus gráficas
publicar('panel/pacientes', paneles.pacientes, 'Error al obtener las estadísticas de pacientes.');
publicar('panel/nutricion', paneles.nutricion, 'Error al obtener las estadísticas de nutrición.');
publicar('panel/psicologia', paneles.psicologia, 'Error al obtener las estadísticas de psicología.');

publicar('resumen', service.resumen, 'Error al generar resumen de estadísticas.');
publicar('pacientes-programa-resumen', () => service.programaResumen(), 'Error al obtener resumen de pacientes del programa.');
publicar('pacientes-total', () => service.pacientesTotal(), 'Error al obtener total de pacientes.');
publicar('psicologia-kdqol-total', service.kdqolTotal, 'Error al obtener KDQOL de psicología.');
publicar('psicologia-kdqol-promedios', service.kdqolPromedios, 'Error al obtener promedios KDQOL.');

module.exports = router;
module.exports.numerar = numerar;
