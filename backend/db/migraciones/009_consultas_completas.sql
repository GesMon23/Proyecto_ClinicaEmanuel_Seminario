-- Procedimientos de consulta que devolvían menos columnas de las que muestran las pantallas (se reconstruyeron
-- sin la base original). Se agregan las columnas que el frontend lee; las que ya existían se conservan.

-- Ficha del paciente en Egreso y Reingreso: descripciones de departamento, acceso, jornada y estado, y el último
-- egreso (para distinguir fallecidos). Antes Departamento, Jornada y Acceso Vascular salían vacíos.
CREATE OR REPLACE PROCEDURE public.sp_pacientes_para_egreso(
  IN p_dpi text, IN p_noafiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.*, es.descripcion AS estado_descripcion, d.nombre AS departamento_nombre,
           a.descripcion AS acceso_descripcion, j.descripcion AS jornada_descripcion,
           eg.id_causa_egreso AS id_causa, ce.descripcion AS causaegreso_descripcion
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_estados_paciente es ON p.id_estado = es.id_estado
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    LEFT JOIN LATERAL (
      SELECT e.id_causa_egreso FROM public.tbl_egresos e WHERE e.no_afiliacion = p.no_afiliacion
      ORDER BY e.fecha_egreso DESC NULLS LAST, e.fecha_creacion DESC NULLS LAST LIMIT 1
    ) eg ON true
    LEFT JOIN public.tbl_causa_egreso ce ON eg.id_causa_egreso = ce.id_causa
    WHERE (p_dpi IS NOT NULL AND p.dpi = p_dpi) OR (p_noafiliacion IS NOT NULL AND p.no_afiliacion = p_noafiliacion);
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_pacientes_para_reingreso(
  IN p_dpi text, IN p_noafiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.*, es.descripcion AS estado_descripcion, d.nombre AS departamento_nombre,
           a.descripcion AS acceso_descripcion, j.descripcion AS jornada_descripcion,
           eg.id_causa_egreso AS id_causa, ce.descripcion AS causaegreso_descripcion,
           eg.fecha_egreso, eg.observaciones
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_estados_paciente es ON p.id_estado = es.id_estado
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    JOIN LATERAL (
      SELECT e.id_causa_egreso, e.fecha_egreso, e.observaciones FROM public.tbl_egresos e
      WHERE e.no_afiliacion = p.no_afiliacion
      ORDER BY e.fecha_egreso DESC NULLS LAST, e.fecha_creacion DESC NULLS LAST LIMIT 1
    ) eg ON true
    LEFT JOIN public.tbl_causa_egreso ce ON eg.id_causa_egreso = ce.id_causa
    WHERE p.id_estado = 3
      AND (
        (p_dpi IS NULL AND p_noafiliacion IS NULL)
        OR (p_dpi IS NOT NULL AND p.dpi = p_dpi)
        OR (p_noafiliacion IS NOT NULL AND p.no_afiliacion = p_noafiliacion)
      );
END;
$$;

-- Historial del paciente: fecha real de cada gestión (inicio del formulario, egreso o reingreso, no la fecha en que
-- se capturó), período legible y número de gestión en orden cronológico.
CREATE OR REPLACE PROCEDURE public.sp_historial_paciente(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    WITH gestiones AS (
      SELECT 'Formulario'::text AS estado, hf.numero_formulario AS no_formulario,
             COALESCE(hf.inicio_prest_servicios, hf.fecha_creacion::date) AS fecha, hf.observaciones,
             hf.inicio_prest_servicios AS inicio, hf.fin_prest_servicios AS fin,
             NULL::text AS causa_egreso, NULL::text AS descripcion, hf.fecha_creacion AS creado
      FROM public.tbl_historial_formularios hf WHERE hf.no_afiliacion = p_no_afiliacion
      UNION ALL
      SELECT 'Egreso', NULL, COALESCE(e.fecha_egreso, e.fecha_creacion::date), e.observaciones, NULL, NULL,
             ce.descripcion, e.descripcion, e.fecha_creacion
      FROM public.tbl_egresos e LEFT JOIN public.tbl_causa_egreso ce ON e.id_causa_egreso = ce.id_causa
      WHERE e.no_afiliacion = p_no_afiliacion
      UNION ALL
      SELECT 'Reingreso', r.numero_formulario, COALESCE(r.fecha_reingreso, r.fecha_creacion::date), r.observaciones,
             r.inicio_prest_servicios, r.fin_prest_servicios, NULL, NULL, r.fecha_creacion
      FROM public.tbl_reingresos r WHERE r.no_afiliacion = p_no_afiliacion
    )
    SELECT row_number() OVER (ORDER BY fecha, creado) AS numero_gestion, estado, no_formulario,
           to_char(fecha, 'YYYY-MM-DD') AS fecha, observaciones,
           CASE WHEN inicio IS NOT NULL OR fin IS NOT NULL
                THEN concat_ws(' al ', to_char(inicio, 'DD-MM-YYYY'), to_char(fin, 'DD-MM-YYYY')) END AS periodo,
           causa_egreso, descripcion
    FROM gestiones
    ORDER BY fecha DESC, creado DESC NULLS LAST;
END;
$$;

-- Turnos de la ficha del paciente: todos (antes solo los de hoy), con estado y los datos que lee el detalle
CREATE OR REPLACE PROCEDURE public.sp_consulta_turnos_por_afiliacion(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT t.*, t.id_turno AS id_turno_cod, t.no_afiliacion AS noafiliacion,
           es.descripcion AS estado_descripcion, c.descripcion AS nombre_clinica,
           trim(regexp_replace(concat_ws(' ', p.primer_nombre, p.segundo_nombre, p.otros_nombres,
             p.primer_apellido, p.segundo_apellido, p.apellido_casada), '\s+', ' ', 'g')) AS nombrepaciente
    FROM public.tbl_turnos t
    LEFT JOIN public.tbl_pacientes p ON t.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_estados_turno es ON t.id_estado_turno = es.id_estado_turno
    LEFT JOIN public.tbl_clinica c ON t.id_clinica = c.id_clinica
    WHERE t.no_afiliacion = p_no_afiliacion
    ORDER BY t.fecha_turno DESC NULLS LAST, t.fecha_creacion DESC NULLS LAST;
END;
$$;

-- Faltas de la ficha del paciente con los datos del detalle (nombre, sexo, jornada, acceso, departamento, motivo)
CREATE OR REPLACE PROCEDURE public.sp_faltistas_por_afiliacion(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT ft.no_afiliacion, ft.no_afiliacion AS noafiliacion,
           concat_ws(' ', p.primer_nombre, p.segundo_nombre, p.otros_nombres) AS nombres,
           concat_ws(' ', p.primer_apellido, p.segundo_apellido, p.apellido_casada) AS apellidos,
           p.sexo, j.descripcion AS jornada, a.descripcion AS accesovascular, d.nombre AS departamento,
           c.descripcion AS clinica, ft.fecha_falta AS fechafalta, ft.motivo_falta,
           ft.usuario_creacion, ft.fecha_creacion
    FROM public.tbl_faltistas ft
    LEFT JOIN public.tbl_pacientes p ON ft.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_clinica c ON ft.id_clinica = c.id_clinica
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    WHERE ft.no_afiliacion = p_no_afiliacion
    ORDER BY ft.fecha_falta DESC NULLS LAST;
END;
$$;

-- Consulta de Turnos: la tabla lee numeroafiliacion, nombrepaciente, fecha, nombreclinica y estado (antes salían
-- vacías). fecha va como 'YYYY-MM-DD' porque la pantalla la compara con los filtros Desde/Hasta.
CREATE OR REPLACE PROCEDURE public.sp_mostrar_turnos_todos(
  IN p_numeroafiliacion text, IN p_fecha date, IN p_clinica text, IN p_estado text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT t.*, t.id_turno AS id_turno_cod, t.no_afiliacion AS numeroafiliacion,
           trim(regexp_replace(concat_ws(' ', p.primer_nombre, p.segundo_nombre, p.otros_nombres,
             p.primer_apellido, p.segundo_apellido, p.apellido_casada), '\s+', ' ', 'g')) AS nombrepaciente,
           to_char(t.fecha_turno, 'YYYY-MM-DD') AS fecha,
           c.descripcion AS nombreclinica, c.descripcion AS clinica_descripcion,
           es.descripcion AS estado, es.descripcion AS estado_descripcion,
           p.primer_nombre, p.primer_apellido
    FROM public.tbl_turnos t
    JOIN public.tbl_pacientes p ON t.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_clinica c ON t.id_clinica = c.id_clinica
    LEFT JOIN public.tbl_estados_turno es ON t.id_estado_turno = es.id_estado_turno
    WHERE (p_numeroafiliacion IS NULL OR t.no_afiliacion = p_numeroafiliacion)
      AND (p_fecha IS NULL OR t.fecha_turno = p_fecha)
      AND (p_clinica IS NULL OR c.descripcion = p_clinica)
      AND (p_estado IS NULL OR es.descripcion = p_estado)
    ORDER BY t.fecha_turno DESC NULLS LAST, t.fecha_creacion DESC NULLS LAST;
END;
$$;

-- Reporte de Egresos: agrega los datos del paciente que muestra la tabla (nombre, sexo, jornada, acceso,
-- departamento) y las fechas con que se calculan edad y estancia.
CREATE OR REPLACE PROCEDURE public.sp_egreso_filtrado(
  IN p_fechainicio date, IN p_fechafin date, IN p_causa text, IN p_jornada text,
  IN p_accesovascular text, IN p_sexo text, IN p_departamento text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT e.no_afiliacion AS noafiliacion, p.dpi,
           p.primer_nombre AS primernombre, p.segundo_nombre AS segundonombre, p.otros_nombres AS otrosnombres,
           p.primer_apellido AS primerapellido, p.segundo_apellido AS segundoapellido, p.apellido_casada AS apellidocasada,
           trim(regexp_replace(concat_ws(' ', p.primer_nombre, p.segundo_nombre, p.otros_nombres,
             p.primer_apellido, p.segundo_apellido, p.apellido_casada), '\s+', ' ', 'g')) AS nombre_completo,
           p.sexo, p.fecha_nacimiento AS fechanacimiento, p.fecha_ingreso AS fechaingreso,
           j.descripcion AS jornada, a.descripcion AS accesovascular, d.nombre AS departamento,
           e.id_causa_egreso, ce.descripcion AS causa_descripcion,
           e.descripcion, e.fecha_egreso AS fechaegreso, e.observaciones
    FROM public.tbl_egresos e
    JOIN public.tbl_pacientes p ON e.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_causa_egreso ce ON e.id_causa_egreso = ce.id_causa
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    WHERE (p_fechainicio IS NULL OR e.fecha_egreso >= p_fechainicio)
      AND (p_fechafin IS NULL OR e.fecha_egreso <= p_fechafin)
      AND (p_causa IS NULL OR ce.descripcion = p_causa)
      AND (p_jornada IS NULL OR j.descripcion = p_jornada)
      AND (p_accesovascular IS NULL OR a.descripcion = p_accesovascular)
      AND (p_sexo IS NULL OR p.sexo = p_sexo)
      AND (p_departamento IS NULL OR d.nombre = p_departamento)
    ORDER BY e.fecha_egreso DESC NULLS LAST;
END;
$$;
