const express = require('express');
const pool = require('../../db/pool');
const jwt = require('jsonwebtoken');
const { runWithUser } = require('../db');
const router = express.Router();
router.use(express.json());


// Endpoint para obtener jornadas
router.get('/jornadas', async (req, res) => {
  try {
    // Intento 1: id_jornada con estado
    try {
      const r1 = await pool.query('SELECT id_jornada, descripcion FROM tbl_jornadas WHERE estado = true ORDER BY descripcion ASC');
      return res.json(r1.rows || []);
    } catch (_) {}
    // Intento 2: idjornada con estado
    try {
      const r2 = await pool.query('SELECT idjornada AS id_jornada, descripcion FROM tbl_jornadas WHERE estado = true ORDER BY descripcion ASC');
      return res.json(r2.rows || []);
    } catch (_) {}
    // Intento 3: id_jornada sin estado
    try {
      const r3 = await pool.query('SELECT id_jornada, descripcion FROM tbl_jornadas ORDER BY descripcion ASC');
      return res.json(r3.rows || []);
    } catch (_) {}
    // Intento 4: idjornada sin estado
    const r4 = await pool.query('SELECT idjornada AS id_jornada, descripcion FROM tbl_jornadas ORDER BY descripcion ASC');
    return res.json(r4.rows || []);
  } catch (error) {
    console.error('Error en /jornadas:', error);
    res.status(500).json({ error: 'Error al obtener jornadas.' });
  }
});


// PUT /api/pacientes/masivo
router.put('/api/pacientes/masivo', async (req, res) => {
    const { pacientes } = req.body;

    // Validaciones iniciales
    if (!Array.isArray(pacientes) || pacientes.length === 0) {
        return res.status(400).json({ error: 'Debe enviar un arreglo de pacientes.' });
    }

    // Derivar usuario desde JWT; si no hay token, usar 'web'
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
        // Prevalidación: NO permitir formularios si algún paciente está egresado o fallecido
        try {
            const client = await pool.connect();
            const bloqueados = [];
            try {
                await client.query('BEGIN');
                for (const item of (Array.isArray(pacientes) ? pacientes : [])) {
                    const af = String(item?.noafiliacion || item?.no_afiliacion || '').trim();
                    if (!af) continue;
                    const cur = 'cur_pac_form_estado';
                    await client.query('CALL public.sp_paciente_por_afiliacion($1,$2)', [af, cur]);
                    const r = await client.query(`FETCH ALL FROM "${cur}"`);
                    // No usar el mismo cursor name repetido en un loop sin cerrar, pero aquí hacemos FETCH y sobreescribimos en cada iter.
                    const pac = r.rows?.[0] || null;
                    if (!pac) {
                        bloqueados.push({ noafiliacion: af, motivo: 'Paciente no encontrado' });
                        continue;
                    }
                    const idEstado = Number(pac.id_estado ?? pac.idestado ?? 0);
                    const idCausa = Number(pac.id_causa ?? pac.idcausa ?? 0);
                    const estadoDesc = String(pac.estado_descripcion ?? pac.estado ?? '').toLowerCase();
                    const causaDesc = String(pac.causaegreso_descripcion ?? pac.causa_egreso_descripcion ?? pac.descripcion ?? '').toLowerCase();
                    const esEgresado = idEstado === 3 || estadoDesc.includes('egres');
                    const esFallecido = idCausa === 1 || estadoDesc.includes('fallec') || causaDesc.includes('fallec');
                    if (esEgresado || esFallecido) {
                        bloqueados.push({ noafiliacion: af, motivo: esFallecido ? 'Fallecido' : 'Egresado' });
                    }
                }
                await client.query('COMMIT');
            } catch (e) {
                try { await client.query('ROLLBACK'); } catch (_) {}
                // Si falla la validación, devolver error controlado
                return res.status(500).json({ error: 'Error al validar estado de pacientes.', detalle: e.message });
            } finally {
                try { client.release(); } catch (_) {}
            }
            if (bloqueados.length > 0) {
                return res.status(400).json({
                    error: 'Hay pacientes que no pueden recibir registro de formulario por estado Egresado o Fallecido.',
                    bloqueados
                });
            }
        } catch (_) {
            return res.status(500).json({ error: 'Error al validar estado de pacientes.' });
        }

        // Ejecutar dentro de runWithUser para que triggers usen app.current_user
        await runWithUser(String(userName), async (client) => {
            await client.query('CALL sp_registro_formularios($1, $2)', [
                JSON.stringify(pacientes),
                userName
            ]);
        });

        res.json({ success: true, mensaje: 'Pacientes actualizados e historial registrado correctamente.' });
    } catch (error) {
        console.error('Error en actualización masiva:', error);
        res.status(500).json({
            error: 'Error al actualizar pacientes.',
            detalle: error.message
        });
    }
});

// Endpoint para obtener paciente por número de afiliación con descripciones de llaves foráneas
router.get('/consulta_pacientes_formularios/:noafiliacion', async (req, res) => {
    try {
        const noaf = String(req.params.noafiliacion || '').trim();
        const client = await pool.connect();
        let rows = [];
        try {
            await client.query('BEGIN');
            const cursorName = 'cur_mostrar_pac_form';
            await client.query('CALL public.sp_mostrar_pacientes_tabla_formularios($1, $2)', [noaf, cursorName]);
            const fetchRes = await client.query(`FETCH ALL FROM "${cursorName}"`);
            rows = fetchRes.rows || [];
            await client.query('COMMIT');
        } catch (e) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            throw e;
        } finally {
            client.release();
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error en /consulta_pacientes_formularios:', error);
        res.status(500).json({ error: 'Error al obtener paciente.', detalle: error.message });
    }
});

module.exports = router;
