CREATE OR REPLACE PROCEDURE public.sp_historial_psicologia_filtrado(
  IN p_desde date, IN p_hasta date, IN p_noafiliacion text, IN p_idinforme text,
  IN p_sexo text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT ip.no_afiliacion, p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido, p.sexo,
           ip.id_informe, ip.fecha_creacion, ip.motivo_consulta, ip.tipo_consulta, ip.tipo_atencion,
           ip.pronostico_paciente, ip.usuario_creacion, ip.observaciones,
           jsonb_build_object(
             'fisico_mental', ip.fisico_mental, 'enfermedad_renal', ip.enfermedad_renal,
             'sintomas_problemas', ip.sintomas_problemas, 'efectos_enfermedad', ip.efectos_enfermedad,
             'vida_diaria', ip.vida_diaria
           ) AS kdqol
    FROM public.tbl_informes_psicologia ip
    JOIN public.tbl_pacientes p ON ip.no_afiliacion = p.no_afiliacion
    WHERE (p_desde IS NULL OR ip.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR ip.fecha_creacion::date <= p_hasta)
      AND (p_noafiliacion IS NULL OR ip.no_afiliacion = p_noafiliacion)
      AND (p_idinforme IS NULL OR ip.id_informe = p_idinforme)
      AND (p_sexo IS NULL OR p.sexo = p_sexo)
    ORDER BY ip.fecha_creacion DESC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_historial_psicologia_por_afiliacion(
  IN p_noafiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT ip.no_afiliacion, p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido, p.sexo,
           ip.id_informe, ip.fecha_creacion, ip.motivo_consulta, ip.tipo_consulta, ip.tipo_atencion,
           ip.pronostico_paciente, ip.usuario_creacion, ip.observaciones,
           jsonb_build_object(
             'fisico_mental', ip.fisico_mental, 'enfermedad_renal', ip.enfermedad_renal,
             'sintomas_problemas', ip.sintomas_problemas, 'efectos_enfermedad', ip.efectos_enfermedad,
             'vida_diaria', ip.vida_diaria
           ) AS kdqol
    FROM public.tbl_informes_psicologia ip
    JOIN public.tbl_pacientes p ON ip.no_afiliacion = p.no_afiliacion
    WHERE ip.no_afiliacion = p_noafiliacion
    ORDER BY ip.fecha_creacion DESC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_historial_nutricion_filtrado(
  IN p_desde date, IN p_hasta date, IN p_noafiliacion text, IN p_idinforme text,
  IN p_sexo text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT n.no_afiliacion, p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido, p.sexo,
           n.id_informe, n.fecha_creacion, n.motivo_consulta, n.estado_nutricional,
           n.altura_cm, n.peso_kg, n.imc, n.usuario_creacion, n.observaciones
    FROM public.tbl_informe_nutricion n
    JOIN public.tbl_pacientes p ON n.no_afiliacion = p.no_afiliacion
    WHERE (p_desde IS NULL OR n.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR n.fecha_creacion::date <= p_hasta)
      AND (p_noafiliacion IS NULL OR n.no_afiliacion = p_noafiliacion)
      AND (p_idinforme IS NULL OR n.id_informe = p_idinforme)
      AND (p_sexo IS NULL OR p.sexo = p_sexo)
    ORDER BY n.fecha_creacion DESC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_historial_nutricion_por_afiliacion(
  IN p_noafiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT n.no_afiliacion, p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido, p.sexo,
           n.id_informe, n.fecha_creacion, n.motivo_consulta, n.estado_nutricional,
           n.altura_cm, n.peso_kg, n.imc, n.usuario_creacion, n.observaciones
    FROM public.tbl_informe_nutricion n
    JOIN public.tbl_pacientes p ON n.no_afiliacion = p.no_afiliacion
    WHERE n.no_afiliacion = p_noafiliacion
    ORDER BY n.fecha_creacion DESC;
END;
$$;
