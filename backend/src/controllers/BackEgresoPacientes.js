// Router de Login/Roles
const express = require('express');
const pool = require('../../db/pool');
const jwt = require('jsonwebtoken');
const { runWithUser } = require('../db');

const router = express.Router();
router.use(express.json());

// Endpoint para buscar pacientes para egreso
router.get('/api/pacientes/egreso', async (req, res) => {
  const { dpi, noafiliacion } = req.query;
  if (!dpi && !noafiliacion) {
    return res.status(400).json({ error: 'Debe proporcionar dpi o no_afiliacion.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cursorName = 'cur_pacientes_para_egreso';
    await client.query('CALL public.sp_pacientes_para_egreso($1, $2, $3)', [dpi || null, noafiliacion || null, cursorName]);
    const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
    await client.query('COMMIT');
    return res.json(fetchRes.rows || []);
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ error: 'Error al buscar pacientes para egreso.', detalle: error.message });
  } finally {
    client.release();
  }
});

router.put('/pacientes/:noAfiliacion', async (req, res) => {
    // Derivar usuario desde JWT
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
        const { idcausa, causaegreso, fechaegreso, nocasoconcluido, observaciones, comorbilidades, fechafallecimiento, lugarfallecimiento, causafallecimiento, desdeEgreso, desdeReingreso, primerNombre, segundoNombre, primerApellido, segundoApellido, numeroformulario, sesionesautorizadasmes, fechainicioperiodo, fechafinperiodo } = req.body;

        const result = await runWithUser(String(userName), async (client) => {
          await client.query('BEGIN');
          const cursorName = 'cur_paciente_actualizacion_egreso';
          if (desdeReingreso) {
            await client.query('CALL public.sp_paciente_reingreso_actualizar($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [
              noAfiliacion,
              primerNombre, segundoNombre, primerApellido, segundoApellido,
              numeroformulario, sesionesautorizadasmes, fechainicioperiodo, fechafinperiodo,
              observaciones, String(userName)
            ]);
          } else if (desdeEgreso) {
            await client.query('CALL public.sp_paciente_egreso($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [
              noAfiliacion,
              idcausa, causaegreso, fechaegreso, nocasoconcluido,
              observaciones, comorbilidades, fechafallecimiento, lugarfallecimiento, causafallecimiento,
              String(userName)
            ]);
          } else {
            await client.query('CALL public.sp_paciente_reingreso_actualizar($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [
              noAfiliacion,
              primerNombre, segundoNombre, primerApellido, segundoApellido,
              numeroformulario, sesionesautorizadasmes, fechainicioperiodo, fechafinperiodo,
              observaciones, String(userName)
            ]);
          }
          const updated = await client.query('SELECT * FROM public.tbl_pacientes WHERE no_afiliacion = $1', [noAfiliacion]);
          await client.query('COMMIT');
          return updated;
        });

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({ detail: 'Paciente no encontrado' });
        }

        res.json({
            success: true,
            message: "Paciente actualizado exitosamente",
            paciente: result.rows[0]
        });
    } catch (err) {
        console.error('Error en PUT /pacientes/:noAfiliacion:', err.message, err.stack);
        res.status(500).json({ detail: err.message });
    }
});

// Endpoint para insertar un egreso
router.post('/egresos', async (req, res) => {
  // Derivar usuario desde JWT
  let userName = 'web';
  try {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      const token = auth.slice(7);
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
      userName = payload?.nombre_usuario || String(payload?.sub || 'web');
    }
  } catch (_) {}

  let idEstado = 0;
  try {
    const {
      no_afiliacion,
      id_causa_egreso,
      descripcion,
      fecha_egreso,
      observaciones,
      fechafallecimiento,
      comorbilidades,
      lugarfallecimiento,
      causafallecimiento
    } = req.body;

    
    const resultInsert = await runWithUser(String(userName), async (client) => {
      try {
        const dbg = await client.query(
          "SELECT current_setting('app.current_user', true) AS app_user, current_user AS db_user, current_schema() AS schema, current_setting('search_path', true) AS search_path"
        );
        console.log('[EGRESO DEBUG] app_user=%s db_user=%s schema=%s search_path=%s', dbg.rows?.[0]?.app_user, dbg.rows?.[0]?.db_user, dbg.rows?.[0]?.schema, dbg.rows?.[0]?.search_path);
      } catch (e) {
        console.warn('[EGRESO DEBUG] No se pudo leer GUC/search_path:', e?.message || e);
      }
      await client.query('BEGIN');
      const curPaciente = 'cur_paciente_updated_after_egreso';
      const curInsert = 'cur_egreso_insertado';
      await client.query('CALL public.sp_paciente_registrar_egreso($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', [
        no_afiliacion,
        id_causa_egreso,
        descripcion || null,
        fecha_egreso || null,
        observaciones || null,
        comorbilidades || null,
        fechafallecimiento || null,
        lugarfallecimiento || null,
        causafallecimiento || null,
        String(userName),
        curPaciente,
        curInsert,
        'cur_tipo'
      ]);
      const updated = await client.query(`FETCH ALL FROM "${curPaciente}"`);
      const inserted = await client.query(`FETCH ALL FROM "${curInsert}"`);
      await client.query('COMMIT');
      return { insert: inserted.rows?.[0] || null, update: updated.rows?.[0] || null };
    });

    res.json({
      success: true,
      message: 'Proceso Exitoso!!',
      egreso: resultInsert.insert,
      paciente: resultInsert.update
    });
  } catch (err) {
    if (err && (err.code === '55P03' || err.message === 'LOCKED')) {
      return res.status(409).json({ error: 'El paciente está siendo editado. Intente nuevamente.' });
    }
    console.error("Error en POST /egresos:", err.message, req.body, idEstado);
    res.status(500).json({ error: 'Error al insertar egreso', detalle: err.message });
  }
});


router.get('/causas_egreso', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cursorName = 'cur_causas_egreso_activas';
    await client.query('CALL public.sp_causas_egreso_activas($1)', [cursorName]);
    const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
    await client.query('COMMIT');
    res.json(fetchRes.rows || []);
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    res.status(500).json({ error: 'Error al obtener causas de egreso.', detalle: error.message });
  } finally {
    client.release();
  }
});




module.exports = router;
