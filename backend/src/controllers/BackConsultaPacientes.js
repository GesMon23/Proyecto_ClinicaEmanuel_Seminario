const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

router.get('/departamentos', async (_req, res) => {
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = 'cur_cat_deptos';
            await client.query('CALL public.sp_catalogo_departamentos($1)', [cur]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            res.json(r.rows || []);
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_catalogo_departamentos:', e);
            res.status(500).json({ error: 'Error al obtener departamentos.' });
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener departamentos.' });
    }
});

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
        await client.query('BEGIN');
        const curRes = 'cur_resolve_af';
        await client.query('CALL public.sp_resolver_no_afiliacion_por_dpi($1,$2)', [dpi, curRes]);
        const rRes = await client.query(`FETCH ALL FROM "${curRes}"`);
        const noafiliacion = rRes.rows?.[0]?.no_afiliacion || null;
        if (!noafiliacion) {
            await client.query('COMMIT');
            return res.json([]);
        }
        const cursorName = 'cur_lab_historial_dpi_consulta_pac';
        await client.query('CALL public.sp_laboratorios_historial_por_afiliacion($1,$2)', [ noafiliacion, cursorName ]);
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
 

// Listar turnos por número de afiliación (solo los del paciente indicado, del día actual)
router.get('/turnos/:noafiliacion', async (req, res) => {
    try {
        const noafiliacion = req.params.noafiliacion;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = 'cur_turnos_pac';
            await client.query('CALL public.sp_consulta_turnos_por_afiliacion($1,$2)', [noafiliacion, cur]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            return res.json(r.rows || []);
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_consulta_turnos_por_afiliacion:', e);
            return res.status(500).json({ error: 'Error al obtener turnos del paciente' });
        } finally {
            client.release();
        }
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
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = 'cur_ins_reingreso';
            await client.query('CALL public.sp_reingreso_crear($1,$2,$3,$4,$5,$6)', [
                no_afiliacion,
                numero_formulario,
                fecha_reingreso || null,
                observaciones || null,
                usuario_creacion || 'sistema',
                cur
            ]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            return res.status(201).json(r.rows?.[0] || {});
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_reingreso_crear:', e);
            return res.status(500).json({ error: 'Error al crear reingreso' });
        } finally {
            client.release();
        }
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

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = 'cur_ins_hist_form';
            await client.query('CALL public.sp_historial_formulario_crear($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
                no_afiliacion,
                numero_formulario,
                sesiones_autorizadas_mes || null,
                sesiones_realizadas_mes || null,
                sesiones_no_realizadas_mes || null,
                usuario_creacion || 'sistema',
                inicio_prest_servicios || null,
                fin_prest_servicios || null,
                cur
            ]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            return res.status(201).json(r.rows?.[0] || {});
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_historial_formulario_crear:', e);
            return res.status(500).json({ error: 'Error al crear historial de formulario' });
        } finally {
            client.release();
        }
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
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = 'cur_ins_egreso';
            await client.query('CALL public.sp_egreso_crear($1,$2,$3,$4,$5,$6,$7)', [
                no_afiliacion,
                id_causa_egreso,
                descripcion || null,
                fecha_egreso || null,
                observaciones || null,
                usuario_creacion || 'sistema',
                cur
            ]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            return res.status(201).json(r.rows?.[0] || {});
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_egreso_crear:', e);
            return res.status(500).json({ error: 'Error al crear egreso' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al crear egreso:', error);
        return res.status(500).json({ error: 'Error al crear egreso', detalle: error.message });
    }
});
//MODIFICAR

// Endpoint para obtener los estados de paciente
router.get('/estados-paciente', async (_req, res) => {
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = 'cur_cat_estados';
            await client.query('CALL public.sp_catalogo_estados_paciente($1)', [cur]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            res.json(r.rows || []);
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_catalogo_estados_paciente:', e);
            res.status(500).json({ error: 'Error al obtener los estados de paciente.' });
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los estados de paciente.' });
    }
});

router.get('/accesos-vasculares', async (_req, res) => {
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = 'cur_cat_accesos';
            await client.query('CALL public.sp_catalogo_accesos_vascular($1)', [cur]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            res.json(r.rows || []);
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_catalogo_accesos_vascular:', e);
            res.status(500).json({ error: 'Error al obtener accesos vasculares.' });
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener accesos vasculares.' });
    }
});

// Endpoint para obtener jornadas
router.get('/jornadas', async (_req, res) => {
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = 'cur_cat_jornadas';
            await client.query('CALL public.sp_catalogo_jornadas($1)', [cur]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            res.json(r.rows || []);
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_catalogo_jornadas:', e);
            res.status(500).json({ error: 'Error al obtener jornadas.' });
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener jornadas.' });
    }
});

router.get('/pacientes/:noafiliacion', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = 'cur_pac_af';
            await client.query('CALL public.sp_paciente_por_afiliacion($1,$2)', [req.params.noafiliacion, cur]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            if (!r.rows?.length) return res.status(404).json({ error: 'Paciente no encontrado.' });
            return res.json(r.rows[0]);
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_paciente_por_afiliacion:', e);
            return res.status(500).json({ error: 'Error al obtener paciente.' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al obtener paciente:', error);
        res.status(500).json({ error: 'Error al obtener paciente.', detalle: error.message });
    }
});

// Buscar paciente por DPI
router.get('/pacientes/dpi/:dpi', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = 'cur_pac_dpi';
            await client.query('CALL public.sp_paciente_por_dpi($1,$2)', [req.params.dpi, cur]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            if (!r.rows?.length) return res.status(404).json({ error: 'Paciente no encontrado.' });
            return res.json(r.rows[0]);
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_paciente_por_dpi:', e);
            return res.status(500).json({ error: 'Error al buscar paciente por DPI.' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al buscar paciente por DPI:', error);
        res.status(500).json({ error: 'Error al buscar paciente por DPI.', detalle: error.message });
    }
});

// Historial básico por paciente (por ahora basado en la fila actual de paciente)
router.get('/historial/:noafiliacion', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = 'cur_hist_pac';
            await client.query('CALL public.sp_historial_paciente($1,$2)', [req.params.noafiliacion, cur]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            return res.json(r.rows || []);
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_historial_paciente:', e);
            return res.status(500).json({ error: 'Error al obtener historial.' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'Error al obtener historial.', detalle: error.message });
    }
});

// Listar referencias por número de afiliación
router.get('/referencias/:noafiliacion', async (req, res) => {
    try {
        const noafiliacion = req.params.noafiliacion;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = 'cur_ref_pac';
            await client.query('CALL public.sp_referencias_por_afiliacion($1,$2)', [noafiliacion, cur]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            return res.json(r.rows || []);
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_referencias_por_afiliacion:', e);
            return res.status(500).json({ error: 'Error al obtener referencias' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al obtener referencias:', error);
        return res.status(500).json({ error: 'Error al obtener referencias', detalle: error.message });
    }
});

// Listar informes de nutrición por número de afiliación
router.get('/nutricion/:noafiliacion', async (req, res) => {
    try {
        const noafiliacion = req.params.noafiliacion;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = 'cur_nutri_pac';
            await client.query('CALL public.sp_nutricion_por_afiliacion($1,$2)', [noafiliacion, cur]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            return res.json(r.rows || []);
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_nutricion_por_afiliacion:', e);
            return res.status(500).json({ error: 'Error al obtener informes de nutrición' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al obtener informes de nutrición:', error);
        return res.status(500).json({ error: 'Error al obtener informes de nutrición', detalle: error.message });
    }
});

// Listar informes de psicología por número de afiliación
router.get('/psicologia/:noafiliacion', async (req, res) => {
    try {
        const noafiliacion = req.params.noafiliacion;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = 'cur_psico_pac';
            await client.query('CALL public.sp_psicologia_por_afiliacion($1,$2)', [noafiliacion, cur]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            return res.json(r.rows || []);
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_psicologia_por_afiliacion:', e);
            return res.status(500).json({ error: 'Error al obtener informes de psicología' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al obtener informes de psicología:', error);
        return res.status(500).json({ error: 'Error al obtener informes de psicología', detalle: error.message });
    }
});

// Listar formularios por número de afiliación
router.get('/formularios/:noafiliacion', async (req, res) => {
    try {
        const noafiliacion = req.params.noafiliacion;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = 'cur_form_pac';
            await client.query('CALL public.sp_formularios_por_afiliacion($1,$2)', [noafiliacion, cur]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            return res.json(r.rows || []);
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_formularios_por_afiliacion:', e);
            return res.status(500).json({ error: 'Error al obtener formularios' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al obtener formularios:', error);
        return res.status(500).json({ error: 'Error al obtener formularios', detalle: error.message });
    }
});

// Faltistas por número de afiliación (todos los registros)
router.get('/faltistas/:noafiliacion', async (req, res) => {
    try {
        const noafiliacion = req.params.noafiliacion;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const cur = 'cur_falt_pac';
            await client.query('CALL public.sp_faltistas_por_afiliacion($1,$2)', [noafiliacion, cur]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            return res.json(r.rows || []);
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_faltistas_por_afiliacion:', e);
            return res.status(500).json({ error: 'Error al obtener faltistas del paciente' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al obtener faltistas del paciente:', error);
        return res.status(500).json({ error: 'Error al obtener faltistas del paciente' });
    }
});

// Faltistas por DPI (resuelve no_afiliacion y reutiliza SP)
router.get('/faltistas/dpi/:dpi', async (req, res) => {
    try {
        const dpi = req.params.dpi;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const curRes = 'cur_resolve_af_falt';
            await client.query('CALL public.sp_resolver_no_afiliacion_por_dpi($1,$2)', [dpi, curRes]);
            const rRes = await client.query(`FETCH ALL FROM "${curRes}"`);
            const noafiliacion = rRes.rows?.[0]?.no_afiliacion || null;
            if (!noafiliacion) {
                await client.query('COMMIT');
                return res.json([]);
            }
            const cur = 'cur_falt_pac_dpi';
            await client.query('CALL public.sp_faltistas_por_afiliacion($1,$2)', [noafiliacion, cur]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            return res.json(r.rows || []);
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            console.error('Error SP sp_faltistas_por_afiliacion (dpi):', e);
            return res.status(500).json({ error: 'Error al obtener faltistas por DPI' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al obtener faltistas por DPI:', error);
        return res.status(500).json({ error: 'Error al obtener faltistas por DPI' });
    }
});

// Endpoint para verificar si existe una foto
// Directorio compartido de fotos (raíz del backend)
const FOTOS_DIR = path.join(__dirname, '../../fotos');
const LOGO_PATH = path.join(__dirname, '../../assets/img/logoClinica.png');

// Helper local para resolver ruta real de la foto en carpeta /fotos
function resolveFotoPathLocal(paciente, noafiliacion) {
    const baseDir = FOTOS_DIR;
    const candidates = [];
    const url = paciente?.urlfoto || paciente?.url_foto || paciente?.url_foto || null;
    if (url) {
        try {
            const p = path.isAbsolute(url) ? url : path.join(baseDir, url);
            candidates.push(p);
        } catch (_) {}
    }
    const exts = ['.jpg', '.jpeg', '.png', '.webp'];
    for (const ext of exts) candidates.push(path.join(baseDir, `${noafiliacion}${ext}`));
    for (const cand of candidates) {
        try { if (fs.existsSync(cand)) return cand; } catch (_) {}
    }
    return null;
}

// Endpoint robusto /check-photo (migrado desde server.js)
router.get('/check-photo/:id', async (req, res) => {
    try {
        const raw = String(req.params.id || '').trim();
        const id = raw.replace(/\.[a-zA-Z0-9]+$/, '');

        const client = await pool.connect();
        let urlFoto = null;
        try {
            await client.query('BEGIN');
            const cur = 'cur_pac_url_foto';
            await client.query('CALL public.sp_paciente_url_foto($1,$2)', [id, cur]);
            const r = await client.query(`FETCH ALL FROM "${cur}"`);
            await client.query('COMMIT');
            urlFoto = r.rows?.[0]?.url_foto || null;
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
        } finally {
            client.release();
        }

        const paciente = { urlfoto: urlFoto };
        const fotoPath = resolveFotoPathLocal(paciente, id);

        const wantDebug = 'debug' in req.query;
        if (fotoPath) {
            const filename = path.basename(fotoPath);
            return res.json({
                exists: true,
                filename,
                url: `/fotos/${filename}`,
                ...(wantDebug ? { resolvedFrom: paciente.urlfoto || null, absolutePath: fotoPath } : {})
            });
        }

        return res.json({ exists: false, ...(wantDebug ? { resolvedFrom: paciente.urlfoto || null } : {}) });
    } catch (e) {
        console.error('Error en /check-photo (BackConsultaPacientes):', e);
        return res.status(500).json({ exists: false, error: 'internal_error' });
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
    const queryParts = [];
    if (noafiliacion) queryParts.push(`noafiliacion=${encodeURIComponent(noafiliacion)}`);
    if (dpi) queryParts.push(`dpi=${encodeURIComponent(dpi)}`);
    const queryStr = queryParts.join('&');
    const qrUrl = `${baseFrontend}/layout/consulta-pacientes${queryStr ? `?${queryStr}` : ''}`;

    // Generar QR como dataURL
    let qrDataUrl = null;
    try {
        qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 70 });
    } catch (_) {}

    const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 40, bufferPages: true });
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Logo en la esquina superior izquierda
    const logoPath = LOGO_PATH; // ../../assets/img/logoClinica.png
    if (fs.existsSync(logoPath)) {
        try { doc.image(logoPath, 28, 18, { width: 88 }); } catch (_) {}
    }
    // Medidas de página y márgenes
    const pageWidth = doc.page.width;
    const ml = doc.page.margins?.left ?? 40;
    const mr = doc.page.margins?.right ?? 40;

    // Título centrado (verde institucional)
    doc.font('Helvetica-Bold').fontSize(30).fillColor('#2d6a4f').text('Carné de Paciente', ml, 28, { align: 'center', width: pageWidth - ml - mr });

    // QR a la derecha del título
    if (qrDataUrl) {
        try {
            const buf = Buffer.from(qrDataUrl.split(',')[1], 'base64');
            const qrW = 60;
            const qrX = pageWidth - mr - qrW;
            const qrY = 25;
            doc.image(buf, qrX, qrY, { width: qrW, height: qrW });
        } catch (_) {}
    }

    // Línea separadora verde (como en el reporte)
    doc.moveTo(ml, 95).lineTo(pageWidth - mr, 95).lineWidth(1.5).strokeColor('#2d6a4f').stroke();

    // Foto del paciente (bajar para no superponer con encabezado/QR) y hacerla un poco más grande
    try {
        // +20% de tamaño y acercar la foto a la línea del encabezado
        const frameX = 405, frameY = 110, frameW = 144, frameH = 110;
        if (fotoPath && fs.existsSync(fotoPath)) {
            // Dibujar la foto ocupando exactamente el marco
            try {
                doc.image(fotoPath, frameX, frameY, { width: frameW, height: frameH });
            } catch (_) {
                // Fallback si falla dimensiones exactas
                doc.image(fotoPath, frameX, frameY, { fit: [frameW, frameH] });
            }
            // Borde verde por encima, pegado al contorno de la foto
            doc.lineWidth(1).strokeColor('#2d6a4f');
            doc.rect(frameX, frameY, frameW, frameH).stroke();
        } else {
            // Marco placeholder con borde verde y texto
            doc.lineWidth(1).strokeColor('#2d6a4f');
            doc.rect(frameX, frameY, frameW, frameH).stroke();
            doc.font('Helvetica').fontSize(10).fillColor('#888').text('Sin Foto', frameX, frameY + frameH / 2 - 5, { width: frameW, align: 'center' });
        }
    } catch (_) {
        // Si falla la imagen, seguir sin romper el PDF
    }

    // Bloque izquierdo: datos personales (acercar al encabezado)
    let datosY = 110;
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

    // Datos personales un poco más grandes
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#2d6a4f');
    doc.text('Nombres:', 30, datosY, { continued: true });
    doc.font('Helvetica').fontSize(13).fillColor('black').text(nombreCompleto, { continued: false });
    datosY += 20;
    doc.font('Helvetica-Bold').fillColor('#2d6a4f').text('Apellidos:', 30, datosY, { continued: true });
    doc.font('Helvetica').fillColor('black').text(apellidoCompleto, { continued: false });
    datosY += 20;
    doc.font('Helvetica-Bold').fillColor('#2d6a4f').text('Dirección:', 30, datosY, { continued: true });
    doc.font('Helvetica').fillColor('black').text(direccion || '', { continued: false });
    datosY += 20;
    doc.font('Helvetica-Bold').fillColor('#2d6a4f').text('Fecha Nacimiento:', 30, datosY, { continued: true });
    doc.font('Helvetica').fillColor('black').text(formatFecha(fechanacimiento), { continued: false });
    datosY += 20;
    doc.font('Helvetica-Bold').fillColor('#2d6a4f').text('Fecha Ingreso:', 30, datosY, { continued: true });
    doc.font('Helvetica').fillColor('black').text(formatFecha(fechaingreso), { continued: false });
    datosY += 20;
    doc.font('Helvetica-Bold').fillColor('#2d6a4f').text('No. Afiliación:', 30, datosY, { continued: true });
    doc.font('Helvetica').fillColor('black').text(noafiliacion || '', { continued: false });
    datosY += 20;
    doc.font('Helvetica-Bold').fillColor('#2d6a4f').text('DPI:', 30, datosY, { continued: true });
    doc.font('Helvetica').fillColor('black').text(dpi || '', { continued: false });
    datosY += 20;
    doc.font('Helvetica-Bold').fillColor('#2d6a4f').text('Sexo:', 30, datosY, { continued: true });
    doc.font('Helvetica').fillColor('black').text(sexo || '', { continued: false });
    datosY += 26;

    // Línea divisoria (aún más cerca de los datos)
    doc.moveTo(30, datosY + 10).lineTo(540, datosY + 10).lineWidth(1).strokeColor('black').stroke();

    // Tabla de firmas (más próxima a los datos) y ajuste dinámico para 1 sola página
    const tableTop = datosY + 22;
    const colX = [30, 105, 210, 390, 540];
    const rowHeight = 28; // filas más altas
    // calcular cuántas filas caben hasta el pie sin provocar salto de página
    const pageH = doc.page.height;
    const footerReserve = 90; // reserva para pie de página y margen inferior
    const maxHeight = pageH - footerReserve - tableTop;
    let numRows = Math.floor((maxHeight - rowHeight) / rowHeight);
    // límites razonables
    if (!isFinite(numRows) || numRows < 8) numRows = 8;
    if (numRows > 16) numRows = 16;
    // Verificación estricta para no forzar salto: reducir hasta que la última línea de la tabla quede por encima del pie
    const pageBottomLimit = pageH - 70; // margen extra para evitar que cualquier texto del pie provoque salto
    while (tableTop + (numRows + 1) * rowHeight > pageBottomLimit && numRows > 8) {
        numRows--;
    }
    // Encabezado con fondo verde y texto blanco
    const headerH = rowHeight;
    const tableRight = colX[4];
    doc.save();
    doc.lineWidth(1).strokeColor('#2d6a4f').fillColor('#2d6a4f');
    doc.rect(colX[0], tableTop, tableRight - colX[0], headerH).fill();
    doc.font('Helvetica-Bold').fontSize(11).fillColor('white');
    doc.text('Fecha', colX[0] + 2, tableTop + 10, { width: colX[1] - colX[0] - 4, align: 'center' });
    doc.text('Hora', colX[1] + 2, tableTop + 10, { width: colX[2] - colX[1] - 4, align: 'center' });
    doc.text('Observaciones', colX[2] + 2, tableTop + 10, { width: colX[3] - colX[2] - 4, align: 'center' });
    doc.text('Firma', colX[3] + 2, tableTop + 10, { width: colX[4] - colX[3] - 4, align: 'center' });
    doc.restore();

    // Franjas alternadas en filas del cuerpo
    for (let r = 1; r <= numRows; r++) {
        const y = tableTop + r * rowHeight;
        if (r % 2 === 1) {
            doc.save();
            doc.fillColor('#f5f7f9');
            doc.rect(colX[0], y, tableRight - colX[0], rowHeight).fill();
            doc.restore();
        }
    }

    // Rejilla: líneas gris claro y borde exterior verde
    doc.lineWidth(0.8).strokeColor('#a3a3a3');
    for (let i = 0; i <= numRows + 1; i++) {
        const y = tableTop + i * rowHeight;
        doc.moveTo(colX[0], y).lineTo(tableRight, y).stroke();
    }
    for (let i = 0; i < colX.length; i++) {
        doc.moveTo(colX[i], tableTop).lineTo(colX[i], tableTop + (numRows + 1) * rowHeight).stroke();
    }
    // Borde exterior
    doc.lineWidth(1.2).strokeColor('#2d6a4f')
       .rect(colX[0], tableTop, tableRight - colX[0], (numRows + 1) * rowHeight).stroke();

    // Pie de página (igual al Reporte): línea divisoria + fecha generación + título sistema (centro) + paginación (derecha)
    try {
        const gen = new Date();
        const dd = String(gen.getDate()).padStart(2, '0');
        const mm = String(gen.getMonth() + 1).padStart(2, '0');
        const yyyy = gen.getFullYear();
        const hh = String(gen.getHours()).padStart(2, '0');
        const min = String(gen.getMinutes()).padStart(2, '0');
        const genStr = `${dd}/${mm}/${yyyy} ${hh}:${min}`;

        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
            doc.switchToPage(range.start + i);
            const pw = doc.page.width;
            const ph = doc.page.height;
            const left = 40, right = pw - 40;
            // línea divisoria (gris, ancho 0.5)
            doc.save();
            doc.lineWidth(0.5).strokeColor('#c8c8c8')
               .moveTo(left, ph - 50).lineTo(right, ph - 50).stroke();
            // textos (negrita, tamaños y colores como en Reporte)
            doc.font('Helvetica-Bold').fontSize(9);
            // Fecha (izquierda) gris 80
            doc.fillColor('#505050').text(`Generado: ${genStr}`, left, ph - 36, { width: 200, align: 'left', lineBreak: false, wordWrap: false, height: 12, paragraphGap: 0, ellipsis: false });
            // Título del sistema (centro) verde
            doc.fillColor('#008000').text('Sistema de Gestión de Pacientes', left, ph - 36, { width: pw - 80, align: 'center', lineBreak: false, wordWrap: false, height: 12, paragraphGap: 0, ellipsis: false });
            // Página (derecha) gris 80
            doc.fillColor('#505050').text(`Página ${i + 1} de ${range.count}`, left, ph - 36, { width: pw - 80, align: 'right', lineBreak: false, wordWrap: false, height: 12, paragraphGap: 0, ellipsis: false });
            doc.restore();
        }
    } catch (_) {}

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