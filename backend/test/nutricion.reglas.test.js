// Reglas de nutrición en la BD: IMC y estado nutricional (OMS) al guardar un informe.
const { test, after } = require('node:test');
const { assert, pool, tx, cursor, paciente } = require('./helpers');

after(() => pool.end());

const guardar = async (c, noaf, alturaCm, pesoKg) => {
  const [fila] = await cursor(c, 'CALL sp_guardar_informe_nutricion($1, $2, $3, $4, $5, $6, $7)',
    [noaf, 'Nuevo', alturaCm, pesoKg, null, 'prueba']);
  return fila.result;
};

test('guardar un informe calcula el IMC y su estado nutricional', () => tx(async (c) => {
  const noaf = await paciente(c);
  const informe = await guardar(c, noaf, 175, 70);
  assert.equal(Number(informe.imc), 22.86);
  assert.equal(informe.estado_nutricional, 'Saludable');
}));

test('fn_clasificar_imc: las 6 categorías de la OMS y sus límites', () => tx(async (c) => {
  const casos = [
    [null, null], [0, null], [18.49, 'Bajo peso'], [18.5, 'Saludable'], [24.99, 'Saludable'], [25, 'Sobrepeso'],
    [30, 'Obesidad I'], [35, 'Obesidad II'], [39.99, 'Obesidad II'], [40, 'Obesidad III'],
  ];
  for (const [imc, esperado] of casos) {
    const { rows } = await c.query('SELECT public.fn_clasificar_imc($1) AS estado', [imc]);
    assert.equal(rows[0].estado, esperado, `IMC ${imc}`);
  }
}));
