const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

router.get('/departamentos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * from FN_mostrar_departamentos()');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener departamentos.' });

// Laboratorios por número de afiliación (historial completo) - normalizado
router.get('/laboratorios/:noafiliacion', async (req, res) => {
    const client = await pool.connect();
    try {
        const noafiliacion = req.params.noafiliacion;
        await client.query('BEGIN');
        const cursorName = 'cur_lab_historial_afiliacion_consulta_pac';
        await client.query('CALL public.sp_laboratorios_historial_por_afiliacion($1,$2)', [
            noafiliacion,
            cursorName,
        ]);
        const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
        await client.query('COMMIT');
        const rows = (fetchRes.rows || []).map(r => ({
            no_afiliacion: r.no_afiliacion ?? r.noafiliacion ?? null,
            primer_nombre: r.primer_nombre ?? r.primernombre ?? null,
            segundo_nombre: r.segundo_nombre ?? r.segundonombre ?? null,
            primer_apellido: r.primer_apellido ?? r.primerapellido ?? null,
            segundo_apellido: r.segundo_apellido ?? r.segundoapellido ?? null,
            sexo: r.sexo ?? null,
            id_laboratorio: r.id_laboratorio ?? r.idlaboratorio ?? null,
            fecha_laboratorio: r.fecha_laboratorio ?? r.fecha ?? null,
            periodicidad: r.periodicidad ?? null,
            examen_realizado: r.examen_realizado ?? r.examen ?? null,
            virologia: r.virologia ?? null,
            hiv: r.hiv ?? null,
            usuario_creacion: r.usuario_creacion ?? null,
            parametros: r.parametros ?? null,
        }));
        return res.json(rows);
    } catch (error) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('Error al obtener laboratorios por afiliación:', error);
        return res.status(500).json({ error: 'Error al obtener laboratorios por afiliación' });
    } finally {
        client.release();
    }
});

// Laboratorios por DPI (resuelve no_afiliacion y reutiliza SP) - normalizado
router.get('/laboratorios/dpi/:dpi', async (req, res) => {
    const client = await pool.connect();
    try {
        const dpi = req.params.dpi;
        const p = await pool.query('SELECT no_afiliacion FROM tbl_pacientes WHERE dpi = $1', [dpi]);
        if (!p.rows.length) return res.json([]);
        const noafiliacion = p.rows[0].no_afiliacion;
        await client.query('BEGIN');
        const cursorName = 'cur_lab_historial_dpi_consulta_pac';
        await client.query('CALL public.sp_laboratorios_historial_por_afiliacion($1,$2)', [
            noafiliacion,
            cursorName,
        ]);
        const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
        await client.query('COMMIT');
        const rows = (fetchRes.rows || []).map(r => ({
            no_afiliacion: r.no_afiliacion ?? r.noafiliacion ?? null,
            primer_nombre: r.primer_nombre ?? r.primernombre ?? null,
            segundo_nombre: r.segundo_nombre ?? r.segundonombre ?? null,
            primer_apellido: r.primer_apellido ?? r.primerapellido ?? null,
            segundo_apellido: r.segundo_apellido ?? r.segundoapellido ?? null,
            sexo: r.sexo ?? null,
            id_laboratorio: r.id_laboratorio ?? r.idlaboratorio ?? null,
            fecha_laboratorio: r.fecha_laboratorio ?? r.fecha ?? null,
            periodicidad: r.periodicidad ?? null,
            examen_realizado: r.examen_realizado ?? r.examen ?? null,
            virologia: r.virologia ?? null,
            hiv: r.hiv ?? null,
            usuario_creacion: r.usuario_creacion ?? null,
            parametros: r.parametros ?? null,
        }));
        return res.json(rows);
    } catch (error) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('Error al obtener laboratorios por DPI:', error);
        return res.status(500).json({ error: 'Error al obtener laboratorios por DPI' });
    } finally {
        client.release();
    }
});
    }
});

