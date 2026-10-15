-- Turnos de un paciente en la pestaña Crear (y sus faltantes): el calendario y el detalle del turno leen
-- noafiliacion y nombrepaciente, que estos procedimientos no devolvían ("Paciente: undefined").

CREATE OR REPLACE PROCEDURE public.sp_mostrar_turnos_t(
  IN p_noafiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT t.*, t.id_turno AS id_turno_cod, t.no_afiliacion AS noafiliacion,
           c.descripcion AS nombre_clinica, es.descripcion AS estado_descripcion,
           trim(regexp_replace(concat_ws(' ', p.primer_nombre, p.segundo_nombre, p.otros_nombres,
             p.primer_apellido, p.segundo_apellido, p.apellido_casada), '\s+', ' ', 'g')) AS nombrepaciente
    FROM public.tbl_turnos t
    LEFT JOIN public.tbl_clinica c ON t.id_clinica = c.id_clinica
    LEFT JOIN public.tbl_pacientes p ON t.no_afiliacion = p.no_afiliacion
    JOIN public.tbl_estados_turno es ON t.id_estado_turno = es.id_estado_turno
    WHERE t.no_afiliacion = p_noafiliacion
      -- Pestaña Crear: solo turnos en estado Creada (los asignados ya pasaron a Asignación y Llamado)
      AND es.descripcion = 'Creada'
    ORDER BY t.fecha_turno DESC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_mostrar_turnos_faltantes_t(
  IN p_noafiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT t.*, t.id_turno AS id_turno_cod, t.no_afiliacion AS noafiliacion, c.descripcion AS nombre_clinica,
           trim(regexp_replace(concat_ws(' ', p.primer_nombre, p.segundo_nombre, p.otros_nombres,
             p.primer_apellido, p.segundo_apellido, p.apellido_casada), '\s+', ' ', 'g')) AS nombrepaciente
    FROM public.tbl_turnos t
    LEFT JOIN public.tbl_clinica c ON t.id_clinica = c.id_clinica
    LEFT JOIN public.tbl_pacientes p ON t.no_afiliacion = p.no_afiliacion
    WHERE t.no_afiliacion = p_noafiliacion AND t.id_estado_turno = 7
    ORDER BY t.fecha_turno DESC;
END;
$$;
