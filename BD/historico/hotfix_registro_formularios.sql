CREATE OR REPLACE PROCEDURE public.sp_registro_formularios(
  IN p_pacientes json, IN p_usuario text
) LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  v_existe integer;
BEGIN
  IF p_usuario IS NULL OR p_usuario = '' THEN
    RAISE EXCEPTION 'Debe proporcionar el usuario que realiza la actualizacion.';
  END IF;

  FOR r IN
    SELECT * FROM json_to_recordset(p_pacientes) AS (
      noafiliacion text,
      numeroformulario text,
      fechainicioperiodo date,
      fechafinperiodo date,
      sesionesautorizadasmes integer,
      idjornada bigint
    )
  LOOP
    SELECT COUNT(*) INTO v_existe FROM public.tbl_pacientes WHERE no_afiliacion = r.noafiliacion;
    IF v_existe = 0 THEN
      RAISE EXCEPTION 'No existe paciente con no_afiliacion=%', r.noafiliacion;
    END IF;

    UPDATE public.tbl_pacientes SET
      numero_formulario_activo = r.numeroformulario,
      inicio_prest_servicios = r.fechainicioperiodo,
      fin_prest_servicios = r.fechafinperiodo,
      sesiones_autorizadas_mes = r.sesionesautorizadasmes,
      id_jornada = COALESCE(r.idjornada, id_jornada),
      id_estado = 1,
      usuario_actualizacion = p_usuario,
      fecha_actualizacion = now()
    WHERE no_afiliacion = r.noafiliacion;

    INSERT INTO public.tbl_historial_formularios (
      no_afiliacion, numero_formulario, sesiones_autorizadas_mes,
      inicio_prest_servicios, fin_prest_servicios, usuario_creacion, fecha_creacion
    ) VALUES (
      r.noafiliacion, r.numeroformulario, r.sesionesautorizadasmes,
      r.fechainicioperiodo, r.fechafinperiodo, p_usuario, now()
    ) ON CONFLICT (no_afiliacion, numero_formulario) DO UPDATE SET
      sesiones_autorizadas_mes = EXCLUDED.sesiones_autorizadas_mes,
      inicio_prest_servicios = EXCLUDED.inicio_prest_servicios,
      fin_prest_servicios = EXCLUDED.fin_prest_servicios,
      usuario_actualizacion = p_usuario, fecha_actualizacion = now();
  END LOOP;
END;
$$;