// Listar turnos por número de afiliación (solo los del paciente indicado, del día actual)
router.get('/turnos/:noafiliacion', async (req, res) => {
    try {
        const noafiliacion = req.params.noafiliacion;
        const query = `
            SELECT 
                pac.no_afiliacion as noafiliacion,
                pac.primer_nombre || ' ' || COALESCE(pac.segundo_nombre, '') || ' ' || 
                pac.primer_apellido || ' ' || COALESCE(pac.segundo_apellido, '') AS nombrepaciente,
                tur.id_turno,
                cli.descripcion AS nombre_clinica,
                tur.fecha_turno,
                tur.id_turno_cod
            FROM tbl_turnos tur
            INNER JOIN tbl_pacientes pac ON tur.no_afiliacion = pac.no_afiliacion
            INNER JOIN tbl_clinica cli ON tur.id_clinica = cli.id_clinica
            WHERE pac.no_afiliacion = $1
            ORDER BY tur.fecha_turno DESC
        `;
        const result = await pool.query(query, [noafiliacion]);
        return res.json(result.rows || []);
    } catch (error) {
        console.error('Error al obtener turnos del paciente:', error);
        return res.status(500).json({ error: 'Error al obtener turnos del paciente', detalle: error.message });
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

// Listar referencias por número de afiliación
router.get('/referencias/:noafiliacion', async (req, res) => {
    try {
        const noafiliacion = req.params.noafiliacion;
        const query = `
            SELECT 
                r.id_referencia,
                r.no_afiliacion,
                r.fecha_referencia,
                r.motivo_traslado,
                r.id_medico,
                r.especialidad_referencia
            FROM public.tbl_referencias r
            WHERE r.no_afiliacion = $1
              AND (r.fecha_eliminacion IS NULL)
            ORDER BY r.fecha_referencia DESC NULLS LAST, r.fecha_creacion DESC NULLS LAST
        `;
        const result = await pool.query(query, [noafiliacion]);
        return res.json(result.rows || []);
    } catch (error) {
        console.error('Error al obtener referencias:', error);
        return res.status(500).json({ error: 'Error al obtener referencias', detalle: error.message });
    }
});

// Listar informes de nutrición por número de afiliación
router.get('/nutricion/:noafiliacion', async (req, res) => {
    try {
        const noafiliacion = req.params.noafiliacion;
        const query = `
            SELECT 
                n.id_informe,
                n.no_afiliacion,
                n.motivo_consulta,
                n.estado_nutricional,
                n.observaciones,
                n.altura_cm,
                n.peso_kg,
                n.imc
            FROM public.tbl_informe_nutricion n
            WHERE n.no_afiliacion = $1
              AND (n.fecha_eliminacion IS NULL)
            ORDER BY n.fecha_creacion DESC NULLS LAST
        `;
        const result = await pool.query(query, [noafiliacion]);
        return res.json(result.rows || []);
    } catch (error) {
        console.error('Error al obtener informes de nutrición:', error);
        return res.status(500).json({ error: 'Error al obtener informes de nutrición', detalle: error.message });
    }
});

// Listar informes de psicología por número de afiliación
router.get('/psicologia/:noafiliacion', async (req, res) => {
    try {
        const noafiliacion = req.params.noafiliacion;
        const query = `
            SELECT 
                p.id_informe,
                p.no_afiliacion,
                p.motivo_consulta,
                p.tipo_consulta,
                p.observaciones,
                p.tipo_atencion,
                p.pronostico,
                p.kdqol
            FROM public.tbl_informes_psicologia p
            WHERE p.no_afiliacion = $1
              AND (p.fecha_eliminacion IS NULL)
            ORDER BY p.fecha_creacion DESC NULLS LAST
        `;
        const result = await pool.query(query, [noafiliacion]);
        return res.json(result.rows || []);
    } catch (error) {
        console.error('Error al obtener informes de psicología:', error);
        return res.status(500).json({ error: 'Error al obtener informes de psicología', detalle: error.message });
    }
});

// Listar formularios por número de afiliación
router.get('/formularios/:noafiliacion', async (req, res) => {
    try {
        const noafiliacion = req.params.noafiliacion;
        const query = `
            SELECT 
                hf.numero_formulario,
                hf.sesiones_autorizadas_mes,
                hf.sesiones_realizadas_mes,
                hf.sesiones_no_realizadas_mes,
                hf.inicio_prest_servicios,
                hf.fin_prest_servicios,
                hf.id_historial
            FROM public.tbl_historial_formularios hf
            WHERE hf.no_afiliacion = $1
              AND (hf.fecha_eliminacion IS NULL)
            ORDER BY COALESCE(hf.inicio_prest_servicios, hf.fecha_creacion) DESC NULLS LAST, hf.fecha_creacion DESC NULLS LAST
        `;
        const result = await pool.query(query, [noafiliacion]);
        return res.json(result.rows || []);
    } catch (error) {
        console.error('Error al obtener formularios:', error);
        return res.status(500).json({ error: 'Error al obtener formularios', detalle: error.message });
    }
});

// Faltistas por número de afiliación (todos los registros)
router.get('/faltistas/:noafiliacion', async (req, res) => {
    const client = await pool.connect();
    try {
        const noafiliacion = req.params.noafiliacion;
        await client.query('BEGIN');
        const cursorName = 'cur_faltistas_paciente';
        await client.query('CALL public.sp_faltistas_filtrado($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
            null, // fechainicio
            null, // fechafin
            noafiliacion || null,
            null, // sexo
            null, // clinica
            null, // jornada
            null, // accesovascular
            null, // departamento
            cursorName,
        ]);
        const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
        await client.query('COMMIT');
        const rows = (fetchRes.rows || []).map(r => ({
            noafiliacion: r.noafiliacion,
            nombres: [r.primer_nombre, r.segundo_nombre, r.otros_nombres].filter(Boolean).join(' '),
            apellidos: [r.primer_apellido, r.segundo_apellido, r.apellido_casada].filter(Boolean).join(' '),
            sexo: r.sexo,
            clinica: r.clinica,
            jornada: r.jornada,
            accesovascular: r.accesovascular,
            departamento: r.departamento,
            fechafalta: r.fechafalta,
        }));
        res.json(rows);
    } catch (error) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('Error al obtener faltistas del paciente:', error);
        res.status(500).json({ error: 'Error al obtener faltistas del paciente' });
    } finally {
        client.release();
    }
});

// Faltistas por DPI (resuelve no_afiliacion y reutiliza SP)
router.get('/faltistas/dpi/:dpi', async (req, res) => {
    const client = await pool.connect();
    try {
        const dpi = req.params.dpi;
        const p = await pool.query('SELECT no_afiliacion FROM tbl_pacientes WHERE dpi = $1', [dpi]);
        if (!p.rows.length) return res.json([]);
        const noafiliacion = p.rows[0].no_afiliacion;
        await client.query('BEGIN');
        const cursorName = 'cur_faltistas_paciente_dpi';
        await client.query('CALL public.sp_faltistas_filtrado($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
            null, // fechainicio
            null, // fechafin
            noafiliacion || null,
            null, // sexo
            null, // clinica
            null, // jornada
            null, // accesovascular
            null, // departamento
            cursorName,
        ]);
        const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
        await client.query('COMMIT');
        const rows = (fetchRes.rows || []).map(r => ({
            noafiliacion: r.noafiliacion,
            nombres: [r.primer_nombre, r.segundo_nombre, r.otros_nombres].filter(Boolean).join(' '),
            apellidos: [r.primer_apellido, r.segundo_apellido, r.apellido_casada].filter(Boolean).join(' '),
            sexo: r.sexo,
            clinica: r.clinica,
            jornada: r.jornada,
            accesovascular: r.accesovascular,
            departamento: r.departamento,
            fechafalta: r.fechafalta,
        }));
        res.json(rows);
    } catch (error) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('Error al obtener faltistas por DPI:', error);
        res.status(500).json({ error: 'Error al obtener faltistas por DPI' });
    } finally {
        client.release();
    }
});

