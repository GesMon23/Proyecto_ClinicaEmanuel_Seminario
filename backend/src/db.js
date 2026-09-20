// Compatibilidad: los controladores aún no migrados importan { pool, runWithUser } desde aquí.
const { pool, runWithUser } = require('./shared/database');

module.exports = { pool, runWithUser };
