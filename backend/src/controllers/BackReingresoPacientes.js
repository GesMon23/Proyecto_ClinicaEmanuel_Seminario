const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const jwt = require('jsonwebtoken');
const { runWithUser } = require('../db');

// GET /api/reingreso/pacientes/reingreso?noafiliacion=... | dpi=...
// Devuelve SOLO egresados (id_estado=3) que tengan registro en tbl_egresos
router.get('/pacientes/reingreso', async (req, res) => {
  try {
    const { noafiliacion, dpi } = req.query;
    if (!noafiliacion && !dpi) {
      return res.status(400).json({ error: 'Debe proporcionar noafiliacion o dpi.' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_pacientes_para_reingreso';
      await client.query('CALL public.sp_pacientes_para_reingreso($1,$2,$3)', [dpi || null, noafiliacion || null, cur]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json(r.rows || []);
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('[GET /api/reingreso/pacientes/reingreso] ERROR:', e);
      return res.status(500).json({ error: 'Error al buscar pacientes para reingreso.' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[GET /api/reingreso/pacientes/reingreso] ERROR:', err);
    return res.status(500).json({ error: 'Error al buscar pacientes para reingreso.' });
  }
});

// POST /api/reingreso/pacientes/reingreso
// Body: { noAfiliacion, numeroFormulario, fechaReingreso, observaciones, inicioPrestServicios, finPrestServicios, sesionesAutorizadasMes }
router.post('/pacientes/reingreso', async (req, res) => {
  // Derivar usuario desde JWT y ejecutar dentro de runWithUser
  let userName = 'web';
  try {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      const token = auth.slice(7);
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
      userName = payload?.nombre_usuario || String(payload?.sub || 'web');
    }
  } catch (_) {}

  try {
    const result = await runWithUser(String(userName), async (client) => {
      const b = req.body || {};
      const noAfiliacion     = String(b.noAfiliacion || '').trim();
      const numeroFormulario = String(b.numeroFormulario || '').trim();
      const fechaReingreso   = String(b.fechaReingreso || '').trim(); // 'YYYY-MM-DD'
      const observaciones    = (b.observaciones ?? '').trim() || null;
      const inicioPrest      = (b.inicioPrestServicios ? String(b.inicioPrestServicios).trim() : null) || null;
      const finPrest         = (b.finPrestServicios ? String(b.finPrestServicios).trim() : null) || null;
      const sesionesMes      = (b.sesionesAutorizadasMes !== undefined && b.sesionesAutorizadasMes !== null && b.sesionesAutorizadasMes !== '')
                                ? Number(b.sesionesAutorizadasMes)
                                : null;

      if (!noAfiliacion || !numeroFormulario || !fechaReingreso) {
        return { kind: 'validation' };
      }

      await client.query('BEGIN');
      const curPaciente = 'cur_paciente_post_reingreso';
      const curInsert   = 'cur_reingreso_insertado';
      await client.query('CALL public.sp_paciente_reingreso_insertar($1,$2,$3,$4,$5,$6,$7,$8)', [
        noAfiliacion,
        numeroFormulario,
        sesionesMes,
        inicioPrest,
        finPrest,
        fechaReingreso,
        observaciones,
        curPaciente
      ]);
      const updated = await client.query(`FETCH ALL FROM "${curPaciente}"`);
      // Insert opcional devuelto por el SP en un refcursor separado si lo deseas
      // En esta versión asumimos que el SP hace el insert y basta con devolver el paciente actualizado
      await client.query('COMMIT');
      return { kind: 'ok', paciente: updated.rows?.[0] || null };
    });

    if (result.kind === 'validation') {
      return res.status(400).json({ success: false, error: 'noAfiliacion, numeroFormulario y fechaReingreso son obligatorios.' });
    }
    return res.json({ success: true, paciente: result.paciente });
  } catch (err) {
    console.error('[POST /api/reingreso/pacientes/reingreso] ERROR:', err);
    return res.status(500).json({ success: false, error: 'Error al registrar el reingreso.' });
  }
});

// PUT /api/reingreso/pacientes/:noAfiliacion (actualiza datos de reingreso del paciente)
router.put('/pacientes/:noAfiliacion', async (req, res) => {
  let userName = 'web';
  try {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      const token = auth.slice(7);
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
      userName = payload?.nombre_usuario || String(payload?.sub || 'web');
    }
  } catch (_) {}

  try {
    const { noAfiliacion } = req.params;
    const {
      primerNombre, segundoNombre, primerApellido, segundoApellido,
      numeroFormulario, sesionesAutorizadasMes, fechainicioperiodo, fechafinperiodo,
      observaciones
    } = req.body || {};

    const result = await runWithUser(String(userName), async (client) => {
      await client.query('BEGIN');
      await client.query('CALL public.sp_paciente_reingreso_actualizar($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [
        noAfiliacion,
        primerNombre || null,
        segundoNombre || null,
        primerApellido || null,
        segundoApellido || null,
        numeroFormulario || null,
        (sesionesAutorizadasMes !== undefined && sesionesAutorizadasMes !== null && sesionesAutorizadasMes !== '') ? Number(sesionesAutorizadasMes) : null,
        fechainicioperiodo || null,
        fechafinperiodo || null,
        observaciones || null,
        String(userName)
      ]);
      const updated = await client.query('SELECT * FROM public.tbl_pacientes WHERE no_afiliacion = $1', [noAfiliacion]);
      await client.query('COMMIT');
      return updated.rows?.[0] || null;
    });

    if (!result) return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    return res.json({ success: true, paciente: result });
  } catch (err) {
    console.error('[PUT /api/reingreso/pacientes/:noAfiliacion] ERROR:', err);
    return res.status(500).json({ success: false, error: 'Error al actualizar el reingreso.' });
  }
});

// POST /api/reingreso/historial/reingresos (inserta fila de historial)
router.post('/historial/reingresos', async (req, res) => {
  let userName = 'web';
  try {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      const token = auth.slice(7);
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
      userName = payload?.nombre_usuario || String(payload?.sub || 'web');
    }
  } catch (_) {}

  try {
    const { no_afiliacion, numero_formulario, fecha_reingreso, observaciones } = req.body || {};
    if (!no_afiliacion || !numero_formulario) {
      return res.status(400).json({ error: 'no_afiliacion y numero_formulario son obligatorios' });
    }

    const inserted = await runWithUser(String(userName), async (client) => {
      await client.query('BEGIN');
      const cur = 'cur_reingreso_insert';
      await client.query('CALL public.sp_reingreso_insertar($1,$2,$3,$4,$5,$6)', [
        String(no_afiliacion).trim(),
        String(numero_formulario).trim(),
        fecha_reingreso || null,
        observaciones || null,
        String(userName),
        cur
      ]);
      const r = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return r.rows?.[0] || null;
    });

    return res.status(201).json(inserted);
  } catch (error) {
    console.error('[POST /api/reingreso/historial/reingresos] ERROR:', error);
    return res.status(500).json({ error: 'Error al crear reingreso.' });
  }
});

module.exports = router;
