// Router de Login/Roles
const express = require('express');
const pool = require('../../db/pool');
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
        const result = await pool.query('SELECT id_departamento, nombre FROM tbl_departamento ORDER BY id_departamento ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener departamentos.' });
    }
});

router.get('/Aaccesos-vascular', async (req, res) => {
    try {
        const result = await pool.query('SELECT id_acceso, descripcion FROM tbl_acceso_vascular WHERE estado = true ORDER BY id_acceso ASC;');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener accesos vasculares.' });
    }
});

// Endpoint para obtener jornadas
router.get('/Ajornada', async (req, res) => {
    try {
        const result = await pool.query('SELECT id_jornada, descripcion FROM tbl_jornadas WHERE estado = true ORDER BY id_jornada ASC;');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener jornadas.' });
    }
});


// Endpoint para verificar si existe una foto
router.get('/Acheck-photo/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'fotos', filename);

    if (fs.existsSync(filePath)) {
        res.json({ exists: true });
    } else {
        res.json({ exists: false });
    }
});




// Actualizar paciente por No. Afiliación
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
    const query = `
      UPDATE tbl_pacientes
      SET 
        dpi = $1,
        primer_nombre = $2,
        segundo_nombre = $3,
        otros_nombres = $4,
        primer_apellido = $5,
        segundo_apellido = $6,
        apellido_casada = $7,
        edad = $8,
        fecha_nacimiento = $9,
        sexo = $10,
        direccion = $11,
        fecha_ingreso = $12,
        id_departamento = $13,
        id_acceso = $14,
        numero_formulario_activo = $15,
        id_jornada = $16,
        sesiones_autorizadas_mes = $17,
        url_foto = $18
      WHERE no_afiliacion = $19
      RETURNING *;
    `;

    const values = [
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
      no_afiliacion
    ];

    const result = await pool.query(query, values);

    if (result.rowCount > 0) {
      res.json({ success: true, paciente: result.rows[0] });
    } else {
      res.status(404).json({ success: false, detail: 'Paciente no encontrado' });
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

        // Actualizar urlfoto en la base de datos
        await pool.query('UPDATE tbl_pacientes SET url_foto = $1 WHERE no_afiliacion = $2', [filename, no_Afiliacion]);
        res.json({ success: true, url: `${filename}` });
    } catch (err) {
        console.error('Error al subir foto:', err);
        res.status(500).json({ detail: 'Error al guardar la foto.' });
    }
});





router.get('/api/Apacientes/actualizacion', async (req, res) => {
    const { dpi, no_afiliacion } = req.query;

    let baseQuery = `
        SELECT 
            pac.no_afiliacion,
            pac.dpi,
            pac.primer_nombre,
            pac.segundo_nombre,
            pac.otros_nombres,
            pac.primer_apellido,
            pac.segundo_apellido,
            pac.apellido_casada,
            pac.edad,
            pac.fecha_nacimiento,
            pac.sexo,
            pac.direccion,
            pac.fecha_ingreso,
            pac.id_departamento,
            pac.id_acceso,
            pac.numero_formulario_activo,
            pac.id_jornada,
            pac.sesiones_autorizadas_mes,
            pac.url_foto
        FROM tbl_pacientes pac
        WHERE pac.id_estado != 3
    `;

    let params = [];
    if (dpi) {
        baseQuery += ' AND pac.dpi = $1';
        params.push(dpi);
    } else if (no_afiliacion) {
        baseQuery += ' AND pac.no_afiliacion = $1';
        params.push(no_afiliacion);
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





module.exports = router;