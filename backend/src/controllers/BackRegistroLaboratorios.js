const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const jwt = require('jsonwebtoken');
const { runWithUser } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function getUserIdFromReq(req) {
  try {
    const auth = req.headers?.authorization || '';
    const token = auth.startsWith('Bearer ')
      ? auth.slice(7)
      : null;
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET);
    return payload?.sub ? String(payload.sub) : null;
  } catch (_) {
    return null;
  }
}

async function getNombreUsuario(req) {
  try {
    const auth = req.headers?.authorization || '';
    const token = auth.startsWith('Bearer ')
      ? auth.slice(7)
      : null;
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET);
    const sub = payload?.sub;
    if (!sub) return null;
    const { rows } = await pool.query('SELECT * FROM fn_usuario_autenticado($1)', [sub]);
    const user = rows?.[0];
    return user?.nombre_usuario || null;
  } catch (_) {
    return null;
  }
}

// GET /:noafiliacion - listar registros de laboratorio por afiliación
router.get('/:noafiliacion', async (req, res) => {
  try {
    const { noafiliacion } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_labs_afiliacion';
      await client.query('CALL public.sp_laboratorios_por_afiliacion($1,$2)', [noafiliacion, cur]);
      const { rows } = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ success: true, data: rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('Error SP sp_laboratorios_por_afiliacion:', e);
      return res.status(500).json({ success: false, message: 'Error al listar laboratorios por afiliación' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error en Laboratorios GET /:noafiliacion:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor', detalle: error.message });
  }
});

// POST / - insertar un nuevo registro de laboratorio
// Cuerpo esperado (snake_case):
// {
//   idlaboratorio (opcional), no_afiliacion, idperlaboratorio, fecha_laboratorio,
//   infeccion_acceso, complicacion_acceso, observacion, examen_realizado,
//   causa_no_realizado, virologia, antigeno_hepatitis_c, antigeno_superficie,
//   hiv, fecha_registro (opcional)
// }
router.post('/', async (req, res) => {
  try {
    // Derivar usuario autenticado para GUC app.current_user
    let userName = 'web';
    try {
      const auth = req.headers?.authorization || '';
      if (auth.startsWith('Bearer ')) {
        const token = auth.slice(7);
        const payload = jwt.verify(token, JWT_SECRET);
        userName = payload?.nombre_usuario || String(payload?.sub || 'web');
      }
    } catch (_) {}

    const {
      // idlaboratorio: se ignora en inserción para permitir que la BD lo genere automáticamente
      no_afiliacion,
      idperlaboratorio,
      fecha_laboratorio,
      infeccion_acceso,
      complicacion_acceso,
      observacion,
      examen_realizado,
      causa_no_realizado,
      virologia,
      antigeno_hepatitis_c,
      antigeno_superficie,
      hiv,
      fecha_registro = null,
      parametros = [] // array opcional: [{ parametro, valor }]
    } = req.body || {};

    if (!no_afiliacion || !idperlaboratorio || !fecha_laboratorio) {
      return res.status(400).json({ error: 'no_afiliacion, idperlaboratorio y fecha_laboratorio son requeridos' });
    }

    const payload = await runWithUser(String(userName), async (client) => {
      await client.query('BEGIN');
      const cur = 'cur_ins_lab';
      const paramsAll = [
        no_afiliacion,
        idperlaboratorio,
        fecha_laboratorio,
        infeccion_acceso ?? null,
        complicacion_acceso ?? null,
        observacion ?? null,
        examen_realizado ?? null,
        causa_no_realizado ?? null,
        virologia ?? null,
        antigeno_hepatitis_c ?? null,
        antigeno_superficie ?? null,
        hiv ?? null,
        (fecha_registro ?? new Date().toISOString()),
        JSON.stringify(Array.isArray(parametros) ? parametros : []),
        cur
      ];
      await client.query('CALL public.sp_laboratorios_insertar($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)', paramsAll);
      const { rows } = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      const r = rows?.[0] || {};
      return { idlaboratorio: r.idlaboratorio || null, parametros_insertados: r.parametros_insertados || 0 };
    });

    return res.status(201).json({
      message: 'Registro de laboratorio guardado exitosamente',
      idlaboratorio: payload.idlaboratorio,
      parametros_insertados: payload.parametros_insertados
    });
  } catch (error) {
    if (error.code === 'P0001') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error en Laboratorios POST /:', error);
    return res.status(500).json({ error: 'Error interno del servidor', detalle: error.message });
  }
});

// GET /:noafiliacion/parametros/ultimo - obtener parámetros del último laboratorio del paciente
router.get('/:noafiliacion/parametros/ultimo', async (req, res) => {
  try {
    const { noafiliacion } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cur = 'cur_param_ult';
      await client.query('CALL public.sp_laboratorios_parametros_ultimo($1,$2)', [noafiliacion, cur]);
      const { rows } = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query('COMMIT');
      return res.json({ success: true, idlaboratorio: null, data: rows || [] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('Error SP sp_laboratorios_parametros_ultimo:', e);
      return res.status(500).json({ success: false, message: 'Error al obtener últimos parámetros' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error en Laboratorios GET /:noafiliacion/parametros/ultimo:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor', detalle: error.message });
  }
});

module.exports = router;
