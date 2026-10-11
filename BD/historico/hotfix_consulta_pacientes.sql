CREATE OR REPLACE PROCEDURE public.sp_paciente_por_afiliacion(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.*, es.descripcion AS estado_descripcion,
           d.nombre AS departamento_nombre, a.descripcion AS acceso_descripcion,
           j.descripcion AS jornada_descripcion,
           eg.id_causa_egreso AS id_causa, ce.descripcion AS causaegreso_descripcion
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_estados_paciente es ON p.id_estado = es.id_estado
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    LEFT JOIN LATERAL (
      SELECT * FROM public.tbl_egresos e WHERE e.no_afiliacion = p.no_afiliacion
      ORDER BY e.fecha_creacion DESC NULLS LAST LIMIT 1
    ) eg ON true
    LEFT JOIN public.tbl_causa_egreso ce ON eg.id_causa_egreso = ce.id_causa
    WHERE p.no_afiliacion = p_no_afiliacion;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_paciente_por_dpi(
  IN p_dpi text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.*, es.descripcion AS estado_descripcion,
           d.nombre AS departamento_nombre, a.descripcion AS acceso_descripcion,
           j.descripcion AS jornada_descripcion,
           eg.id_causa_egreso AS id_causa, ce.descripcion AS causaegreso_descripcion
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_estados_paciente es ON p.id_estado = es.id_estado
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    LEFT JOIN LATERAL (
      SELECT * FROM public.tbl_egresos e WHERE e.no_afiliacion = p.no_afiliacion
      ORDER BY e.fecha_creacion DESC NULLS LAST LIMIT 1
    ) eg ON true
    LEFT JOIN public.tbl_causa_egreso ce ON eg.id_causa_egreso = ce.id_causa
    WHERE p.dpi = p_dpi;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_historial_paciente(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT NULL::bigint AS numero_gestion, 'Formulario'::text AS estado,
           hf.numero_formulario AS no_formulario, hf.fecha_creacion AS fecha,
           NULL::text AS observaciones,
           (COALESCE(hf.inicio_prest_servicios::text, '') || ' - ' || COALESCE(hf.fin_prest_servicios::text, '')) AS periodo,
           NULL::text AS causa_egreso, NULL::text AS descripcion
    FROM public.tbl_historial_formularios hf
    WHERE hf.no_afiliacion = p_no_afiliacion
    UNION ALL
    SELECT NULL::bigint, 'Egreso'::text, NULL::text, e.fecha_creacion,
           e.observaciones, NULL::text, ce.descripcion, e.descripcion
    FROM public.tbl_egresos e
    LEFT JOIN public.tbl_causa_egreso ce ON e.id_causa_egreso = ce.id_causa
    WHERE e.no_afiliacion = p_no_afiliacion
    UNION ALL
    SELECT NULL::bigint, 'Reingreso'::text, r.numero_formulario, r.fecha_creacion,
           r.observaciones, NULL::text, NULL::text, NULL::text
    FROM public.tbl_reingresos r
    WHERE r.no_afiliacion = p_no_afiliacion
    ORDER BY fecha DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_faltistas_por_afiliacion(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT ft.no_afiliacion, c.descripcion AS clinica, ft.fecha_falta AS fechafalta, ft.motivo_falta
    FROM public.tbl_faltistas ft
    LEFT JOIN public.tbl_clinica c ON ft.id_clinica = c.id_clinica
    WHERE ft.no_afiliacion = p_no_afiliacion
    ORDER BY ft.fecha_falta DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_consulta_turnos_por_afiliacion(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT t.*, es.descripcion AS estado_descripcion, c.descripcion AS nombre_clinica
    FROM public.tbl_turnos t
    LEFT JOIN public.tbl_estados_turno es ON t.id_estado_turno = es.id_estado_turno
    LEFT JOIN public.tbl_clinica c ON t.id_clinica = c.id_clinica
    WHERE t.no_afiliacion = p_no_afiliacion AND t.fecha_turno = CURRENT_DATE;
END;
$$;
