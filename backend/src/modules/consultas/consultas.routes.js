// Rutas de consulta de historiales. Se exponen en routers separados porque server.js los monta en
// posiciones distintas (algunos con prefijo /api/nutricion o /api/psicologia).
const express = require('express');
const repo = require('./consultas.repository');
const { textoONulo, enteroONulo, sexoNormalizado } = require('./parametros');
const { wrap } = require('../../shared/http');

function nuevoRouter() {
  const router = express.Router();
  router.use(express.json());
  return router;
}

// { success, data } con error genérico { success:false, message }
const conDatos = (etiqueta) => [
  async (res, filas) => res.json({ success: true, data: filas }),
  (err) => { console.error(`Error en ${etiqueta}:`, err); return [500, { success: false, message: 'Error interno del servidor' }]; },
];

// ---------------------------------------------------------------- Laboratorios
const laboratorios = nuevoRouter();

laboratorios.get('/api/laboratorios/catalogos', wrap(
  async (req, res) => res.json(await repo.catalogosLaboratorios()),
  (err) => { console.error('Error en Laboratorios /catalogos:', err); return [500, { error: 'Error al cargar catálogos.' }]; }
));

{
  const [enviar, alFallar] = conDatos('Laboratorios /historial/:noafiliacion');
  laboratorios.get('/api/laboratorios/historial/:noafiliacion', wrap(
    async (req, res) => enviar(res, await repo.laboratoriosPorAfiliacion(req.params.noafiliacion)), alFallar));
}

{
  const [enviar, alFallar] = conDatos('Laboratorios /historial (filtros)');
  laboratorios.get('/api/laboratorios/historial', wrap(async (req, res) => {
    const q = req.query;
    enviar(res, await repo.laboratoriosFiltrado({
      desde: textoONulo(q.desde),
      hasta: textoONulo(q.hasta),
      noAfiliacion: textoONulo(q.noafiliacion),
      idLaboratorio: enteroONulo(q.idlaboratorio),
      sexo: textoONulo(q.sexo),
      periodicidad: textoONulo(q.periodicidad),
    }));
  }, alFallar));
}

// -------------------------------------------- Nutrición y psicología (mismo formato)
function historialPorInforme(nombre, porAfiliacion, filtrado) {
  const router = nuevoRouter();
  {
    const [enviar, alFallar] = conDatos(`${nombre} /historial (filtros)`);
    router.get('/historial', wrap(async (req, res) => {
      const q = req.query;
      enviar(res, await filtrado({
        desde: textoONulo(q.desde),
        hasta: textoONulo(q.hasta),
        noAfiliacion: textoONulo(q.noafiliacion),
        idInforme: textoONulo(q.idinforme),
        sexo: sexoNormalizado(q.sexo),
      }));
    }, alFallar));
  }
  {
    const [enviar, alFallar] = conDatos(`${nombre} /historial`);
    router.get('/historial/:noafiliacion', wrap(
      async (req, res) => enviar(res, await porAfiliacion(req.params.noafiliacion)), alFallar));
  }
  return router;
}

const nutricion = historialPorInforme('Nutrición', repo.nutricionPorAfiliacion, repo.nutricionFiltrado);
const psicologia = historialPorInforme('Psicología', repo.psicologiaPorAfiliacion, repo.psicologiaFiltrado);

// ----------------------------------------------------------------- Referencias
const referencias = nuevoRouter();

referencias.get('/api/referencias/consulta', wrap(async (req, res) => {
  const q = req.query;
  res.json(await repo.referenciasFiltrado({
    desde: textoONulo(q.desde),
    hasta: textoONulo(q.hasta),
    idMedico: enteroONulo(q.idmedico),
    noAfiliacion: textoONulo(q.noafiliacion),
    idReferencia: textoONulo(q.idreferencia),
    sexo: sexoNormalizado(q.sexo),
  }));
}, (err) => { console.error('Error al consultar referencias:', err); return [500, { detail: 'Error al consultar referencias.' }]; }));

module.exports = { laboratorios, nutricion, psicologia, referencias };
