const express = require('express');
const pool = require('../../db/pool');
const router = express.Router();
router.use(express.json());
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

async function getNombreUsuario(req) {
  try {
    const auth = req.headers?.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
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

// POST /api/referencias - Registrar una nueva referencia
router.post('/api/referencias', async (req, res) => {
  const { noafiliacion, fechareferencia, motivotraslado, idmedico, especialidadreferencia } = req.body;
  if (!noafiliacion || !fechareferencia || !motivotraslado || !idmedico || !especialidadreferencia) {
    return res.status(400).json({ detail: 'Todos los campos son obligatorios.' });
  }
  try {
    // Verificar que el paciente exista y no esté egresado (opcional: aquí solo validamos existencia)
    const { rows: pacRows } = await pool.query('SELECT 1 FROM public.tbl_pacientes WHERE no_afiliacion = $1', [noafiliacion]);
    if (pacRows.length === 0) {
      return res.status(404).json({ detail: 'Paciente no encontrado.' });
    }

    // Asegurar secuencia para código de referencia
    await pool.query("CREATE SEQUENCE IF NOT EXISTS public.seq_codigo_referencia");
    const { rows: seqRows } = await pool.query("SELECT nextval('public.seq_codigo_referencia') AS corr");
    const corr = seqRows[0]?.corr;
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const m = String(now.getMonth() + 1); // mes sin cero a la izquierda
    const id_referencia = `${yyyy}${m}INFREF${corr}`;

    const usuarioNombre = await getNombreUsuario(req);

    const insertSql = `
      INSERT INTO public.tbl_referencias (
        id_referencia, no_afiliacion, fecha_referencia, motivo_traslado,
        usuario_creacion, fecha_creacion,
        id_medico, especialidad_referencia
      ) VALUES (
        $1, $2, $3, $4,
        $5, NOW(),
        $6, $7
      ) RETURNING *;
    `;
    const params = [
      id_referencia,
      noafiliacion,
      fechareferencia,
      motivotraslado,
      usuarioNombre || 'sistema',
      idmedico,
      especialidadreferencia
    ];

    const { rows: insRows } = await pool.query(insertSql, params);

    res.status(201).json({ success: true, referencia: insRows[0] });
  } catch (err) {
    console.error('Error al registrar referencia:', err);
    res.status(500).json({ detail: 'Error al registrar referencia.' });
  }
});

// GET /api/referencias - Consultar referencias con filtros opcionales
router.get('/api/referencias', async (req, res) => {
  try {
    let baseQuery = `
      SELECT 
        r.id_referencia AS idreferencia,
        r.no_afiliacion AS noafiliacion,
        p.primer_nombre AS primernombre,
        p.segundo_nombre AS segundonombre,
        p.primer_apellido AS primerapellido,
        p.segundo_apellido AS segundoapellido,
        r.fecha_referencia AS fechareferencia,
        r.motivo_traslado AS motivotraslado,
        r.id_medico AS idmedico,
        m.nombre_completo AS nombremedico,
        r.especialidad_referencia AS especialidadreferencia,
        r.usuario_creacion, r.fecha_creacion
      FROM public.tbl_referencias r
      LEFT JOIN public.tbl_pacientes p ON r.no_afiliacion = p.no_afiliacion
      LEFT JOIN public.tbl_medicos m ON r.id_medico = m.id_medico
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (req.query.desde) {
      baseQuery += ` AND r.fecha_referencia >= $${idx}`;
      params.push(req.query.desde);
      idx++;
    }
    if (req.query.hasta) {
      baseQuery += ` AND r.fecha_referencia <= $${idx}`;
      params.push(req.query.hasta);
      idx++;
    }
    if (req.query.idmedico) {
      baseQuery += ` AND r.id_medico = $${idx}`;
      params.push(req.query.idmedico);
      idx++;
    }
    baseQuery += ' ORDER BY r.fecha_creacion DESC';
    const result = await pool.query(baseQuery, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al consultar referencias:', err);
    res.status(500).json({ detail: 'Error al consultar referencias.' });
  }
});

module.exports = router;
