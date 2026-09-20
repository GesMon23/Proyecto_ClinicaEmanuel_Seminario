const { crearRouterReporte } = require('./reportes.router');
const definiciones = require('./definiciones');

// Un router por reporte; en server.js se montan en la misma posición que los controladores originales
module.exports = {
  nuevoIngreso: crearRouterReporte(definiciones.nuevoIngreso),
  pacientes: crearRouterReporte(definiciones.pacientes),
  fallecidos: crearRouterReporte(definiciones.fallecidos),
  egreso: crearRouterReporte(definiciones.egreso),
  faltistas: crearRouterReporte(definiciones.faltistas),
};
