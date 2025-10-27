// Router de Login/Roles
const express = require('express');
const pool = require('../../db/pool');
const jwt = require('jsonwebtoken');
const { runWithUser } = require('../db');
const fs = require('fs');
const path = require('path');

const router = express.Router();
router.use(express.json());
const fotosDir = path.join(__dirname, '../../fotos');
if (!fs.existsSync(fotosDir)) {
    fs.mkdirSync(fotosDir, { recursive: true });
}
//prueba
router.get('/Adepartamento', async (req, res) => {
  try {
        const client = await pool.connect();
        let rows = [];
        try {
            await client.query('BEGIN');
            const cursorName = 'cur_departamentos_lista';
            await client.query('CALL public.sp_departamentos_lista($1)', [cursorName]);
            const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
            rows = fetchRes.rows;
            await client.query('COMMIT');
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            throw e;
        } finally {
            client.release();
        }
        res.json(rows);
  } catch (error) {
        res.status(500).json({ error: 'Error al obtener departamentos.' });
  }
});

router.get('/Aaccesos-vascular', async (req, res) => {
  try {
        const client = await pool.connect();
        let rows = [];
        try {
            await client.query('BEGIN');
            const cursorName = 'cur_accesos_vasculares_activos';
            await client.query('CALL public.sp_accesos_vasculares_activos($1)', [cursorName]);
            const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
            rows = fetchRes.rows;
            await client.query('COMMIT');
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            throw e;
        } finally {
            client.release();
        }
        res.json(rows);
  } catch (error) {
        res.status(500).json({ error: 'Error al obtener accesos vasculares.' });
  }
});
//Cambios
// Endpoint para obtener jornadas
router.get('/Ajornada', async (req, res) => {
  try {
        const client = await pool.connect();
        let rows = [];
        try {
            await client.query('BEGIN');
            const cursorName = 'cur_jornadas_activas';
            await client.query('CALL public.sp_jornadas_activas($1)', [cursorName]);
            const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
            rows = fetchRes.rows;
            await client.query('COMMIT');
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            throw e;
        } finally {
            client.release();
        }
        res.json(rows);
  } catch (error) {
        res.status(500).json({ error: 'Error al obtener jornadas.' });
  }
});


// Endpoint para verificar si existe una foto
router.get('/Acheck-photo/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(fotosDir, filename);
  if (fs.existsSync(filePath)) {
    res.json({ exists: true });
  } else {
    res.json({ exists: false });
  }
});

// Actualizar paciente por No. Afiliación con validación de DPI
router.put('/Apacientes/:no_afiliacion', async (req, res) => {
  const { no_afiliacion } = req.params;
  const {
    dpi,
    primer_nombre,
    segundo_nombre,
    otros_nombres,
    primer_apellido,
    segundo_apellido,
    apellido_casada,
    edad,
    fecha_nacimiento,
    sexo,
    direccion,
    fecha_ingreso,
    id_departamento,
    id_acceso,
    numero_formulario_activo,
    id_jornada,
    sesiones_autorizadas_mes,
    url_foto
  } = req.body;

  try {
    // Derivar usuario/actor
    let userName = 'web';
    try {
      const auth = req.headers.authorization || '';
      if (auth.startsWith('Bearer ')) {
        const token = auth.slice(7);
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
        userName = payload?.nombre_usuario || String(payload?.sub || 'web');
      }
    } catch (_) {}
    // Llamar SP con cursor
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cursorName = 'cur_actualizar_paciente_por_noafiliacion';
      await client.query('CALL public.sp_actualizar_paciente_por_noafiliacion($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)', [
        no_afiliacion,
        dpi,
        primer_nombre,
        segundo_nombre,
        otros_nombres,
        primer_apellido,
        segundo_apellido,
        apellido_casada,
        edad,
        fecha_nacimiento,
        sexo,
        direccion,
        fecha_ingreso,
        id_departamento,
        id_acceso,
        numero_formulario_activo,
        id_jornada,
        sesiones_autorizadas_mes,
        url_foto,
        String(userName),
        cursorName
      ]);
      const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
      await client.query('COMMIT');
      const rows = fetchRes.rows || [];
      if (rows.length === 0) {
        return res.status(404).json({ success: false, detail: 'Paciente no encontrado' });
      }
      return res.json({ success: true, paciente: rows[0] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      // Mapear errores de validación
      if (e && (e.code === '23505' || /ya está registrado para otro paciente/i.test(e.message || ''))) {
        return res.status(409).json({ success: false, detail: 'El DPI ya está registrado para otro paciente.' });
      }
      if (e && /DPI inválido/i.test(e.message || '')) {
        return res.status(400).json({ success: false, detail: 'DPI inválido: debe contener exactamente 13 dígitos numéricos.' });
      }
      console.error(e);
      return res.status(500).json({ success: false, detail: 'Error al actualizar paciente' });
    } finally {
      try { client.release(); } catch (_) {}
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, detail: 'Error al actualizar paciente' });
  }
});

// Endpoint para subir/reemplazar foto de paciente

//Pendiente Arreglar SP
router.post('/Aupload-foto/:no_Afiliacion', async (req, res) => {
  const { no_Afiliacion } = req.params;
  const { imagenBase64 } = req.body;
  if (!imagenBase64) {
      return res.status(400).json({ detail: 'No se recibió la imagen.' });
  }
  try {
        // Decodificar base64
        const matches = imagenBase64.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
        if (!matches) {
            return res.status(400).json({ detail: 'Formato de imagen inválido.' });
        }
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const data = matches[2];
        const buffer = Buffer.from(data, 'base64');
        const filename = `${no_Afiliacion}.${ext}`;
        const filePath = path.join(fotosDir, filename);
        // Guardar/reemplazar archivo
        fs.writeFileSync(filePath, buffer);

        // Derivar usuario y ejecutar dentro de runWithUser para auditoría
        let userName = 'web';
        try {
          const auth = req.headers.authorization || '';
          if (auth.startsWith('Bearer ')) {
            const token = auth.slice(7);
            const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
            userName = payload?.nombre_usuario || String(payload?.sub || 'web');
          }
        } catch (_) {}
        // Actualizar en BD vía SP
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('CALL public.sp_paciente_actualizar_foto($1, $2, $3)', [no_Afiliacion, filename, String(userName)]);
          await client.query('COMMIT');
        } catch (e) {
          try { await client.query('ROLLBACK'); } catch (_) {}
          throw e;
        } finally {
          try { client.release(); } catch (_) {}
        }
        res.json({ success: true, url: `${filename}` });
  } catch (err) {
      console.error('Error al subir foto:', err);
      res.status(500).json({ detail: 'Error al guardar la foto.' });
  }
});

router.get('/api/Apacientes/actualizacion', async (req, res) => {
  const { dpi, no_afiliacion } = req.query;
    if (!dpi && !no_afiliacion) {
      return res.status(400).json({ error: 'Debe proporcionar dpi o no_afiliacion.' });
    }
    try {
      const client = await pool.connect();
      let rows = [];
      try {
        await client.query('BEGIN');
        const cursorName = 'cur_paciente_para_actualizacion';
        await client.query('CALL public.sp_paciente_para_actualizacion($1, $2, $3)', [dpi || null, no_afiliacion || null, cursorName]);
        const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
        rows = fetchRes.rows;
        await client.query('COMMIT');
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        throw e;
      } finally {
        client.release();
      }
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: 'Error al buscar pacientes para actualizacion.', detalle: error.message });
    }
});

module.exports = router;