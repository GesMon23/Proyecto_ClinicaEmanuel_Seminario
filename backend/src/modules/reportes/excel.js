// Construcción del Excel de un reporte con el estilo institucional: logo, título, línea de filtros,
// encabezado verde, filtro automático y panel congelado.
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const LOGOS = {
  frontend: path.join(__dirname, '../../../../src/assets/logoClinica2.png'),
  backend: path.join(__dirname, '../../../assets/img/logoClinica.png'),
};

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function letraColumna(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const BORDE = { style: 'thin', color: { argb: 'FF0F172A' } };

// Línea "Desde: ... | Hasta: ..." con los filtros aplicados
function resumenDeFiltros(etiquetas, consulta) {
  const partes = etiquetas
    .filter(([clave]) => consulta[clave])
    .map(([clave, etiqueta]) => `${etiqueta}: ${consulta[clave]}`);
  return partes.join(' | ') || 'Sin filtros';
}

// def.excel: { hoja, titulo, columnas, fila(registro), preambulo, alturaFila, filaEncabezado, logo, etiquetas? }
function construirExcel(def, registros, consulta) {
  const excel = def.excel;
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet(excel.hoja);
  hoja.columns = excel.columnas;
  const numColumnas = excel.columnas.length;

  // Filas de cabecera visual (logo, título, filtros) por encima de la tabla
  hoja.spliceRows(1, 0, ...Array.from({ length: excel.preambulo }, () => []));
  // Quitar el encabezado que ExcelJS genera solo al definir columnas: se escribe uno propio con estilo
  hoja.spliceRows(excel.preambulo + 1, 1);
  for (let r = 1; r <= excel.filasAltas; r++) hoja.getRow(r).height = excel.alturaFila;

  try {
    const ruta = LOGOS[excel.logo.origen];
    if (fs.existsSync(ruta)) {
      const idImagen = libro.addImage({ filename: ruta, extension: 'png' });
      hoja.addImage(idImagen, excel.logo.rango);
    }
  } catch (_) { /* el logo es opcional */ }

  hoja.mergeCells(2, 1, 2, numColumnas);
  hoja.getCell(2, 1).value = excel.titulo;
  hoja.getCell(2, 1).font = { bold: true, size: 16, color: { argb: 'FF166534' } };
  hoja.getCell(2, 1).alignment = { horizontal: 'center' };

  if (excel.etiquetas) {
    hoja.mergeCells(3, 1, 3, numColumnas);
    hoja.getCell(3, 1).value = `Generado: ${new Date().toLocaleString()} — ${resumenDeFiltros(excel.etiquetas, consulta)}`;
    hoja.getCell(3, 1).font = { size: 11, color: { argb: 'FF475569' } };
    hoja.getCell(3, 1).alignment = { horizontal: 'center' };
  }

  const filaEncabezado = excel.filaEncabezado;
  hoja.insertRow(filaEncabezado, excel.columnas.map((c) => c.header));
  const encabezado = hoja.getRow(filaEncabezado);
  encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  encabezado.alignment = { horizontal: 'center', vertical: 'middle' };
  encabezado.height = 22;
  encabezado.eachCell((celda) => {
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
    celda.border = { top: BORDE, left: BORDE, bottom: BORDE, right: BORDE };
  });

  hoja.autoFilter = { from: `A${filaEncabezado}`, to: `${letraColumna(numColumnas)}${filaEncabezado}` };
  hoja.views = [{ state: 'frozen', ySplit: filaEncabezado }];

  registros.forEach((r) => hoja.addRow(excel.fila(r)));
  return libro;
}

// Excel vacío con solo los encabezados (respuesta tolerante cuando falla la consulta)
function construirExcelVacio(def) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet(def.excel.hoja);
  hoja.columns = def.excel.columnas;
  hoja.insertRow(1, def.excel.columnas.map((c) => c.header));
  return libro;
}

async function enviarExcel(res, libro, nombreArchivo) {
  res.setHeader('Content-Type', TIPO_XLSX);
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
  await libro.xlsx.write(res);
  res.end();
}

module.exports = { construirExcel, construirExcelVacio, enviarExcel, resumenDeFiltros, letraColumna };