// Endpoint para verificar si existe una foto
// Directorio compartido de fotos (raíz del backend)
const FOTOS_DIR = path.join(__dirname, '../../fotos');
const LOGO_PATH = path.join(__dirname, '../../assets/img/logoClinica.png');

router.get('/check-photo/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(FOTOS_DIR, filename);

    if (fs.existsSync(filePath)) {
        res.json({ exists: true });
    } else {
        res.json({ exists: false });
    }
});

// Helper para generar el carné en A4 vertical con logo, foto, QR, datos y tabla de firmas
async function definirCarnetPaciente(paciente, fotoPath, outputPath) {
    // Helper para obtener campos compatibles (con o sin guion bajo)
    const firstNonEmpty = (...vals) => vals.find(v => v !== undefined && v !== null && String(v).trim() !== '') || '';
    const primernombre = firstNonEmpty(paciente.primernombre, paciente.primer_nombre);
    const segundonombre = firstNonEmpty(paciente.segundonombre, paciente.segundo_nombre);
    const otrosnombres = firstNonEmpty(paciente.otrosnombres, paciente.otros_nombres);
    const primerapellido = firstNonEmpty(paciente.primerapellido, paciente.primer_apellido);
    const segundoapellido = firstNonEmpty(paciente.segundoapellido, paciente.segundo_apellido);
    const apellidocasada = firstNonEmpty(paciente.apellidocasada, paciente.apellido_casada);
    const direccion = firstNonEmpty(paciente.direccion);
    const fechanacimiento = firstNonEmpty(paciente.fechanacimiento, paciente.fecha_nacimiento);
    const fechaingreso = firstNonEmpty(paciente.fechaingreso, paciente.fecha_ingreso);
    const noafiliacion = firstNonEmpty(paciente.noafiliacion, paciente.no_afiliacion);
    const dpi = firstNonEmpty(paciente.dpi);
    const sexo = firstNonEmpty(paciente.sexo);

    const baseFrontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    const qrUrl = `${baseFrontend}/consulta-pacientes?noafiliacion=${encodeURIComponent(noafiliacion)}`;

    // Generar QR como dataURL
    let qrDataUrl = null;
    try {
        qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 70 });
    } catch (_) {}

    const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 40 });
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Logo en la esquina superior izquierda
    const logoPath = LOGO_PATH; // ../../assets/img/logoClinica.png
    if (fs.existsSync(logoPath)) {
        try { doc.image(logoPath, 30, 25, { width: 60 }); } catch (_) {}
    }
    // Título alineado a la izquierda
    doc.font('Helvetica-Bold').fontSize(22).fillColor('black').text('Carné de Paciente', 110, 35, { align: 'left' });

    // Foto del paciente en la esquina superior derecha
    try {
        if (fotoPath && fs.existsSync(fotoPath)) {
            // Marco
            doc.rect(430, 25, 90, 70).fillAndStroke('white', '#bbb');
            doc.image(fotoPath, 432, 27, { width: 86, height: 66, fit: [86, 66] });
        } else {
            doc.rect(430, 25, 90, 70).fillAndStroke('white', '#bbb');
            doc.font('Helvetica').fontSize(12).fillColor('#888').text('Sin Foto', 450, 60);
        }
    } catch (_) {
        // Si falla la imagen, seguir sin romper el PDF
    }

    // QR debajo de la foto
    if (qrDataUrl) {
        try {
            const buf = Buffer.from(qrDataUrl.split(',')[1], 'base64');
            doc.image(buf, 450, 105, { width: 50, height: 50 });
            doc.font('Helvetica').fontSize(8).fillColor('black').text('Escanee para ver\ninformación', 445, 158, { width: 65, align: 'center' });
        } catch (_) {}
    }

    // Bloque izquierdo: datos personales
    let datosY = 100;
    const nombreCompleto = `${[primernombre, segundonombre, otrosnombres].filter(Boolean).join(' ')}`.replace(/ +/g, ' ').trim();
    const apellidoCompleto = `${[primerapellido, segundoapellido, apellidocasada].filter(Boolean).join(' ')}`.replace(/ +/g, ' ').trim();
    const formatFecha = (fecha) => {
        if (!fecha) return '';
        const d = new Date(fecha);
        if (isNaN(d)) return String(fecha);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    doc.font('Helvetica').fontSize(11).fillColor('black');
    doc.text('Nombres:', 30, datosY, { continued: true });
    doc.font('Helvetica-Bold').text(nombreCompleto, { continued: false });
    datosY += 15;
    doc.font('Helvetica').text('Apellidos:', 30, datosY, { continued: true });
    doc.font('Helvetica-Bold').text(apellidoCompleto, { continued: false });
    datosY += 15;
    doc.font('Helvetica').text('Dirección:', 30, datosY, { continued: true });
    doc.font('Helvetica-Bold').text(direccion || '', { continued: false });
    datosY += 15;
    doc.font('Helvetica').text('Fecha Nacimiento:', 30, datosY, { continued: true });
    doc.font('Helvetica-Bold').text(formatFecha(fechanacimiento), { continued: false });
    datosY += 15;
    doc.font('Helvetica').text('Fecha Ingreso:', 30, datosY, { continued: true });
    doc.font('Helvetica-Bold').text(formatFecha(fechaingreso), { continued: false });
    datosY += 15;
    doc.font('Helvetica').text('No. Afiliación:', 30, datosY, { continued: true });
    doc.font('Helvetica-Bold').text(noafiliacion || '', { continued: false });
    datosY += 15;
    doc.font('Helvetica').text('DPI:', 30, datosY, { continued: true });
    doc.font('Helvetica-Bold').text(dpi || '', { continued: false });
    datosY += 15;
    doc.font('Helvetica').text('Sexo:', 30, datosY, { continued: true });
    doc.font('Helvetica-Bold').text(sexo || '', { continued: false });
    datosY += 20;

    // Línea divisoria
    doc.moveTo(30, datosY + 18).lineTo(540, datosY + 18).lineWidth(1).strokeColor('black').stroke();

    // Tabla de firmas
    const tableTop = datosY + 35;
    const colX = [30, 105, 210, 390, 540];
    const rowHeight = 24;
    const numRows = 16;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('black');
    doc.text('Fecha', colX[0] + 2, tableTop + 7, { width: colX[1] - colX[0] - 4, align: 'center' });
    doc.text('Hora', colX[1] + 2, tableTop + 7, { width: colX[2] - colX[1] - 4, align: 'center' });
    doc.text('Observaciones', colX[2] + 2, tableTop + 7, { width: colX[3] - colX[2] - 4, align: 'center' });
    doc.text('Firma', colX[3] + 2, tableTop + 7, { width: colX[4] - colX[3] - 4, align: 'center' });
    doc.font('Helvetica').fillColor('black');
    // Líneas horizontales
    for (let i = 0; i <= numRows + 1; i++) {
        const y = tableTop + i * rowHeight;
        doc.moveTo(colX[0], y).lineTo(colX[4], y).strokeColor('black').stroke();
    }
    // Líneas verticales
    for (let i = 0; i < colX.length; i++) {
        doc.moveTo(colX[i], tableTop).lineTo(colX[i], tableTop + (numRows + 1) * rowHeight).strokeColor('black').stroke();
    }

    doc.end();

    return new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
}

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