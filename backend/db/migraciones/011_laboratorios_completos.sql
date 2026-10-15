-- Laboratorios: las consultas devolvían noafiliacion / idlaboratorio / fecha, pero las pantallas leen
-- no_afiliacion / id_laboratorio / fecha_laboratorio (salían vacías), y el detalle no recibía causa, accesos,
-- antígenos ni observación. Se devuelven todas las columnas con ambos nombres. Además el registro no guardaba
-- quién lo creó.

CREATE OR REPLACE PROCEDURE public.sp_laboratorios_historial_filtrado(
  IN p_desde date, IN p_hasta date, IN p_noafiliacion text, IN p_idlaboratorio bigint,
  IN p_sexo text, IN p_periodicidad text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT l.*, l.no_afiliacion AS noafiliacion, l.idlaboratorio AS id_laboratorio, l.fecha_laboratorio AS fecha,
           p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido,
           p.primer_nombre AS primernombre, p.segundo_nombre AS segundonombre,
           p.primer_apellido AS primerapellido, p.segundo_apellido AS segundoapellido,
           p.sexo, per.descripcion AS periodicidad,
           (SELECT jsonb_agg(jsonb_build_object('parametro', pl.parametro, 'valor', pl.valor) ORDER BY pl.idparametro)
              FROM public.tbl_parametros_laboratorio pl WHERE pl.idlaboratorio = l.idlaboratorio) AS parametros
    FROM public.tbl_laboratorios l
    JOIN public.tbl_pacientes p ON l.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_periodicidadlaboratorio per ON l.idperlaboratorio = per.idperlaboratorio
    WHERE (p_desde IS NULL OR l.fecha_laboratorio >= p_desde)
      AND (p_hasta IS NULL OR l.fecha_laboratorio <= p_hasta)
      AND (p_noafiliacion IS NULL OR l.no_afiliacion = p_noafiliacion)
      AND (p_idlaboratorio IS NULL OR l.idlaboratorio = p_idlaboratorio)
      AND (p_sexo IS NULL OR p.sexo = p_sexo)
      AND (p_periodicidad IS NULL OR per.descripcion = p_periodicidad)
    ORDER BY l.fecha_laboratorio DESC, l.idlaboratorio DESC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_laboratorios_historial_por_afiliacion(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT l.*, l.no_afiliacion AS noafiliacion, l.idlaboratorio AS id_laboratorio, l.fecha_laboratorio AS fecha,
           p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido,
           p.primer_nombre AS primernombre, p.segundo_nombre AS segundonombre,
           p.primer_apellido AS primerapellido, p.segundo_apellido AS segundoapellido,
           p.sexo, per.descripcion AS periodicidad,
           (SELECT jsonb_agg(jsonb_build_object('parametro', pl.parametro, 'valor', pl.valor) ORDER BY pl.idparametro)
              FROM public.tbl_parametros_laboratorio pl WHERE pl.idlaboratorio = l.idlaboratorio) AS parametros
    FROM public.tbl_laboratorios l
    JOIN public.tbl_pacientes p ON l.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_periodicidadlaboratorio per ON l.idperlaboratorio = per.idperlaboratorio
    WHERE l.no_afiliacion = p_no_afiliacion
    ORDER BY l.fecha_laboratorio DESC, l.idlaboratorio DESC;
END;
$$;

-- Registro de laboratorio: igual que antes, más el usuario y la fecha de creación (el backend lo ejecuta con
-- app.current_user = usuario de la sesión)
CREATE OR REPLACE PROCEDURE public.sp_laboratorios_insertar(
  IN p_no_afiliacion text, IN p_idperlaboratorio bigint, IN p_fecha_laboratorio date,
  IN p_infeccion_acceso text, IN p_complicacion_acceso text, IN p_observacion text,
  IN p_examen_realizado boolean, IN p_causa_no_realizado text, IN p_virologia text,
  IN p_antigeno_hepatitis_c boolean, IN p_antigeno_superficie boolean, IN p_hiv text,
  IN p_fecha_registro timestamp, IN p_parametros jsonb, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
DECLARE
  v_id bigint;
  v_count integer := 0;
  v_actor text := COALESCE(NULLIF(current_setting('app.current_user', true), ''), 'sistema');
  r jsonb;
BEGIN
  INSERT INTO public.tbl_laboratorios (
    no_afiliacion, idperlaboratorio, fecha_laboratorio, infeccion_acceso, complicacion_acceso,
    observacion, examen_realizado, causa_no_realizado, virologia, antigeno_hepatitis_c,
    antigeno_superficie, hiv, fecha_registro, usuario_creacion, fecha_creacion
  ) VALUES (
    p_no_afiliacion, p_idperlaboratorio, p_fecha_laboratorio, p_infeccion_acceso, p_complicacion_acceso,
    p_observacion, p_examen_realizado, p_causa_no_realizado, p_virologia, p_antigeno_hepatitis_c,
    p_antigeno_superficie, p_hiv, COALESCE(p_fecha_registro, now()), v_actor, now()
  ) RETURNING idlaboratorio INTO v_id;

  IF p_parametros IS NOT NULL THEN
    FOR r IN SELECT * FROM jsonb_array_elements(p_parametros)
    LOOP
      INSERT INTO public.tbl_parametros_laboratorio (idlaboratorio, parametro, valor, usuario_creacion, fecha_creacion)
        VALUES (v_id, r->>'parametro', r->>'valor', v_actor, now());
      v_count := v_count + 1;
    END LOOP;
  END IF;

  OPEN ref FOR SELECT v_id AS idlaboratorio, v_count AS parametros_insertados;
END;
$$;
