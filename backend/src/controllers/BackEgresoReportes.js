const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');


// GET /api/egreso - lista filtrada
router.get('/api/egreso', async (req, res) => {
  try {
    const { fechainicio, fechafin, causa, jornada, accesovascular, sexo, departamento } = req.query;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_egreso_filtrado';
      await client.query('CALL public.sp_egreso_filtrado($1,$2,$3,$4,$5,$6,$7,$8)', [
        fechainicio || null,
        fechafin || null,
        causa || null,
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
    console.error('[EgresoReporte] /api/egreso error:', error);
    res.status(500).json({ error: 'Error al buscar egresos.' });
  }
});

// GET /api/egreso/catalogos - catálogos para filtros
router.get('/api/egreso/catalogos', async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const c1 = 'cur_cat_jornadas';
    const c2 = 'cur_cat_accesos';
    const c3 = 'cur_cat_deptos';
    const c4 = 'cur_cat_sexos';
    const c5 = 'cur_cat_causas';
    await client.query('CALL public.sp_nuevo_ingreso_catalogo_jornadas($1)', [c1]);
    await client.query('CALL public.sp_nuevo_ingreso_catalogo_accesos($1)', [c2]);
    await client.query('CALL public.sp_nuevo_ingreso_catalogo_departamentos($1)', [c3]);
    await client.query('CALL public.sp_nuevo_ingreso_catalogo_sexos($1)', [c4]);
    await client.query('CALL public.sp_egreso_catalogo_causas($1)', [c5]);
    const [r1, r2, r3, r4, r5] = await Promise.all([
      client.query(`FETCH ALL FROM "${c1}"`),
      client.query(`FETCH ALL FROM "${c2}"`),
      client.query(`FETCH ALL FROM "${c3}"`),
      client.query(`FETCH ALL FROM "${c4}"`),
      client.query(`FETCH ALL FROM "${c5}"`),
    ]);
    await client.query('COMMIT');
    res.json({
      jornadas: r1.rows.map(r => r.descripcion).filter(Boolean),
      accesos: r2.rows.map(r => r.descripcion).filter(Boolean),
      departamentos: r3.rows.map(r => r.nombre).filter(Boolean),
      sexos: r4.rows.map(r => r.sexo).filter(Boolean),
      causas: r5.rows.map(r => r.descripcion).filter(Boolean),
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('[EgresoReporte] /api/egreso/catalogos error:', error);
    res.status(500).json({ error: 'Error al cargar catálogos.' });
  } finally {
    client.release();
  }
});

// GET /api/egreso/excel - exporta excel
router.get('/api/egreso/excel', async (req, res) => {
  try {
    const { fechainicio, fechafin, causa, jornada, accesovascular, sexo, departamento } = req.query;
    const client = await pool.connect();
    let rows = [];
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_egreso_filtrado_excel';
      await client.query('CALL public.sp_egreso_filtrado($1,$2,$3,$4,$5,$6,$7,$8)', [
        fechainicio || null,
        fechafin || null,
        causa || null,
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
    const worksheet = workbook.addWorksheet('Egresos');

    worksheet.columns = [
      { header: 'No. Afiliación', key: 'noafiliacion', width: 18 },
      { header: 'ID Causa', key: 'id_causa_egreso', width: 10 },
      { header: 'Causa (desc.)', key: 'causa_descripcion', width: 24 },
      { header: 'Descripción', key: 'descripcion', width: 30 },
      { header: 'Fecha Egreso', key: 'fechaegreso', width: 16 },
      { header: 'Observaciones', key: 'observaciones', width: 28 },
    ];

    // Encabezado (logo más pequeño)
    worksheet.spliceRows(1, 0, [], [], []);
    for (let r = 1; r <= 3; r++) worksheet.getRow(r).height = 22;
    try {
      const logoPath = path.join(__dirname, '../../../src/assets/logoClinica2.png');
      if (fs.existsSync(logoPath)) {
        const imageId = workbook.addImage({ filename: logoPath, extension: 'png' });
        // Colocar logo en un área más pequeña
        worksheet.addImage(imageId, 'A1:B3');
      }
    } catch {}
    const colCount = worksheet.columns.length;
    worksheet.mergeCells(2, 1, 2, colCount);
    worksheet.getCell(2, 1).value = 'Reporte de Pacientes Egresados';
    worksheet.getCell(2, 1).font = { bold: true, size: 16, color: { argb: 'FF166534' } };
    worksheet.getCell(2, 1).alignment = { horizontal: 'center' };

    const filtrosResumen = (() => {
      const parts = [];
      if (fechainicio) parts.push(`Desde: ${fechainicio}`);
      if (fechafin) parts.push(`Hasta: ${fechafin}`);
      if (causa) parts.push(`Causa: ${causa}`);
      return parts.join(' | ') || 'Sin filtros';
    })();
    worksheet.mergeCells(3, 1, 3, colCount);
    worksheet.getCell(3, 1).value = `Generado: ${new Date().toLocaleString()} — ${filtrosResumen}`;
    worksheet.getCell(3, 1).font = { size: 11, color: { argb: 'FF475569' } };
    worksheet.getCell(3, 1).alignment = { horizontal: 'center' };

    // Encabezado de columnas verde
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

    // Helpers
    const calcEdad = (nac, corte) => {
      if (!nac) return '';
      const nacimiento = new Date(nac);
      const h = corte ? new Date(corte) : new Date();
      if (isNaN(nacimiento) || isNaN(h)) return '';
      let a = h.getFullYear() - nacimiento.getFullYear();
      const m = h.getMonth() - nacimiento.getMonth();
      const d = h.getDate() - nacimiento.getDate();
      if (m < 0 || (m === 0 && d < 0)) a--;
      return a >= 0 ? a : '';
    };
    const diffDMA = (desdeStr, hastaStr) => {
      if (!desdeStr) return '';
      const desde = new Date(desdeStr);
      const hasta = hastaStr ? new Date(hastaStr) : new Date();
      if (isNaN(desde) || isNaN(hasta) || hasta < desde) return '0-0-0';
      let anios = hasta.getFullYear() - desde.getFullYear();
      let meses = hasta.getMonth() - desde.getMonth();
      let dias = hasta.getDate() - desde.getDate();
      if (dias < 0) { meses -= 1; const prev = new Date(hasta.getFullYear(), hasta.getMonth(), 0).getDate(); dias += prev; }
      if (meses < 0) { anios -= 1; meses += 12; }
      return `${dias}-${meses}-${anios}`;
    };

    // Rows
    rows.forEach((r) => {
      worksheet.addRow({
        noafiliacion: r.noafiliacion || '',
        id_causa_egreso: r.id_causa_egreso || '',
        causa_descripcion: r.causa_descripcion || '',
        descripcion: r.descripcion || '',
        fechaegreso: r.fechaegreso || '',
        observaciones: r.observaciones || '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_egresos.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[EgresoReporte] /api/egreso/excel error:', error);
    res.status(500).json({ error: 'Error al exportar Excel.' });
  }
});

module.exports = router;
