require('dotenv').config();
const { crearApp } = require('./src/app');
const turnos = require('./src/modules/turnos');

const PORT = process.env.PORT || 3001;

crearApp().listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  turnos.iniciarTareas();
});
