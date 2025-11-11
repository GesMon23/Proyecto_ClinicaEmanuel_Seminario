const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');


// GET /pacientes - lista filtrada para la vista (server.js lo monta también bajo /api)
router.get('/pacientes', async (req, res) => {
  try {
    const { fechainicio, fechafin, estado, numeroformulario, jornada, accesovascular, sexo, departamento } = req.query;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_pacientes_reporte';
      await client.query('CALL public.sp_pacientes_reporte_filtrado($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
        fechainicio || null,
        fechafin || null,
        estado || null,
        numeroformulario || null,
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
    console.error('[PacientesReporte] /pacientes error:', error);
    res.status(500).json({ error: 'Error al buscar pacientes.' });
  }
});

// Catálogos para filtros en PacientesReporte (SP + cursores)
router.get('/pacientes/catalogos', async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const c0 = 'cur_cat_estados';
    const c1 = 'cur_cat_jornadas';
    const c2 = 'cur_cat_accesos';
    const c3 = 'cur_cat_deptos';
    const c4 = 'cur_cat_sexos';
    await client.query('CALL public.sp_pacientes_catalogo_estados($1)', [c0]);
    await client.query('CALL public.sp_nuevo_ingreso_catalogo_jornadas($1)', [c1]);
    await client.query('CALL public.sp_nuevo_ingreso_catalogo_accesos($1)', [c2]);
    await client.query('CALL public.sp_nuevo_ingreso_catalogo_departamentos($1)', [c3]);
    await client.query('CALL public.sp_nuevo_ingreso_catalogo_sexos($1)', [c4]);
    const [r0, r1, r2, r3, r4] = await Promise.all([
      client.query(`FETCH ALL FROM "${c0}"`),
      client.query(`FETCH ALL FROM "${c1}"`),
      client.query(`FETCH ALL FROM "${c2}"`),
      client.query(`FETCH ALL FROM "${c3}"`),
      client.query(`FETCH ALL FROM "${c4}"`),
    ]);
    await client.query('COMMIT');
    res.json({
      estados: r0.rows.map(r => r.descripcion).filter(Boolean),
      jornadas: r1.rows.map(r => r.descripcion).filter(Boolean),
      accesos: r2.rows.map(r => r.descripcion).filter(Boolean),
      departamentos: r3.rows.map(r => r.nombre).filter(Boolean),
      sexos: r4.rows.map(r => r.sexo).filter(Boolean),
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('[PacientesReporte] /pacientes/catalogos error:', error);
    res.status(500).json({ error: 'Error al cargar catálogos.' });
  } finally {
    client.release();
  }
});
router.get('/pacientes/excel', async (req, res) => {
  try {
    const { fechainicio, fechafin, estado, numeroformulario, jornada, accesovascular, sexo, departamento } = req.query;
    const client = await pool.connect();
    let rows = [];
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_pacientes_reporte_excel';
      await client.query('CALL public.sp_pacientes_reporte_filtrado($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
        fechainicio || null,
        fechafin || null,
        estado || null,
        numeroformulario || null,
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
    const worksheet = workbook.addWorksheet('Pacientes');

    worksheet.columns = [
      { header: 'No. Afiliación', key: 'noafiliacion', width: 18 },
      { header: 'DPI', key: 'dpi', width: 16 },
      { header: 'No. Proveedor', key: 'nopacienteproveveedor', width: 18 },
      { header: 'Primer Nombre', key: 'primernombre', width: 18 },
      { header: 'Segundo Nombre', key: 'segundonombre', width: 18 },
      { header: 'Otros Nombres', key: 'otrosnombres', width: 18 },
      { header: 'Primer Apellido', key: 'primerapellido', width: 18 },
      { header: 'Segundo Apellido', key: 'segundoapellido', width: 18 },
      { header: 'Apellido de Casada', key: 'apellidocasada', width: 20 },
      { header: 'Fecha Nacimiento', key: 'fechanacimiento', width: 16 },
      { header: 'Edad', key: 'edad', width: 8 },
      { header: 'Sexo', key: 'sexo', width: 8 },
      { header: 'Dirección', key: 'direccion', width: 30 },
      { header: 'Departamento', key: 'departamento', width: 18 },
      { header: 'Fecha Ingreso', key: 'fechaingreso', width: 16 },
      { header: 'Estancia (D-M-A)', key: 'estancia', width: 16 },
      { header: 'Estado', key: 'estado', width: 18 },
      { header: 'Jornada', key: 'jornada', width: 14 },
      { header: 'Acceso Vascular', key: 'accesovascular', width: 18 },
      { header: 'No. Formulario', key: 'numeroformulario', width: 18 },
      { header: 'Inicio Periodo', key: 'fechainicioperiodo', width: 16 },
      { header: 'Fin Periodo', key: 'fechafinperiodo', width: 16 },
      { header: 'Observaciones', key: 'observaciones', width: 28 },
    ];

    // Encabezado con logo y título
    worksheet.spliceRows(1, 0, [], [], [], [], []);
    for (let r = 1; r <= 5; r++) worksheet.getRow(r).height = 28;
    try {
      const logoPath = require('path').join(__dirname, '../../../src/assets/logoClinica2.png');
      if (require('fs').existsSync(logoPath)) {
        const imageId = workbook.addImage({ filename: logoPath, extension: 'png' });
        worksheet.addImage(imageId, 'A1:D5');
      }
    } catch {}
    const colCount = worksheet.columns.length;
    worksheet.mergeCells(2, 1, 2, colCount);
    worksheet.getCell(2, 1).value = 'Reporte de Pacientes';
    worksheet.getCell(2, 1).font = { bold: true, size: 16, color: { argb: 'FF166534' } };
    worksheet.getCell(2, 1).alignment = { horizontal: 'center' };

    const filtrosResumen = (() => {
      const parts = [];
      if (fechainicio) parts.push(`Desde: ${fechainicio}`);
      if (fechafin) parts.push(`Hasta: ${fechafin}`);
      if (estado) parts.push(`Estado: ${estado}`);
      if (numeroformulario) parts.push(`Formulario: ${numeroformulario}`);
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

    // Agregar encabezado de columnas (fila con color verde)
    const headerRowIndex = 6; // Después de 5 filas usadas por el encabezado visual
    const headerValues = worksheet.columns.map(c => c.header);
    worksheet.insertRow(headerRowIndex, headerValues);
    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }; // verde
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF0F172A' } },
        bottom: { style: 'thin', color: { argb: 'FF0F172A' } },
        right: { style: 'thin', color: { argb: 'FF0F172A' } },
      };
    });

    // AutoFilter y congelar panel en encabezado
    const colCountForFilter = worksheet.columns.length;
    const colLetter = (n) => {
      let s = '';
      while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
      return s;
    };
    worksheet.autoFilter = {
      from: `A${headerRowIndex}`,
      to: `${colLetter(colCountForFilter)}${headerRowIndex}`,
    };
    worksheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];

    // Helpers de fecha para edad y estancia
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

    // Poblar filas con edad y estancia calculadas (corte en fecha de fallecimiento si aplica)
    rows.forEach((r) => {
      const corte = r.fechafallecido || null;
      const edad = calcEdad(r.fechanacimiento, corte);
      const estancia = diffDMA(r.fechaingreso, corte);
      worksheet.addRow({
        noafiliacion: r.noafiliacion || '',
        dpi: r.dpi || '',
        nopacienteproveedor: r.nopacienteproveedor || '',
        primernombre: r.primernombre || '',
        segundonombre: r.segundonombre || '',
        otrosnombres: r.otrosnombres || '',
        primerapellido: r.primerapellido || '',
        segundoapellido: r.segundoapellido || '',
        apellidocasada: r.apellidocasada || '',
        fechanacimiento: r.fechanacimiento || '',
        edad: edad,
        sexo: r.sexo || '',
        direccion: r.direccion || '',
        departamento: r.departamento || '',
        fechaingreso: r.fechaingreso || '',
        estancia: estancia,
        estado: r.estado || '',
        jornada: r.jornada || '',
        accesovascular: r.accesovascular || '',
        numeroformulario: r.numeroformulario || '',
        fechainicioperiodo: r.fechainicioperiodo || '',
        fechafinperiodo: r.fechafinperiodo || '',
        observaciones: r.observaciones || '',
      });
    });


    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_pacientes.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[PacientesReporte] /api/pacientes/excel error:', error);
    res.status(500).json({ error: 'Error al exportar Excel.' });
  }
});

module.exports = router;