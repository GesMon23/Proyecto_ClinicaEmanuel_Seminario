// Carné de paciente: los datos largos se acomodan en su columna y el carné sigue siendo de una página.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { definirCarnetPaciente } = require('../src/modules/pacientes/carnet');

const paginas = (pdf) => (fs.readFileSync(pdf, 'latin1').match(/\/Type \/Page\b/g) || []).length;

test('carné con nombres y dirección muy largos: una sola página', async () => {
  const salida = path.join(os.tmpdir(), `carnet-prueba-${process.pid}.pdf`);
  try {
    await definirCarnetPaciente({
      primer_nombre: 'MARÍA', segundo_nombre: 'DE LOS ÁNGELES', otros_nombres: 'GUADALUPE ESPERANZA DEL ROSARIO',
      primer_apellido: 'HERNÁNDEZ', segundo_apellido: 'CASTELLANOS', apellido_casada: 'DE VILLATORO MONTENEGRO',
      direccion: 'KILÓMETRO 18.5 CARRETERA A EL SALVADOR, CONDOMINIO VILLAS DE LAS FLORES, CASA 25 B, SECTOR NORTE, '
        + 'SANTA CATARINA PINULA, GUATEMALA, FRENTE AL PARQUE CENTRAL Y A UN COSTADO DE LA IGLESIA',
      fecha_nacimiento: new Date(1980, 4, 9), fecha_ingreso: new Date(2025, 0, 15),
      no_afiliacion: '9100000099', dpi: '2910000009999', sexo: 'Femenino',
    }, null, salida, 'https://ejemplo');
    assert.equal(paginas(salida), 1);
  } finally {
    fs.rmSync(salida, { force: true });
  }
});
