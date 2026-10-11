-- KDQOL: las dimensiones usan en todas partes los nombres del formulario de psicologia
-- (fisico_mental, enfermedad_renal, sintomas_problemas, efectos_enfermedad, vida_diaria).
-- Reemplaza el stub de sp_psicologia_kdqol_promedios (que no devolvia filas).
-- Es idempotente: se puede correr mas de una vez.
-- (esquema_reconstruido.sql tambien corrige las claves del JSON "kdqol" que devuelve
-- sp_guardar_evaluacion_psicologia; ningun cliente las lee, asi que no hace falta reaplicarlo.)

CREATE OR REPLACE PROCEDURE public.sp_psicologia_kdqol_promedios(
  IN p_desde date, IN p_hasta date, IN p_sexo char(1), INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT round(AVG(ip.fisico_mental), 2)       AS fisico_mental,
           round(AVG(ip.enfermedad_renal), 2)    AS enfermedad_renal,
           round(AVG(ip.sintomas_problemas), 2)  AS sintomas_problemas,
           round(AVG(ip.efectos_enfermedad), 2)  AS efectos_enfermedad,
           round(AVG(ip.vida_diaria), 2)         AS vida_diaria
    FROM public.tbl_informes_psicologia ip
    JOIN public.tbl_pacientes p ON ip.no_afiliacion = p.no_afiliacion
    WHERE ip.aplicacion_kdqol = true
      AND (p_desde IS NULL OR ip.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR ip.fecha_creacion::date <= p_hasta)
      AND (p_sexo IS NULL OR left(lower(p.sexo),1) = lower(p_sexo));
END;
$$;
