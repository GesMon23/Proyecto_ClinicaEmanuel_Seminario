const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');


// GET /api/fallecidos - lista con filtros
router.get('/api/fallecidos', async (req, res) => {
  try {
    const { fechainicio, fechafin, jornada, accesovascular, sexo, departamento } = req.query;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_fallecidos_filtrado';
      await client.query('CALL public.sp_fallecidos_filtrado($1,$2,$3,$4,$5,$6,$7)', [
        fechainicio || null,
        fechafin || null,
        jornada || null,
        accesovascular || null,
        sexo || null,
        departamento || null,
        cursorName,
      ]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      await client.query('COMMIT');
      return res.json(fetchRes.rows || []);
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[FallecidosReporte] /api/fallecidos error:', error);
    res.status(500).json({ error: 'Error al buscar fallecidos.' });
  }
});

// GET /api/fallecidos/catalogos - catálogos para filtros
router.get('/api/fallecidos/catalogos', async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const c1 = 'cur_cat_jornadas';
    const c2 = 'cur_cat_accesos';
    const c3 = 'cur_cat_deptos';
    const c4 = 'cur_cat_sexos';
    await client.query('CALL public.sp_nuevo_ingreso_catalogo_jornadas($1)', [c1]);
    await client.query('CALL public.sp_nuevo_ingreso_catalogo_accesos($1)', [c2]);
    await client.query('CALL public.sp_nuevo_ingreso_catalogo_departamentos($1)', [c3]);
    await client.query('CALL public.sp_nuevo_ingreso_catalogo_sexos($1)', [c4]);
    const [r1, r2, r3, r4] = await Promise.all([
      client.query(`FETCH ALL FROM "${c1}"`),
      client.query(`FETCH ALL FROM "${c2}"`),
      client.query(`FETCH ALL FROM "${c3}"`),
      client.query(`FETCH ALL FROM "${c4}"`),
    ]);
    await client.query('COMMIT');
    res.json({
      jornadas: r1.rows.map(r => r.descripcion).filter(Boolean),
      accesos: r2.rows.map(r => r.descripcion).filter(Boolean),
      departamentos: r3.rows.map(r => r.nombre).filter(Boolean),
      sexos: r4.rows.map(r => r.sexo).filter(Boolean),
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('[FallecidosReporte] /api/fallecidos/catalogos error:', error);
    res.status(500).json({ error: 'Error al cargar catálogos.' });
  } finally {
    client.release();
  }
});

// GET /api/fallecidos/excel - exporta excel
router.get('/api/fallecidos/excel', async (req, res) => {
  try {
    const { fechainicio, fechafin, jornada, accesovascular, sexo, departamento } = req.query;
    const client = await pool.connect();
    let rows = [];
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_fallecidos_filtrado_excel';
      await client.query('CALL public.sp_fallecidos_filtrado($1,$2,$3,$4,$5,$6,$7)', [
        fechainicio || null,
        fechafin || null,
        jornada || null,
        accesovascular || null,
        sexo || null,
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
    const worksheet = workbook.addWorksheet('Fallecidos');

    worksheet.columns = [
      { header: 'No. Afiliación', key: 'noafiliacion', width: 18 },
      { header: 'Nombre Completo', key: 'nombre_completo', width: 30 },
      { header: 'Sexo', key: 'sexo', width: 8 },
      { header: 'Jornada', key: 'jornada', width: 14 },
      { header: 'Acceso', key: 'accesovascular', width: 16 },
      { header: 'Departamento', key: 'departamento', width: 18 },
      { header: 'Fecha Ingreso', key: 'fechaingreso', width: 16 },
      { header: 'Fecha Fallecimiento', key: 'fechafallecido', width: 18 },
      { header: 'Comorbilidades', key: 'comorbilidades', width: 24 },
      { header: 'Lugar Fallecimiento', key: 'lugarfallecimiento', width: 22 },
      { header: 'Causa de Fallecimiento', key: 'causafallecimiento', width: 24 },
      { header: 'Observaciones', key: 'observaciones', width: 28 },
    ];

    // Encabezado compacto con logo
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
    worksheet.getCell(2, 1).value = 'Reporte de Pacientes Fallecidos';
    worksheet.getCell(2, 1).font = { bold: true, size: 16, color: { argb: 'FF166534' } };
    worksheet.getCell(2, 1).alignment = { horizontal: 'center' };

    const filtrosResumen = (() => {
      const parts = [];
      if (fechainicio) parts.push(`Desde: ${fechainicio}`);
      if (fechafin) parts.push(`Hasta: ${fechafin}`);
      if (jornada) parts.push(`Jornada: ${jornada}`);
      if (accesovascular) parts.push(`Acceso: ${accesovascular}`);
      if (sexo) parts.push(`Sexo: ${sexo}`);
      if (departamento) parts.push(`Depto: ${departamento}`);
      return parts.join(' | ') || 'Sin filtros';
    })();
    worksheet.mergeCells(3, 1, 3, colCount);
    worksheet.getCell(3, 1).value = `Generado: ${new Date().toLocaleString()} — ${filtrosResumen}`;
    worksheet.getCell(3, 1).font = { size: 11, color: { argb: 'FF475569' } };
    worksheet.getCell(3, 1).alignment = { horizontal: 'center' };

    // Header de columnas verde
    const headerRowIndex = 4;
    const headerValues = worksheet.columns.map(c => c.header);
    worksheet.insertRow(headerRowIndex, headerValues);
    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF0F172A' } },
        bottom: { style: 'thin', color: { argb: 'FF0F172A' } },
        right: { style: 'thin', color: { argb: 'FF0F172A' } },
      };
    });
    const colLetter = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
    worksheet.autoFilter = { from: `A${headerRowIndex}`, to: `${colLetter(colCount)}${headerRowIndex}` };
    worksheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];

    // Rows
    rows.forEach((r) => {
      worksheet.addRow({
        noafiliacion: r.noafiliacion || '',
        nombre_completo: r.nombre_completo || '',
        sexo: r.sexo || '',
        jornada: r.jornada || '',
        accesovascular: r.accesovascular || '',
        departamento: r.departamento || '',
        fechaingreso: r.fechaingreso || '',
        fechafallecido: r.fechafallecido || '',
        comorbilidades: r.comorbilidades || '',
        lugarfallecimiento: r.lugarfallecimiento || '',
        causafallecimiento: r.causafallecimiento || '',
        observaciones: r.observaciones || '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_fallecidos.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[FallecidosReporte] /api/fallecidos/excel error:', error);
    res.status(500).json({ error: 'Error al exportar Excel.' });
  }
});

module.exports = router;
