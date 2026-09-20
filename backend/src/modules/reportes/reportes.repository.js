// Acceso a datos de los reportes: procedimiento de filtrado y catálogos de los filtros.
const { withTransaction, fetchCursor } = require('../../shared/database');

// Catálogos de filtros: procedimiento y columna que se muestra. `respaldo`: consulta directa si el
// procedimiento falla.
const CATALOGOS = {
  estados: { sp: 'sp_pacientes_catalogo_estados', campo: 'descripcion' },
  jornadas: { sp: 'sp_nuevo_ingreso_catalogo_jornadas', campo: 'descripcion' },
  accesos: { sp: 'sp_nuevo_ingreso_catalogo_accesos', campo: 'descripcion' },
  departamentos: { sp: 'sp_nuevo_ingreso_catalogo_departamentos', campo: 'nombre' },
  sexos: { sp: 'sp_nuevo_ingreso_catalogo_sexos', campo: 'sexo' },
  causas: { sp: 'sp_egreso_catalogo_causas', campo: 'descripcion' },
  clinicas: {
    sp: 'sp_faltistas_catalogo_clinicas',
    campo: 'descripcion',
    respaldo: 'SELECT descripcion FROM public.tbl_clinica ORDER BY descripcion ASC',
  },
};

// Filas del reporte: los valores de def.filtros salen de la consulta HTTP, en el orden del procedimiento
function filtrar(def, consulta) {
  const valores = def.filtros.map((clave) => consulta[clave] || null);
  return withTransaction((c) => fetchCursor(c, `public.${def.procedimiento}`, valores, `cur_${def.clave}_filtrado`));
}

// { jornadas: [...], accesos: [...] } con solo los valores no vacíos
function catalogos(claves) {
  return withTransaction(async (c) => {
    const resultado = {};
    for (const clave of claves) {
      const cat = CATALOGOS[clave];
      let filas;
      try {
        await c.query('SAVEPOINT catalogo');
        filas = await fetchCursor(c, `public.${cat.sp}`, [], `cur_cat_${clave}`);
        await c.query('RELEASE SAVEPOINT catalogo');
      } catch (err) {
        if (!cat.respaldo) throw err;
        await c.query('ROLLBACK TO SAVEPOINT catalogo');
        filas = (await c.query(cat.respaldo)).rows;
      }
      resultado[clave] = filas.map((f) => f[cat.campo]).filter(Boolean);
    }
    return resultado;
  });
}

module.exports = { filtrar, catalogos };
