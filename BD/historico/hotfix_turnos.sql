CREATE OR REPLACE PROCEDURE public.sp_mostrar_turnos_t(
  IN p_noafiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT t.*, t.id_turno AS id_turno_cod, c.descripcion AS nombre_clinica
    FROM public.tbl_turnos t
    LEFT JOIN public.tbl_clinica c ON t.id_clinica = c.id_clinica
    WHERE t.no_afiliacion = p_noafiliacion
    ORDER BY t.fecha_turno DESC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_mostrar_turnos_faltantes_t(
  IN p_noafiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT t.*, t.id_turno AS id_turno_cod, c.descripcion AS nombre_clinica
    FROM public.tbl_turnos t
    LEFT JOIN public.tbl_clinica c ON t.id_clinica = c.id_clinica
    WHERE t.no_afiliacion = p_noafiliacion AND t.id_estado_turno = 7
    ORDER BY t.fecha_turno DESC;
END;
$$;
