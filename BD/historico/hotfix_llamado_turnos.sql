CREATE OR REPLACE PROCEDURE public.sp_siguiente_turno(
  IN p_descripcion_clinica text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT t.*, t.id_turno AS id_turno_cod, c.descripcion AS nombre_clinica,
           trim(regexp_replace(
             COALESCE(p.primer_nombre,'') || ' ' || COALESCE(p.segundo_nombre,'') || ' ' ||
             COALESCE(p.primer_apellido,'') || ' ' || COALESCE(p.segundo_apellido,''),
             '\s+', ' ', 'g'
           )) AS nombrepaciente
    FROM public.tbl_turnos t
    JOIN public.tbl_clinica c ON t.id_clinica = c.id_clinica
    LEFT JOIN public.tbl_pacientes p ON t.no_afiliacion = p.no_afiliacion
    WHERE c.descripcion = p_descripcion_clinica AND t.id_estado_turno = 1
    ORDER BY t.fecha_turno ASC, t.fecha_asignacion ASC LIMIT 1;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_turno_actual(
  IN p_descripcion_clinica text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT t.*, t.id_turno AS id_turno_cod, c.descripcion AS nombre_clinica,
           trim(regexp_replace(
             COALESCE(p.primer_nombre,'') || ' ' || COALESCE(p.segundo_nombre,'') || ' ' ||
             COALESCE(p.primer_apellido,'') || ' ' || COALESCE(p.segundo_apellido,''),
             '\s+', ' ', 'g'
           )) AS nombrepaciente
    FROM public.tbl_turnos t
    JOIN public.tbl_clinica c ON t.id_clinica = c.id_clinica
    LEFT JOIN public.tbl_pacientes p ON t.no_afiliacion = p.no_afiliacion
    WHERE c.descripcion = p_descripcion_clinica AND t.id_estado_turno = 4
    ORDER BY t.fecha_asignacion DESC LIMIT 1;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_siguientes_turnos(
  IN p_clinica text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT t.*, t.id_turno AS id_turno_cod, c.descripcion AS nombre_clinica,
           trim(regexp_replace(
             COALESCE(p.primer_nombre,'') || ' ' || COALESCE(p.segundo_nombre,'') || ' ' ||
             COALESCE(p.primer_apellido,'') || ' ' || COALESCE(p.segundo_apellido,''),
             '\s+', ' ', 'g'
           )) AS nombrepaciente
    FROM public.tbl_turnos t
    JOIN public.tbl_clinica c ON t.id_clinica = c.id_clinica
    LEFT JOIN public.tbl_pacientes p ON t.no_afiliacion = p.no_afiliacion
    WHERE c.descripcion = p_clinica AND t.id_estado_turno = 1
    ORDER BY t.fecha_turno ASC LIMIT 5;
END;
$$;
