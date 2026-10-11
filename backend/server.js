require('dotenv').config({ quiet: true });
const { jwtSecret } = require('./src/shared/auth');
jwtSecret(); // sin JWT_SECRET no se arranca (la BD se valida al cargar db/pool.js)
const { crearApp } = require('./src/app');
const turnos = require('./src/modules/turnos');

const PORT = process.env.PORT || 3001;

crearApp().listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  turnos.iniciarTareas();
});
