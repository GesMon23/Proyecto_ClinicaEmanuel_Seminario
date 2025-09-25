const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const fs = require('fs');
const path = require('path');

router.get('/departamentos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * from FN_mostrar_departamentos()');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener departamentos.' });
    }
});

// Crear reingreso
router.post('/historial/reingresos', async (req, res) => {
    try {
        const { no_afiliacion, numero_formulario, fecha_reingreso, observaciones, usuario_creacion } = req.body || {};
        if (!no_afiliacion || !numero_formulario) {
            return res.status(400).json({ error: 'no_afiliacion y numero_formulario son obligatorios' });
        }
        const insert = `
            INSERT INTO tbl_reingresos (
                no_afiliacion, numero_formulario, fecha_reingreso, observaciones, usuario_creacion, fecha_creacion
            ) VALUES (
                $1, $2, $3, $4, $5, NOW()
            ) RETURNING no_afiliacion, numero_formulario, fecha_reingreso, observaciones, usuario_creacion, fecha_creacion
        `;
        const result = await pool.query(insert, [no_afiliacion, numero_formulario, fecha_reingreso || null, observaciones || null, usuario_creacion || 'sistema']);
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear reingreso:', error);
        return res.status(500).json({ error: 'Error al crear reingreso', detalle: error.message });
    }
});

// Crear historial de formulario
router.post('/historial/formularios', async (req, res) => {
    try {
        const {
            no_afiliacion,
            numero_formulario,
            sesiones_autorizadas_mes,
            sesiones_realizadas_mes,
            sesiones_no_realizadas_mes,
            inicio_prest_servicios,
            fin_prest_servicios,
            usuario_creacion
        } = req.body || {};

        if (!no_afiliacion || !numero_formulario) {
            return res.status(400).json({ error: 'no_afiliacion y numero_formulario son obligatorios' });
        }

        const insert = `
            INSERT INTO tbl_historial_formularios (
                no_afiliacion, numero_formulario, sesiones_autorizadas_mes, sesiones_realizadas_mes, sesiones_no_realizadas_mes,
                usuario_creacion, fecha_creacion, inicio_prest_servicios, fin_prest_servicios
            ) VALUES (
                $1, $2, $3, $4, $5, $6, NOW(), $7, $8
            ) RETURNING id_historial, no_afiliacion, numero_formulario, sesiones_autorizadas_mes, sesiones_realizadas_mes, sesiones_no_realizadas_mes,
                      usuario_creacion, fecha_creacion, inicio_prest_servicios, fin_prest_servicios
        `;

        const result = await pool.query(insert, [
            no_afiliacion,
            numero_formulario,
            sesiones_autorizadas_mes || null,
            sesiones_realizadas_mes || null,
            sesiones_no_realizadas_mes || null,
            usuario_creacion || 'sistema',
            inicio_prest_servicios || null,
            fin_prest_servicios || null
        ]);

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear historial de formulario:', error);
        return res.status(500).json({ error: 'Error al crear historial de formulario', detalle: error.message });
    }
});

// Crear egreso
router.post('/historial/egresos', async (req, res) => {
    try {
        const { no_afiliacion, id_causa_egreso, descripcion, fecha_egreso, observaciones, usuario_creacion } = req.body || {};
        if (!no_afiliacion || !id_causa_egreso) {
            return res.status(400).json({ error: 'no_afiliacion e id_causa_egreso son obligatorios' });
        }
        const insert = `
            INSERT INTO tbl_egresos (
                no_afiliacion, id_causa_egreso, descripcion, fecha_egreso, observaciones, usuario_creacion, fecha_creacion
            ) VALUES (
                $1, $2, $3, $4, $5, $6, NOW()
            ) RETURNING no_afiliacion, id_causa_egreso, descripcion, fecha_egreso, observaciones, usuario_creacion, fecha_creacion
        `;
        const result = await pool.query(insert, [
            no_afiliacion,
            id_causa_egreso,
            descripcion || null,
            fecha_egreso || null,
            observaciones || null,
            usuario_creacion || 'sistema'
        ]);
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear egreso:', error);
        return res.status(500).json({ error: 'Error al crear egreso', detalle: error.message });
    }
});
//MODIFICAR

