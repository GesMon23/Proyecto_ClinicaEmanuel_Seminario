const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const jwt = require('jsonwebtoken');

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
    const sql = `
      SELECT idlaboratorio, no_afiliacion, idperlaboratorio, fecha_laboratorio,
             infeccion_acceso, complicacion_acceso, observacion, examen_realizado,
             causa_no_realizado, virologia, antigeno_hepatitis_c, antigeno_superficie,
             hiv, fecha_registro
      FROM public.tbl_laboratorios
      WHERE no_afiliacion = $1
      ORDER BY fecha_laboratorio DESC, fecha_registro DESC
    `;
    const { rows } = await pool.query(sql, [noafiliacion]);
    return res.json({ success: true, data: rows });
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

    // usuario (para auditoría en parámetros)
    const usuarioNombre = await getNombreUsuario(req);

    // Iniciar transacción
    await pool.query('BEGIN');

    const insertSql = `
      INSERT INTO public.tbl_laboratorios(
        no_afiliacion, idperlaboratorio, fecha_laboratorio,
        infeccion_acceso, complicacion_acceso, observacion, examen_realizado,
        causa_no_realizado, virologia, antigeno_hepatitis_c, antigeno_superficie,
        hiv, fecha_registro
      ) VALUES (
        $1, $2, $3,
        $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13
      )
      RETURNING idlaboratorio
    `;

    const paramsLab = [
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
      fecha_registro ?? new Date().toISOString(),
    ];

    const { rows } = await pool.query(insertSql, paramsLab);
    const newId = rows?.[0]?.idlaboratorio;

    let inserted = 0;
    if (Array.isArray(parametros) && parametros.length > 0 && newId) {
      // Insertar cada parámetro (ignorando vacíos)
      for (const p of parametros) {
        const nombre = (p && p.parametro != null) ? String(p.parametro).trim() : '';
        const valor = (p && p.valor != null) ? String(p.valor).trim() : '';
        if (!nombre || !valor) continue;
        const insertParamSql = `
          INSERT INTO public.tbl_parametros_laboratorio(
            idlaboratorio, parametro, valor, usuario_creacion, fecha_creacion
          ) VALUES ($1, $2, $3, $4, NOW())
        `;
        await pool.query(insertParamSql, [newId, nombre, valor, usuarioNombre]);
        inserted++;
      }
    }

    await pool.query('COMMIT');

    return res.status(201).json({
      message: 'Registro de laboratorio guardado exitosamente',
      idlaboratorio: newId,
      parametros_insertados: inserted
    });
  } catch (error) {
    try { await pool.query('ROLLBACK'); } catch (_) {}
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
    // Para cada 'parametro', obtener la última anotación registrada para el paciente,
    // independientemente del laboratorio al que pertenezca.
    // Priorizamos por fecha de laboratorio y fecha de registro (tabla laboratorios),
    // y como desempate usamos fecha_creacion e idparametro (tabla parametros).
    const { rows: paramRows } = await pool.query(
      `SELECT DISTINCT ON (p.parametro)
              p.idparametro,
              p.idlaboratorio,
              p.parametro,
              p.valor,
              p.usuario_creacion,
              p.fecha_creacion,
              p.usuario_actualizacion,
              p.fecha_actualizacion,
              l.fecha_laboratorio,
              l.fecha_registro
       FROM public.tbl_parametros_laboratorio p
       INNER JOIN public.tbl_laboratorios l ON l.idlaboratorio = p.idlaboratorio
       WHERE l.no_afiliacion = $1
       ORDER BY p.parametro,
                l.fecha_laboratorio DESC NULLS LAST,
                l.fecha_registro DESC NULLS LAST,
                p.fecha_creacion DESC NULLS LAST,
                p.idparametro DESC`,
      [noafiliacion]
    );
    return res.json({ success: true, idlaboratorio: null, data: paramRows });
  } catch (error) {
    console.error('Error en Laboratorios GET /:noafiliacion/parametros/ultimo:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor', detalle: error.message });
  }
});

module.exports = router;
