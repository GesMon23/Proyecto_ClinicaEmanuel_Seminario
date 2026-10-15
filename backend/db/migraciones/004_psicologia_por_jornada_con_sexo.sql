-- Informes de psicología por jornada con filtro de sexo. sp_psico_informes_por_jornada solo recibe fechas,
-- así que con el filtro de sexo de Estadísticas esa gráfica mostraba datos sin filtrar. Se agrega un
-- procedimiento nuevo (el anterior sigue disponible para /api/estadisticas/psicologia-por-jornada).

CREATE OR REPLACE PROCEDURE public.sp_psicologia_por_jornada(
  IN p_desde date, IN p_hasta date, IN p_sexo character, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT j.descripcion AS jornada, COUNT(*) AS total
    FROM public.tbl_informes_psicologia ip
    JOIN public.tbl_pacientes p ON ip.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    WHERE (p_desde IS NULL OR ip.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR ip.fecha_creacion::date <= p_hasta)
      AND (p_sexo IS NULL OR left(lower(p.sexo), 1) = lower(p_sexo))
    GROUP BY j.descripcion;
END;
$$;
