const { EventosLlamado, eventos } = require('./llamados.store');

module.exports = { router: require('./llamados.routes'), EventosLlamado, eventos };
