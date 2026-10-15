const router = require('./turnos.routes');
const { iniciarTareas } = require('./turnos.jobs');

module.exports = { router, iniciarTareas };