// Endpoint para obtener los estados de paciente
router.get('/estados-paciente', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM FN_mostrar_estados_paciente()');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los estados de paciente.', detalle: error.message });
    }
});

router.get('/accesos-vasculares', async (req, res) => {
    try {
        const result = await pool.query('SELECT * from FN_mostrar_accesos_vascular()');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener accesos vasculares.' });
    }
});

// Endpoint para obtener jornadas
router.get('/jornadas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * from FN_mostrar_jornadas()');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener jornadas.' });
    }
});

router.get('/pacientes/:noafiliacion', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.*, 
                d.nombre AS departamento_nombre,
                e.descripcion AS estado_descripcion,
                a.descripcion AS acceso_descripcion,
                j.descripcion AS jornada_descripcion
            FROM tbl_pacientes p
            LEFT JOIN tbl_departamento d ON p.id_departamento = d.id_departamento
            LEFT JOIN tbl_estados_paciente e ON p.id_estado = e.id_estado
            LEFT JOIN tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
            LEFT JOIN tbl_jornadas j ON p.id_jornada = j.id_jornada
            WHERE p.no_afiliacion = $1
        `;
        const result = await pool.query(query, [req.params.noafiliacion]);
        if (!result.rows.length) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener paciente:', error);
        res.status(500).json({ error: 'Error al obtener paciente.', detalle: error.message });
    }
});

// Buscar paciente por DPI
router.get('/pacientes/dpi/:dpi', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.*, 
                d.nombre AS departamento_nombre,
                e.descripcion AS estado_descripcion,
                a.descripcion AS acceso_descripcion,
                j.descripcion AS jornada_descripcion
            FROM tbl_pacientes p
            LEFT JOIN tbl_departamento d ON p.id_departamento = d.id_departamento
            LEFT JOIN tbl_estados_paciente e ON p.id_estado = e.id_estado
            LEFT JOIN tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
            LEFT JOIN tbl_jornadas j ON p.id_jornada = j.id_jornada
            WHERE p.dpi = $1
        `;
        const result = await pool.query(query, [req.params.dpi]);
        if (!result.rows.length) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al buscar paciente por DPI:', error);
        res.status(500).json({ error: 'Error al buscar paciente por DPI.', detalle: error.message });
    }
});

