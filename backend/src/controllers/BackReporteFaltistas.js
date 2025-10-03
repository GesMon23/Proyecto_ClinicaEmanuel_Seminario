const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// GET /api/faltistas - lista con filtros por fecha (server-side)
router.get('/api/faltistas', async (req, res) => {
  try {
    const { fechainicio, fechafin, noafiliacion, sexo, clinica, jornada, accesovascular, departamento } = req.query;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_faltistas_filtrado';
      await client.query('CALL public.sp_faltistas_filtrado($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
        fechainicio || null,
        fechafin || null,
        noafiliacion || null,
        sexo || null,
        clinica || null,
        jornada || null,
        accesovascular || null,
        departamento || null,
        cursorName,
      ]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      await client.query('COMMIT');
      const rows = (fetchRes.rows || []).map(r => ({
        noafiliacion: r.noafiliacion,
        nombres: [r.primer_nombre, r.segundo_nombre, r.otros_nombres].filter(Boolean).join(' '),
        apellidos: [r.primer_apellido, r.segundo_apellido, r.apellido_casada].filter(Boolean).join(' '),
        sexo: r.sexo,
        clinica: r.clinica,
        jornada: r.jornada,
        accesovascular: r.accesovascular,
        departamento: r.departamento,
        fechafalta: r.fechafalta,
      }));
      res.json(rows);
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[BackReporteFaltistas] /api/faltistas error:', error);
    res.status(500).json({ error: 'Error al obtener faltistas.' });
  }
});

// GET /api/faltistas/excel - exporta listado en Excel
router.get('/api/faltistas/excel', async (req, res) => {
  try {
    const { fechainicio, fechafin, noafiliacion, sexo, clinica, jornada, accesovascular, departamento } = req.query;
    const client = await pool.connect();
    let rows = [];
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_faltistas_excel';
      await client.query('CALL public.sp_faltistas_filtrado($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
        fechainicio || null,
        fechafin || null,
        noafiliacion || null,
        sexo || null,
        clinica || null,
        jornada || null,
        accesovascular || null,
        departamento || null,
        cursorName,
      ]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      rows = fetchRes.rows || [];
      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Faltistas');

    worksheet.columns = [
      { header: 'No. Afiliación', key: 'noafiliacion', width: 18 },
      { header: 'Nombres y Apellidos', key: 'nombre_completo', width: 32 },
      { header: 'Sexo', key: 'sexo', width: 8 },
      { header: 'Jornada', key: 'jornada', width: 14 },
      { header: 'Acceso Vascular', key: 'accesovascular', width: 18 },
      { header: 'Departamento', key: 'departamento', width: 18 },
      { header: 'Clínica', key: 'clinica', width: 22 },
      { header: 'Fecha de Falta', key: 'fechafalta', width: 16 },
    ];

    // Encabezado compacto con logo y título
    worksheet.spliceRows(1, 0, [], [], []);
    for (let r = 1; r <= 3; r++) worksheet.getRow(r).height = 22;
    try {
      const logoPath = path.join(__dirname, '../../../src/assets/logoClinica2.png');
      if (fs.existsSync(logoPath)) {
        const imageId = workbook.addImage({ filename: logoPath, extension: 'png' });
        worksheet.addImage(imageId, 'A1:B3');
      }
    } catch {}
    const colCount = worksheet.columns.length;
    worksheet.mergeCells(2, 1, 2, colCount);
    worksheet.getCell(2, 1).value = 'Reporte de Faltistas';
    worksheet.getCell(2, 1).font = { bold: true, size: 16, color: { argb: 'FF166534' } };
    worksheet.getCell(2, 1).alignment = { horizontal: 'center' };

    // Header de columnas
    const headerRowIndex = 4;
    const headerValues = worksheet.columns.map(c => c.header);
    worksheet.insertRow(headerRowIndex, headerValues);
    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    // Filas
    rows.forEach(r => {
      const nombre = [r.primer_nombre, r.segundo_nombre, r.otros_nombres, r.primer_apellido, r.segundo_apellido, r.apellido_casada].filter(Boolean).join(' ');
      worksheet.addRow({
        noafiliacion: r.noafiliacion || '',
        nombre_completo: nombre,
        sexo: r.sexo || '',
        jornada: r.jornada || '',
        accesovascular: r.accesovascular || '',
        departamento: r.departamento || '',
        clinica: r.clinica || '',
        fechafalta: r.fechafalta || '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_faltistas.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[BackReporteFaltistas] /api/faltistas/excel error:', error);
    res.status(500).json({ error: 'Error al exportar Excel.' });
  }
});

module.exports = router;
// Catálogos: clínicas, jornadas, accesos, departamentos
router.get('/api/faltistas/catalogos', async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cClin = 'cur_cat_clinicas_fal';
    const cJ = 'cur_cat_jornadas_fal';
    const cA = 'cur_cat_accesos_fal';
    const cD = 'cur_cat_deptos_fal';
    await client.query('CALL public.sp_faltistas_catalogo_clinicas($1)', [cClin]);
    await client.query('CALL public.sp_nuevo_ingreso_catalogo_jornadas($1)', [cJ]);
    await client.query('CALL public.sp_nuevo_ingreso_catalogo_accesos($1)', [cA]);
    await client.query('CALL public.sp_nuevo_ingreso_catalogo_departamentos($1)', [cD]);
    const [rClin, rJ, rA, rD] = await Promise.all([
      client.query(`FETCH ALL FROM "${cClin}"`),
      client.query(`FETCH ALL FROM "${cJ}"`),
      client.query(`FETCH ALL FROM "${cA}"`),
      client.query(`FETCH ALL FROM "${cD}"`),
    ]);
    await client.query('COMMIT');
    res.json({
      clinicas: rClin.rows.map(r => r.descripcion).filter(Boolean),
      jornadas: rJ.rows.map(r => r.descripcion).filter(Boolean),
      accesos: rA.rows.map(r => r.descripcion).filter(Boolean),
      departamentos: rD.rows.map(r => r.nombre).filter(Boolean),
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('[BackReporteFaltistas] /api/faltistas/catalogos error:', error);
    res.status(500).json({ error: 'Error al cargar catálogos.' });
  } finally {
    client.release();
  }
});
