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
    let baseQuery = `
        SELECT 
            pac.no_afiliacion, 
            pac.dpi, 
            pac.no_paciente_proveedor, 
            pac.primer_nombre, 
            pac.segundo_nombre, 
            pac.otros_nombres, 
            pac.primer_apellido, 
            pac.segundo_apellido, 
            pac.apellido_casada, 
            pac.fecha_nacimiento, 
            pac.sexo, 
            pac.direccion, 
            --pac.fecha_egreso, 
            --pac.no_caso_concluido, 
            --pac.id_causa, 
            --pac.causa_egreso, 
            --cau.descripcion as causaegreso_descripcion,
            pac.url_foto, 
            pac.id_departamento, 
            dep.nombre as departamento_nombre, 
            pac.id_estado, 
            est.descripcion as estado_descripcion,
            pac.id_acceso, 
            acc.descripcion as acceso_descripcion,
            pac.id_jornada, 
            jor.descripcion as jornada_descripcion,
            --pac.fecha_inicio_periodo, 
            --pac.fecha_fin_periodo, 
            pac.sesiones_autorizadas_mes AS sesionesautorizadas
            --pac.observaciones
        FROM tbl_pacientes pac
        --LEFT JOIN tbl_causa_egreso cau ON pac.id_causa = cau.id_causa
        LEFT JOIN tbl_departamento dep ON pac.id_departamento = dep.id_departamento
        LEFT JOIN tbl_estados_paciente est ON pac.id_estado = est.id_estado
        LEFT JOIN tbl_acceso_vascular acc ON pac.id_acceso = acc.id_acceso
        LEFT JOIN tbl_jornadas jor ON pac.id_jornada = jor.id_jornada
        WHERE pac.id_estado != 3`;
    let params = [];
    if (dpi) {
        baseQuery += ' AND pac.dpi = $1';
        params.push(dpi);
    } else if (noafiliacion) {
        baseQuery += ' AND pac.no_afiliacion = $1';
        params.push(noafiliacion);
    } else {
        return res.status(400).json({ error: 'Debe proporcionar dpi o no_afiliacion.' });
    }
    try {
        const result = await pool.query(baseQuery, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar pacientes para egreso.', detalle: error.message });
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
            let innerResult;
        if (desdeReingreso) {
            // Si viene de reingreso, también actualizar idestado = 2 y limpiar campos de egreso
            innerResult = await client.query(`
                UPDATE public.tbl_pacientes 
                SET 
                    primerNombre = $1, 
                    segundoNombre = $2, 
                    primerApellido = $3, 
                    segundoApellido = $4,
                    numeroformulario = $5,
                    sesionesautorizadasmes = $6,
                    fechainicioperiodo = $7,
                    fechafinperiodo = $8,
                    observaciones = $9,
                    idestado = 2,
                    idcausa = NULL,
                    causaegreso = NULL,
                    fechaegreso = NULL,
                    nocasoconcluido = NULL
                WHERE noAfiliacion = $10
                RETURNING *
            `, [primerNombre, segundoNombre, primerApellido, segundoApellido, numeroformulario, sesionesautorizadasmes, fechainicioperiodo, fechafinperiodo, observaciones, noAfiliacion]);
        } else if (desdeEgreso) {
            // Egreso de paciente (incluye fallecimiento)
            innerResult = await client.query(`
                UPDATE public.tbl_pacientes
                SET
                    idestado = 3,
                    idcausa = $1,
                    causaegreso = $2,
                    fechaegreso = $3::date,
                    nocasoconcluido = $4,
                    observaciones = $5,
                    comorbilidades = COALESCE($6, NULL),
                    fechafallecido = COALESCE($7::date, NULL),
                    lugarfallecimiento = COALESCE($8, NULL),
                    causafallecimiento = COALESCE($9, NULL)
                WHERE noAfiliacion = $10
                RETURNING *
            `, [idcausa, causaegreso, fechaegreso, nocasoconcluido, observaciones, comorbilidades, fechafallecimiento, lugarfallecimiento, causafallecimiento, noAfiliacion]);
        } else {
            // Si no, no modificar idestado
            innerResult = await client.query(`
                UPDATE public.tbl_pacientes 
                SET 
                    primerNombre = $1, 
                    segundoNombre = $2, 
                    primerApellido = $3, 
                    segundoApellido = $4,
                    numeroformulario = $5,
                    sesionesautorizadasmes = $6,
                    fechainicioperiodo = $7,
                    fechafinperiodo = $8,
                    observaciones = $9
                WHERE noAfiliacion = $10
                RETURNING *
            `, [primerNombre, segundoNombre, primerApellido, segundoApellido, numeroformulario, sesionesautorizadasmes, fechainicioperiodo, fechafinperiodo, observaciones, noAfiliacion]);
        }

            return innerResult;
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
      // Bloquear fila de paciente para evitar carreras y deadlocks
      try {
        await client.query(
          `SELECT 1 FROM public.tbl_pacientes WHERE no_afiliacion = $1 FOR UPDATE NOWAIT`,
          [no_afiliacion]
        );
      } catch (e) {
        if (e && e.code === '55P03') {
          throw new Error('LOCKED');
        }
        throw e;
      }
      let inner = null;

    if (id_causa_egreso === '2') {  // Egreso normal
      idEstado = 3; // Paciente Egresado
      // Actualizar estado del paciente primero
      const updateQueryFirst = `
        UPDATE public.tbl_pacientes
        SET id_estado = $2,
            fecha_actualizacion = NOW()
        WHERE no_afiliacion = $1
        RETURNING *;
      `;
      await client.query(updateQueryFirst, [no_afiliacion, idEstado]);
      const insertQuery = `
        INSERT INTO public.tbl_egresos (
          no_afiliacion,
          id_causa_egreso,
          descripcion,
          fecha_egreso,
          observaciones,
          usuario_creacion,
          fecha_creacion
        )
        VALUES ($1, $2, $3, $4::date, $5, NULL, NOW())
        RETURNING *;
      `;
      const insertValues = [
        no_afiliacion,
        id_causa_egreso,
        descripcion || null,
        fecha_egreso || null,
        observaciones || null
      ];
      inner = await client.query(insertQuery, insertValues);
    }

    if (id_causa_egreso === '1') {  // Fallecimiento
      idEstado = 5; // Paciente fallecido
      // Actualizar estado del paciente primero
      const updateQueryFirst = `
        UPDATE public.tbl_pacientes
        SET id_estado = $2,
            fecha_actualizacion = NOW()
        WHERE no_afiliacion = $1
        RETURNING *;
      `;
      await client.query(updateQueryFirst, [no_afiliacion, idEstado]);
      const insertQuery = `
        INSERT INTO public.tbl_fallecimientos (
          no_afiliacion,
          comorbilidades,
          fechafallecido,
          lugarfallecimiento,
          causafallecimiento,
          observaciones,
          usuario_creacion,
          fecha_creacion
        )
        VALUES ($1, $2, $3::date, $4, $5, $6, NULL, NOW())
        RETURNING *;
      `;
      const insertValues = [
        no_afiliacion,
        comorbilidades || null,
        fechafallecimiento || null,
        lugarfallecimiento || null,
        causafallecimiento || null,
        observaciones || null
      ];
      inner = await client.query(insertQuery, insertValues);
    }
      // Devolver último estado del paciente (ya actualizado) y el insert
      const resultUpdate = await client.query(
        `SELECT * FROM public.tbl_pacientes WHERE no_afiliacion = $1`,
        [no_afiliacion]
      );
      return { insert: inner?.rows?.[0] || null, update: resultUpdate.rows?.[0] || null };
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
    let baseQuery = `select * from  tbl_causa_egreso where estado = true;`;
    try {
        const result = await pool.query(baseQuery);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar pacientes para egreso.', detalle: error.message });
    }
});




module.exports = router;
