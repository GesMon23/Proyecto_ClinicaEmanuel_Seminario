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

    const filtroCampo = noafiliacion ? 'p.no_afiliacion' : 'p.dpi';
    const filtroVal   = noafiliacion ? noafiliacion : dpi;

    // Trae datos del paciente (id_estado=3) + último egreso + descripciones
    // Requisito: que exista egreso
    const sql = `
      SELECT
        p.no_afiliacion          AS noafiliacion,
        p.dpi,
        p.no_paciente_proveedor  AS nopacienteproveedor,
        p.primer_nombre          AS primernombre,
        p.segundo_nombre         AS segundonombre,
        p.otros_nombres          AS otrosnombres,
        p.primer_apellido        AS primerapellido,
        p.segundo_apellido       AS segundoapellido,
        p.apellido_casada        AS apellidocasada,
        p.fecha_nacimiento       AS fechanacimiento,
        p.sexo,
        p.direccion,
        p.id_estado              AS idestado,
        dpt.nombre               AS departamento_nombre,
        est.descripcion          AS estado_descripcion,
        jor.descripcion          AS jornada_descripcion,
        acc.descripcion          AS acceso_descripcion,
        p.sesiones_autorizadas_mes AS sesiones_autorizadas_mes,
        p.inicio_prest_servicios   AS inicio_prest_servicios,
        p.fin_prest_servicios      AS fin_prest_servicios,
        eg.id_causa_egreso       AS idcausa,
        eg.descripcion           AS descripcionegreso,
        eg.fecha_egreso          AS fechaegreso,
        p.url_foto               AS urlfoto
      FROM public.tbl_pacientes p
      LEFT JOIN public.tbl_departamento dpt     ON dpt.id_departamento = p.id_departamento
      LEFT JOIN public.tbl_estados_paciente est ON est.id_estado       = p.id_estado
      LEFT JOIN public.tbl_jornadas jor         ON jor.id_jornada      = p.id_jornada
      LEFT JOIN public.tbl_acceso_vascular acc  ON acc.id_acceso       = p.id_acceso
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
      const inicioPrest      = (b.inicioPrestServicios ? String(b.inicioPrestServicios).trim() : null) || null; // date
      const finPrest         = (b.finPrestServicios ? String(b.finPrestServicios).trim() : null) || null;        // date
      const sesionesMes      = (b.sesionesAutorizadasMes !== undefined && b.sesionesAutorizadasMes !== null && b.sesionesAutorizadasMes !== '')
                                ? Number(b.sesionesAutorizadasMes)
                                : null; // integer

      if (!noAfiliacion || !numeroFormulario || !fechaReingreso) {
        throw new Error('VALIDATION:noAfiliacion, numeroFormulario y fechaReingreso son obligatorios.');
      }

      // 1) Validar paciente egresado (id_estado = 3)
      const qPac = `
        SELECT id_estado
        FROM public.tbl_pacientes
        WHERE no_afiliacion = $1
        FOR UPDATE
      `;
      const rPac = await client.query(qPac, [noAfiliacion]);
      if (!rPac.rowCount) {
        throw new Error('NOT_FOUND:Paciente no encontrado.');
      }
      if (Number(rPac.rows[0].id_estado) !== 3) {
        throw new Error('CONFLICT:El paciente no está en estado Egresado (id_estado = 3).');
      }

      // 2) Validar que tenga egreso registrado
      const qEg = `SELECT 1 FROM public.tbl_egresos WHERE no_afiliacion = $1 LIMIT 1`;
      const rEg = await client.query(qEg, [noAfiliacion]);
      if (!rEg.rowCount) {
        throw new Error('CONFLICT:No existe egreso registrado para este paciente.');
      }

      // 2.1) Verificar existencia previa del mismo (no_afiliacion, numero_formulario) en reingresos
      const qExistRei = `SELECT 1 FROM public.tbl_reingresos WHERE no_afiliacion = $1 AND numero_formulario = $2 LIMIT 1`;
      const rExistRei = await client.query(qExistRei, [noAfiliacion, numeroFormulario]);
      const shouldInsertReingreso = rExistRei.rowCount === 0;

      // 3) Actualizar paciente
      const qUpd = `
        UPDATE public.tbl_pacientes
        SET
          numero_formulario_activo = $2,
          id_estado                 = 4,
          sesiones_autorizadas_mes  = $3,
          inicio_prest_servicios    = $4,
          fin_prest_servicios       = $5
        WHERE no_afiliacion = $1
      `;
      await client.query(qUpd, [
        noAfiliacion,
        numeroFormulario,
        sesionesMes,
        inicioPrest,
        finPrest
      ]);

      // 4) Insert en tbl_reingresos (solo si no existe ya ese par)
      if (shouldInsertReingreso) {
        const qIns = `
          INSERT INTO public.tbl_reingresos
          (no_afiliacion, numero_formulario, fecha_reingreso, observaciones,
           usuario_creacion, fecha_creacion, usuario_actualizacion, fecha_actualizacion,
           usuario_eliminacion, fecha_eliminacion)
          VALUES ($1,$2,$3,$4,NULL,NOW(),NULL,NULL,NULL,NULL)
        `;
        await client.query(qIns, [noAfiliacion, numeroFormulario, fechaReingreso, observaciones]);
      }

      return { inserted: shouldInsertReingreso };
    });

    return res.json({ success: true, inserted: result.inserted });
  } catch (err) {
    const msg = String(err.message || 'Error');
    if (msg.startsWith('VALIDATION:')) {
      return res.status(400).json({ success: false, error: msg.slice('VALIDATION:'.length) });
    }
    if (msg.startsWith('NOT_FOUND:')) {
      return res.status(404).json({ success: false, error: msg.slice('NOT_FOUND:'.length) });
    }
    if (msg.startsWith('CONFLICT:')) {
      return res.status(409).json({ success: false, error: msg.slice('CONFLICT:'.length) });
    }
    console.error('[POST /api/reingreso/pacientes/reingreso] ERROR:', err);
    return res.status(500).json({ success: false, error: 'Error al registrar el reingreso.' });
  }
});

module.exports = router;