// Historial básico por paciente (por ahora basado en la fila actual de paciente)
router.get('/historial/:noafiliacion', async (req, res) => {
    try {
        const query = `
            WITH formularios AS (
                SELECT 
                    hf.no_afiliacion,
                    hf.numero_formulario AS no_formulario,
                    COALESCE(hf.inicio_prest_servicios::timestamp, hf.fin_prest_servicios::timestamp, hf.fecha_creacion) AS fecha,
                    CASE 
                        WHEN ROW_NUMBER() OVER (PARTITION BY hf.no_afiliacion ORDER BY COALESCE(hf.inicio_prest_servicios::timestamp, hf.fin_prest_servicios::timestamp, hf.fecha_creacion) ASC) = 1
                            THEN 'Nuevo Ingreso'
                        ELSE 'Activo'
                    END AS estado,
                    NULL::text AS observaciones,
                    CASE 
                        WHEN hf.inicio_prest_servicios IS NOT NULL OR hf.fin_prest_servicios IS NOT NULL THEN 
                            COALESCE(to_char(hf.inicio_prest_servicios, 'DD/MM/YYYY'), '') || ' - ' || COALESCE(to_char(hf.fin_prest_servicios, 'DD/MM/YYYY'), '')
                        ELSE NULL
                    END AS periodo,
                    NULL::text AS causa_egreso,
                    'Registro de formulario' AS descripcion
                FROM tbl_historial_formularios hf
                WHERE hf.no_afiliacion = $1
            )
            SELECT no_formulario, estado, fecha, observaciones, periodo, causa_egreso, descripcion
            FROM (
                -- Formularios: primero definimos estado por ranking de antigüedad
                SELECT 
                    f.no_formulario,
                    f.estado,
                    f.fecha,
                    f.observaciones,
                    f.periodo,
                    f.causa_egreso,
                    f.descripcion
                FROM formularios f

                UNION ALL

                -- Reingresos
                SELECT 
                    r.numero_formulario              AS no_formulario,
                    'Reingreso'                      AS estado,
                    COALESCE(r.fecha_reingreso::timestamp, r.fecha_creacion) AS fecha,
                    r.observaciones                  AS observaciones,
                    NULL::text                       AS periodo,
                    NULL::text                       AS causa_egreso,
                    'Reingreso del paciente'         AS descripcion
                FROM tbl_reingresos r
                WHERE r.no_afiliacion = $1

                UNION ALL

                -- Egresos
                SELECT 
                    NULL::text                       AS no_formulario,
                    CASE WHEN LOWER(COALESCE(ce.descripcion, '')) = 'fallecido' THEN 'Fallecido' ELSE 'Egresado' END AS estado,
                    COALESCE(e.fecha_egreso::timestamp, e.fecha_creacion) AS fecha,
                    e.observaciones                  AS observaciones,
                    NULL::text                       AS periodo,
                    ce.descripcion                   AS causa_egreso,
                    e.descripcion                    AS descripcion
                FROM tbl_egresos e
                LEFT JOIN tbl_causa_egreso ce ON ce.id_causa = e.id_causa_egreso
                WHERE e.no_afiliacion = $1
            ) t
            ORDER BY t.fecha ASC
        `;
        const result = await pool.query(query, [req.params.noafiliacion]);
        // Devolver como lista para facilitar múltiples filas en el futuro
        if (!result.rows.length) {
            return res.json([]);
        }
        return res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'Error al obtener historial.', detalle: error.message });
    }
});

// Endpoint para verificar si existe una foto
// Directorio compartido de fotos (raíz del backend)
const FOTOS_DIR = path.join(__dirname, '../../fotos');

router.get('/check-photo/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(FOTOS_DIR, filename);

    if (fs.existsSync(filePath)) {
        res.json({ exists: true });
    } else {
        res.json({ exists: false });
    }
});

