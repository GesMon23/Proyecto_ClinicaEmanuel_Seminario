// Fábrica de routers de reporte: cada reporte publica <ruta> (lista filtrada), <ruta>/catalogos y
// <ruta>/excel a partir de su definición (ver definiciones.js).
const express = require('express');
const repo = require('./reportes.repository');
const { construirExcel, construirExcelVacio, enviarExcel } = require('./excel');
const { wrap } = require('../../shared/http');

function crearRouterReporte(def) {
  const router = express.Router();
  const etiqueta = `[${def.etiqueta}]`;

  // Con `tolerante` un fallo devuelve un resultado vacío en lugar de un error (la pantalla no se rompe)
  const alFallarLista = (err) => {
    console.error(`${etiqueta} ${def.ruta} error:`, err);
    return def.tolerante ? [200, []] : [500, { error: def.errores.lista }];
  };
  const alFallarCatalogos = (err) => {
    console.error(`${etiqueta} ${def.ruta}/catalogos error:`, err);
    if (def.tolerante) return [200, Object.fromEntries(def.catalogos.map((c) => [c, []]))];
    return [500, { error: 'Error al cargar catálogos.' }];
  };

  router.get(def.ruta, wrap(async (req, res) => {
    const filas = await repo.filtrar(def, req.query);
    res.json(def.transformarLista ? def.transformarLista(filas) : filas);
  }, alFallarLista));

  router.get(`${def.ruta}/catalogos`, wrap(async (req, res) => {
    res.json(await repo.catalogos(def.catalogos));
  }, alFallarCatalogos));

  router.get(`${def.ruta}/excel`, async (req, res) => {
    try {
      const filas = await repo.filtrar(def, req.query);
      await enviarExcel(res, construirExcel(def, filas, req.query), def.excel.archivo);
    } catch (err) {
      console.error(`${etiqueta} ${def.ruta}/excel error:`, err);
      if (def.tolerante) {
        try {
          return await enviarExcel(res, construirExcelVacio(def), def.excel.archivo);
        } catch (_) { /* cae al error genérico */ }
      }
      if (!res.headersSent) res.status(500).json({ error: 'Error al exportar Excel.' });
    }
  });

  return router;
}

module.exports = { crearRouterReporte };
