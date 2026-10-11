DROP PROCEDURE IF EXISTS public.sp_asignar_turno(text);
DROP PROCEDURE IF EXISTS public.sp_actualizar_estado_llamado(text, refcursor);
DROP PROCEDURE IF EXISTS public.sp_abandonar_turno(text, refcursor);
DROP PROCEDURE IF EXISTS public.sp_finalizar_turno(text, refcursor);

-- Proximos turnos: turnos Asignada (estado 1) que aun no han sido llamados por nadie.
-- Una vez que un usuario llama un turno pasa a estado 4 y deja de aparecer para el resto.
-- [REAL] LlamadoTurnos.jsx lee turno.nombrepaciente y turno.id_turno_cod
-- ademas de no_afiliacion/fecha_turno - confirmado leyendo el JSX.
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
    ORDER BY t.fecha_turno ASC, t.fecha_actualizacion ASC NULLS FIRST, t.fecha_creacion ASC LIMIT 1;
END;
$$;

-- Turno actual de una clinica (el ultimo llamado, sin importar el usuario). Lo usa la pantalla TV.
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
    ORDER BY t.fecha_actualizacion DESC NULLS LAST, t.fecha_asignacion DESC LIMIT 1;
END;
$$;

-- Turno que el usuario tiene actualmente en atencion (estado 4). Un usuario solo puede tener uno.
CREATE OR REPLACE PROCEDURE public.sp_turno_actual_usuario(
  IN p_usuario bigint, INOUT ref refcursor
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
    WHERE t.id_estado_turno = 4 AND t.id_usuario_llamado = p_usuario
    ORDER BY t.fecha_actualizacion DESC NULLS LAST LIMIT 1;
END;
$$;

-- Creada -> Asignada. Registra el usuario que asigna.
CREATE OR REPLACE PROCEDURE public.sp_asignar_turno(
  IN p_turno_id text, IN p_usuario bigint DEFAULT NULL
) LANGUAGE plpgsql AS $$
DECLARE
  v_filas integer;
BEGIN
  UPDATE public.tbl_turnos
     SET id_estado_turno = 1, fecha_asignacion = CURRENT_DATE,
         id_usuario_asignado = p_usuario, fecha_actualizacion = now()
   WHERE id_turno = p_turno_id
     AND id_estado_turno = (SELECT id_estado_turno FROM public.tbl_estados_turno WHERE descripcion = 'Creada');
  GET DIAGNOSTICS v_filas = ROW_COUNT;
  IF v_filas = 0 THEN
    RAISE EXCEPTION 'TURNO_NO_CREADA: el turno no existe o ya no esta en estado Creada';
  END IF;
END;
$$;

-- Asignada -> Llamado por un usuario. El usuario no puede tener otro turno en atencion
-- y el turno solo se puede llamar si sigue Asignada (nadie mas lo llamo antes).
CREATE OR REPLACE PROCEDURE public.sp_actualizar_estado_llamado(
  IN p_idturno text, IN p_usuario bigint, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
DECLARE
  v_filas integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.tbl_turnos WHERE id_estado_turno = 4 AND id_usuario_llamado = p_usuario) THEN
    RAISE EXCEPTION 'USUARIO_CON_TURNO: el usuario ya tiene un turno en atencion';
  END IF;

  UPDATE public.tbl_turnos
     SET id_estado_turno = 4, id_usuario_llamado = p_usuario, fecha_actualizacion = now()
   WHERE id_turno = p_idturno AND id_estado_turno = 1;
  GET DIAGNOSTICS v_filas = ROW_COUNT;
  IF v_filas = 0 THEN
    RAISE EXCEPTION 'TURNO_NO_DISPONIBLE: el turno ya fue llamado por otro usuario o ya no esta asignado';
  END IF;

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
    WHERE t.id_turno = p_idturno;
END;
$$;

-- Llamado -> Abandonado (solo el usuario que lo tiene en atencion)
CREATE OR REPLACE PROCEDURE public.sp_abandonar_turno(
  IN p_idturno text, IN p_usuario bigint, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
DECLARE
  v_filas integer;
BEGIN
  UPDATE public.tbl_turnos
     SET id_estado_turno = 8, id_usuario_finalizado = p_usuario, fecha_actualizacion = now()
   WHERE id_turno = p_idturno AND id_estado_turno = 4 AND id_usuario_llamado = p_usuario;
  GET DIAGNOSTICS v_filas = ROW_COUNT;
  IF v_filas = 0 THEN
    RAISE EXCEPTION 'TURNO_NO_EN_ATENCION: el turno no esta en atencion por este usuario';
  END IF;
  OPEN ref FOR SELECT * FROM public.tbl_turnos WHERE id_turno = p_idturno;
END;
$$;

-- Llamado -> Finalizado (solo el usuario que lo tiene en atencion)
CREATE OR REPLACE PROCEDURE public.sp_finalizar_turno(
  IN p_idturno text, IN p_usuario bigint, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
DECLARE
  v_filas integer;
BEGIN
  UPDATE public.tbl_turnos
     SET id_estado_turno = 5, fecha_finalizacion = CURRENT_DATE,
         id_usuario_finalizado = p_usuario, fecha_actualizacion = now()
   WHERE id_turno = p_idturno AND id_estado_turno = 4 AND id_usuario_llamado = p_usuario;
  GET DIAGNOSTICS v_filas = ROW_COUNT;
  IF v_filas = 0 THEN
    RAISE EXCEPTION 'TURNO_NO_EN_ATENCION: el turno no esta en atencion por este usuario';
  END IF;
  OPEN ref FOR SELECT * FROM public.tbl_turnos WHERE id_turno = p_idturno;
END;
$$;

-- Lista completa de proximos turnos (Asignada, aun sin llamar) de una clinica
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
    ORDER BY t.fecha_turno ASC, t.fecha_actualizacion ASC NULLS FIRST, t.fecha_creacion ASC;
END;
$$;