// Endpoint para descargar carné PDF por número de afiliación (forzar regeneración)
router.get('/carnet/forzar/:noafiliacion', async (req, res) => {
    try {
        const noafiliacion = req.params.noafiliacion;
        // Obtener datos del paciente desde la base de datos
        const result = await pool.query('SELECT * FROM tbl_pacientes WHERE no_afiliacion = $1', [noafiliacion]);
        if (!result.rows.length) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }
        const paciente = result.rows[0];
        // Obtener ruta de la foto si existe
        let fotoPath = null;
        if (paciente.url_foto) {
            // Si la ruta es absoluta y existe, la usamos. Si no, buscamos en la carpeta fotos compartida
            if (fs.existsSync(paciente.url_foto)) {
                fotoPath = paciente.url_foto;
            } else {
                const fotoEnFotos = path.join(FOTOS_DIR, paciente.url_foto);
                if (fs.existsSync(fotoEnFotos)) {
                    fotoPath = fotoEnFotos;
                } else {
                    // Buscar por nombre estándar (jpg/png)
                    const jpgPath = path.join(FOTOS_DIR, `${noafiliacion}.jpg`);
                    const pngPath = path.join(FOTOS_DIR, `${noafiliacion}.png`);
                    if (fs.existsSync(jpgPath)) {
                        fotoPath = jpgPath;
                    } else if (fs.existsSync(pngPath)) {
                        fotoPath = pngPath;
                    }
                }
            }
        } else {
            // Buscar por nombre estándar (jpg/png)
            const jpgPath = path.join(FOTOS_DIR, `${noafiliacion}.jpg`);
            const pngPath = path.join(FOTOS_DIR, `${noafiliacion}.png`);
            if (fs.existsSync(jpgPath)) {
                fotoPath = jpgPath;
            } else if (fs.existsSync(pngPath)) {
                fotoPath = pngPath;
            }
        }
        // Preparar datos para el carné (solo los campos requeridos)
        const pacienteData = {
            primer_nombre: paciente.primer_nombre,
            segundo_nombre: paciente.segundo_nombre,
            otros_nombres: paciente.otros_nombres,
            primer_apellido: paciente.primer_apellido,
            segundo_apellido: paciente.segundo_apellido,
            apellido_casada: paciente.apellido_casada,
            direccion: paciente.direccion,
            fecha_nacimiento: paciente.fecha_nacimiento,
            fecha_ingreso: paciente.fecha_ingreso,
            no_afiliacion: paciente.no_afiliacion,
            dpi: paciente.dpi,
            sexo: paciente.sexo
        };
        // Generar un archivo temporal
        const carnetPath = path.join(__dirname, 'tmp', `carnet_${noafiliacion}_${Date.now()}.pdf`);
        if (!fs.existsSync(path.join(__dirname, 'tmp'))) {
            fs.mkdirSync(path.join(__dirname, 'tmp'));
        }
        await definirCarnetPaciente(pacienteData, fotoPath, carnetPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="carnet_${noafiliacion}.pdf"`);
        const stream = fs.createReadStream(carnetPath);
        stream.pipe(res);
        stream.on('end', () => {
            fs.unlink(carnetPath, () => { });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al generar el carné.', detalle: error.message });
    }
});

// Crear un paciente de prueba (nuevo ingreso) para verificación rápida
router.post('/pacientes/mock-nuevo-ingreso', async (req, res) => {
    try {
        // Buscar algún estado válido para asignar (el primero disponible)
        const estadoRes = await pool.query('SELECT id_estado, descripcion FROM tbl_estados_paciente WHERE estado = true OR estado IS NULL ORDER BY id_estado LIMIT 1');
        const estado = estadoRes.rows[0] || null;

        const now = new Date();
        const noAfiliacion = `TEST${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}`;
        const noFormulario = `F-${Math.floor(100000 + Math.random()*900000)}`;

        const insertQuery = `
            INSERT INTO tbl_pacientes (
                no_afiliacion, dpi, no_paciente_proveedor, primer_nombre, segundo_nombre, otros_nombres,
                primer_apellido, segundo_apellido, apellido_casada, edad, fecha_nacimiento, sexo,
                direccion, fecha_ingreso, id_departamento, id_estado, id_acceso, numero_formulario_activo,
                id_jornada, sesiones_autorizadas_mes, fecha_registro, url_foto, usuario_creacion,
                fecha_creacion, inicio_prest_servicios, fin_prest_servicios
            ) VALUES (
                $1, NULL, NULL, 'Paciente', 'Prueba', NULL,
                'Demo', NULL, NULL, 30, '1995-01-01', 'M',
                'Dirección de prueba', CURRENT_DATE, NULL, $2, NULL, $3,
                NULL, 12, NOW(), NULL, 'sistema',
                NOW(), CURRENT_DATE, NULL
            ) RETURNING *
        `;

        const result = await pool.query(insertQuery, [noAfiliacion, estado ? estado.id_estado : null, noFormulario]);
        const creado = result.rows[0];
        return res.status(201).json({
            mensaje: 'Paciente de prueba creado',
            no_afiliacion: creado.no_afiliacion,
            numero_formulario_activo: creado.numero_formulario_activo,
            id_estado: creado.id_estado,
            fecha_creacion: creado.fecha_creacion
        });
    } catch (error) {
        console.error('Error al crear paciente de prueba:', error);
        return res.status(500).json({ error: 'Error al crear paciente de prueba', detalle: error.message });
    }
});

module.exports = router;