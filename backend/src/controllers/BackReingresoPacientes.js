const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');

// GET /api/reingreso/pacientes/reingreso?noafiliacion=... | dpi=...
// Devuelve SOLO egresados (id_estado=3) que tengan registro en tbl_egresos
router.get('/pacientes/reingreso', async (req, res) => {
  try {
    const { noafiliacion, dpi } = req.query;
    if (!noafiliacion && !dpi) {
      return res.status(400).json({ error: 'Debe proporcionar noafiliacion o dpi.' });
    }

    const filtroCampo = noafiliacion ? 'p.no_afiliacion' : 'p.dpi';
    const filtroVal   = noafiliacion ? noafiliacion : dpi;

    // Trae datos del paciente (id_estado=3) + último egreso
    // Requisito: que exista egreso
    const sql = `
      SELECT
        p.no_afiliacion        AS noafiliacion,
        p.dpi,
        p.no_paciente_proveedor AS nopacienteproveedor,
        p.primer_nombre        AS primernombre,
        p.segundo_nombre       AS segundonombre,
        p.otros_nombres        AS otrosnombres,
        p.primer_apellido      AS primerapellido,
        p.segundo_apellido     AS segundoapellido,
        p.apellido_casada      AS apellidocasada,
        p.fecha_nacimiento     AS fechanacimiento,
        p.sexo,
        p.direccion,
        p.id_estado            AS idestado,
        eg.id_causa_egreso     AS idcausa,
        eg.descripcion         AS descripcionegreso,
        eg.fecha_egreso        AS fechaegreso,
        p.url_foto             AS urlfoto
      FROM public.tbl_pacientes p
      JOIN LATERAL (
        SELECT e.id_causa_egreso, e.descripcion, e.fecha_egreso
        FROM public.tbl_egresos e
        WHERE e.no_afiliacion = p.no_afiliacion
        ORDER BY e.fecha_egreso DESC NULLS LAST
        LIMIT 1
      ) eg ON TRUE
      WHERE p.id_estado = 3
        AND ${filtroCampo} = $1
    `;
    const { rows } = await pool.query(sql, [filtroVal]);
    // Si no hay filas, o no hay egreso, no es elegible
    return res.json(rows);
  } catch (err) {
    console.error('[GET /api/reingreso/pacientes/reingreso] ERROR:', err);
    res.status(500).json({ error: 'Error al buscar pacientes para reingreso.' });
  }
});

// POST /api/reingreso/pacientes/reingreso
// Body: { noAfiliacion, numeroFormulario, fechaReingreso, observaciones, usuario }
router.post('/pacientes/reingreso', async (req, res) => {
  const client = await pool.connect();
  try {
    const b = req.body || {};
    const noAfiliacion     = String(b.noAfiliacion || '').trim();
    const numeroFormulario = String(b.numeroFormulario || '').trim();
    const fechaReingreso   = String(b.fechaReingreso || '').trim(); // 'YYYY-MM-DD'
    const observaciones    = (b.observaciones ?? '').trim() || null;
    const usuario          = (b.usuario ?? 'web').trim();

    if (!noAfiliacion || !numeroFormulario || !fechaReingreso) {
      return res.status(400).json({ success: false, error: 'noAfiliacion, numeroFormulario y fechaReingreso son obligatorios.' });
    }

    await client.query('BEGIN');

    // 1) Validar paciente egresado (id_estado = 3)
    const qPac = `
      SELECT id_estado
      FROM public.tbl_pacientes
      WHERE no_afiliacion = $1
      FOR UPDATE
    `;
    const rPac = await client.query(qPac, [noAfiliacion]);
    if (!rPac.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Paciente no encontrado.' });
    }
    if (Number(rPac.rows[0].id_estado) !== 3) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, error: 'El paciente no está en estado Egresado (id_estado = 3).' });
    }

    // 2) Validar que tenga egreso registrado
    const qEg = `SELECT 1 FROM public.tbl_egresos WHERE no_afiliacion = $1 LIMIT 1`;
    const rEg = await client.query(qEg, [noAfiliacion]);
    if (!rEg.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, error: 'No existe egreso registrado para este paciente.' });
    }

    // 3) Actualizar paciente: numero_formulario_activo + id_estado = 4 (Reingreso)
    const qUpd = `
      UPDATE public.tbl_pacientes
      SET
        numero_formulario_activo = $2,
        id_estado               = 4,
        usuario_actualizacion   = $3,
        fecha_actualizacion     = NOW()
      WHERE no_afiliacion = $1
    `;
    await client.query(qUpd, [noAfiliacion, numeroFormulario, usuario]);

    // 4) Insert en tbl_reingresos
    const qIns = `
      INSERT INTO public.tbl_reingresos
      (no_afiliacion, numero_formulario, fecha_reingreso, observaciones,
       usuario_creacion, fecha_creacion, usuario_actualizacion, fecha_actualizacion,
       usuario_eliminacion, fecha_eliminacion)
      VALUES ($1,$2,$3,$4,$5,NOW(),NULL,NULL,NULL,NULL)
    `;
    await client.query(qIns, [noAfiliacion, numeroFormulario, fechaReingreso, observaciones, usuario]);

    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /api/reingreso/pacientes/reingreso] ERROR:', err);
    res.status(500).json({ success: false, error: 'Error al registrar el reingreso.' });
  } finally {
    client.release();
  }
});

module.exports = router;
