-- Nuevo flujo de turnos: Creada -> Asignada (desde la pestana Asignacion) -> Llamado
UPDATE public.tbl_estados_turno SET descripcion = 'Asignada' WHERE descripcion = 'Asignado';
INSERT INTO public.tbl_estados_turno (descripcion, estado) VALUES ('Creada', true)
ON CONFLICT (descripcion) DO NOTHING;

CREATE OR REPLACE PROCEDURE public.sp_crear_turno_t(
  IN p_noafiliacion text, IN p_clinica text, IN p_fecha_turno date, IN p_unused text
) LANGUAGE plpgsql AS $$
DECLARE
  v_id_clinica bigint;
  v_id_turno text;
BEGIN
  SELECT id_clinica INTO v_id_clinica FROM public.tbl_clinica WHERE descripcion = p_clinica;
  v_id_turno := 'T-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 6);

  INSERT INTO public.tbl_turnos (id_turno, no_afiliacion, id_clinica, fecha_turno, id_estado_turno, fecha_creacion)
  VALUES (v_id_turno, p_noafiliacion, v_id_clinica, p_fecha_turno,
          (SELECT id_estado_turno FROM public.tbl_estados_turno WHERE descripcion = 'Creada'), now());
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_mostrar_turnos_creados_hoy(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT t.*, t.id_turno AS id_turno_cod, t.no_afiliacion AS noafiliacion,
           c.descripcion AS nombre_clinica,
           trim(regexp_replace(
             COALESCE(p.primer_nombre,'') || ' ' || COALESCE(p.segundo_nombre,'') || ' ' ||
             COALESCE(p.primer_apellido,'') || ' ' || COALESCE(p.segundo_apellido,''),
             '\s+', ' ', 'g'
           )) AS nombrepaciente
    FROM public.tbl_turnos t
    JOIN public.tbl_clinica c ON t.id_clinica = c.id_clinica
    JOIN public.tbl_estados_turno es ON t.id_estado_turno = es.id_estado_turno
    LEFT JOIN public.tbl_pacientes p ON t.no_afiliacion = p.no_afiliacion
    WHERE es.descripcion = 'Creada' AND t.fecha_turno = CURRENT_DATE
    ORDER BY c.descripcion, t.fecha_creacion;
END;
$$;
