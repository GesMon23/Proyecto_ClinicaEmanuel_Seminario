const routers = require('./pacientes.routes');
const consulta = require('./consulta.routes');

module.exports = { ...routers, consulta };
