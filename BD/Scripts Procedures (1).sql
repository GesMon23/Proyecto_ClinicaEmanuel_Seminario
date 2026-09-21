-- PROCEDURE: public.sp_actualizar_datos_paciente(text, text, character, text, text, text, text, text, text, date, text, text, character, bigint, bigint)

-- DROP PROCEDURE IF EXISTS public.sp_actualizar_datos_paciente(text, text, character, text, text, text, text, text, text, date, text, text, character, bigint, bigint);

CREATE OR REPLACE PROCEDURE public.sp_actualizar_datos_paciente(
	IN p_usuario_actualizacion text,
	IN p_no_afiliacion text,
	IN p_dpi character DEFAULT NULL::bpchar,
	IN p_primer_nombre text DEFAULT NULL::text,
	IN p_segundo_nombre text DEFAULT NULL::text,
	IN p_otros_nombres text DEFAULT NULL::text,
	IN p_primer_apellido text DEFAULT NULL::text,
	IN p_segundo_apellido text DEFAULT NULL::text,
	IN p_apellido_casada text DEFAULT NULL::text,
	IN p_fecha_nacimiento date DEFAULT NULL::date,
	IN p_sexo text DEFAULT NULL::text,
	IN p_direccion text DEFAULT NULL::text,
	IN p_id_departamento character DEFAULT NULL::bpchar,
	IN p_id_acceso bigint DEFAULT NULL::bigint,
	IN p_id_jornada bigint DEFAULT NULL::bigint)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
    UPDATE tbl_pacientes
    SET
        dpi = COALESCE(p_dpi, dpi),
        primer_nombre = COALESCE(p_primer_nombre, primer_nombre),
        segundo_nombre = COALESCE(p_segundo_nombre, segundo_nombre),
        otros_nombres = COALESCE(p_otros_nombres, otros_nombres),
        primer_apellido = COALESCE(p_primer_apellido, primer_apellido),
        segundo_apellido = COALESCE(p_segundo_apellido, segundo_apellido),
        apellido_casada = COALESCE(p_apellido_casada, apellido_casada),
        fecha_nacimiento = COALESCE(p_fecha_nacimiento, fecha_nacimiento),
        sexo = COALESCE(p_sexo, sexo),
        direccion = COALESCE(p_direccion, direccion),
        id_departamento = COALESCE(p_id_departamento, id_departamento),
        id_acceso = COALESCE(p_id_acceso, id_acceso),
        id_jornada = COALESCE(p_id_jornada, id_jornada),
        usuario_actualizacion = p_usuario_actualizacion,
        fecha_actualizacion = NOW()
    WHERE no_afiliacion = p_no_afiliacion;
END;
$BODY$;
ALTER PROCEDURE public.sp_actualizar_datos_paciente(text, text, character, text, text, text, text, text, text, date, text, text, character, bigint, bigint)
    OWNER TO postgres;


-- PROCEDURE: public.sp_actualizar_estadoturno(integer, integer)

-- DROP PROCEDURE IF EXISTS public.sp_actualizar_estadoturno(integer, integer);

CREATE OR REPLACE PROCEDURE public.sp_actualizar_estadoturno(
	IN pidturno integer,
	IN pnuevo_estado integer)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
    UPDATE tbl_turnos
    SET idturnoestado = pnuevo_estado
    WHERE idturno = pidturno;
END;
$BODY$;
ALTER PROCEDURE public.sp_actualizar_estadoturno(integer, integer)
    OWNER TO postgres;


-- PROCEDURE: public.sp_actualizar_urlfoto_paciente(text, text)

-- DROP PROCEDURE IF EXISTS public.sp_actualizar_urlfoto_paciente(text, text);

CREATE OR REPLACE PROCEDURE public.sp_actualizar_urlfoto_paciente(
	IN nueva_url text,
	IN afiliacion text)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
    UPDATE tbl_pacientes
    SET urlfoto = nueva_url
    WHERE noafiliacion = afiliacion;
END;
$BODY$;
ALTER PROCEDURE public.sp_actualizar_urlfoto_paciente(text, text)
    OWNER TO postgres;


-- PROCEDURE: public.sp_asignar_turnos(text, bigint)

-- DROP PROCEDURE IF EXISTS public.sp_asignar_turnos(text, bigint);

CREATE OR REPLACE PROCEDURE public.sp_asignar_turnos(
	IN id_turno_param text,
	IN id_usuario_asignado_param bigint)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
    UPDATE tbl_turnos
    SET 
        id_estado_turno = 2,
        fecha_asignacion = NOW(),
        id_usuario_asignado = id_usuario_asignado_param
    WHERE id_turno = id_turno_param;
END;
$BODY$;
ALTER PROCEDURE public.sp_asignar_turnos(text, bigint)
    OWNER TO postgres;


-- PROCEDURE: public.sp_faltar_turnos(text, bigint)

-- DROP PROCEDURE IF EXISTS public.sp_faltar_turnos(text, bigint);

CREATE OR REPLACE PROCEDURE public.sp_faltar_turnos(
	IN id_turno_param text,
	IN id_usuario_asignado_param bigint)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
    UPDATE tbl_turnos
    SET id_estado_turno = 7,
        fecha_asignacion = NOW(),
        id_usuario_asignado = id_usuario_asignado_param
    WHERE id_turno = id_turno_param;
END;
$BODY$;
ALTER PROCEDURE public.sp_faltar_turnos(text, bigint)
    OWNER TO postgres;


-- PROCEDURE: public.sp_insertar_paciente(text, character, text, text, text, text, text, text, text, date, text, text, date, character, bigint, text, bigint, integer, text, text)

-- DROP PROCEDURE IF EXISTS public.sp_insertar_paciente(text, character, text, text, text, text, text, text, text, date, text, text, date, character, bigint, text, bigint, integer, text, text);

CREATE OR REPLACE PROCEDURE public.sp_insertar_paciente(
	IN p_no_afiliacion text,
	IN p_dpi character,
	IN p_no_paciente_proveedor text,
	IN p_primer_nombre text,
	IN p_segundo_nombre text,
	IN p_otros_nombres text,
	IN p_primer_apellido text,
	IN p_segundo_apellido text,
	IN p_apellido_casada text,
	IN p_fecha_nacimiento date,
	IN p_sexo text,
	IN p_direccion text,
	IN p_fecha_ingreso date,
	IN p_id_departamento character,
	IN p_id_acceso bigint,
	IN p_numero_formulario text,
	IN p_id_jornada bigint,
	IN p_sesiones_autorizadas_mes integer,
	IN p_url_foto text,
	IN p_usuario_creacion text)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
    INSERT INTO tbl_pacientes (
        no_afiliacion, dpi, no_paciente_proveedor,
        primer_nombre, segundo_nombre, otros_nombres,
        primer_apellido, segundo_apellido, apellido_casada,
        fecha_nacimiento, sexo, direccion,
        fecha_ingreso, id_departamento, id_estado, id_acceso,
        numero_formulario_activo, id_jornada, sesiones_autorizadas_mes,
        url_foto,
        usuario_creacion, fecha_creacion
    )
    VALUES (
        p_no_afiliacion, p_dpi, p_no_paciente_proveedor,
        p_primer_nombre, p_segundo_nombre, p_otros_nombres,
        p_primer_apellido, p_segundo_apellido, p_apellido_casada,
        p_fecha_nacimiento, p_sexo, p_direccion,
        p_fecha_ingreso, p_id_departamento, 1, p_id_acceso,
        p_numero_formulario, p_id_jornada, p_sesiones_autorizadas_mes,
        p_url_foto,
        p_usuario_creacion, NOW()
    );
END;
$BODY$;
ALTER PROCEDURE public.sp_insertar_paciente(text, character, text, text, text, text, text, text, text, date, text, text, date, character, bigint, text, bigint, integer, text, text)
    OWNER TO postgres;


-- PROCEDURE: public.sp_mostrar_paciente_actualizacion(text)

-- DROP PROCEDURE IF EXISTS public.sp_mostrar_paciente_actualizacion(text);

CREATE OR REPLACE PROCEDURE public.sp_mostrar_paciente_actualizacion(
	IN identificador text,
	OUT ref refcursor)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
    OPEN ref FOR
    SELECT 
        pac.primer_nombre,
        pac.segundo_nombre,
        pac.otros_nombres,
        pac.primer_apellido,
        pac.segundo_apellido,
        pac.apellido_casada,
        pac.sexo,
        pac.fecha_nacimiento,
        pac.dpi,
        pac.no_afiliacion,
        pac.direccion,
        dep.nombre AS nombre_departamento,
        acc.descripcion AS acceso_vascular,
        jor.descripcion AS jornada,
        pac.url_foto
    FROM tbl_pacientes pac
    LEFT JOIN tbl_departamento dep ON pac.id_departamento = dep.id_departamento
    LEFT JOIN tbl_acceso_vascular acc ON pac.id_acceso = acc.id_acceso
    LEFT JOIN tbl_jornadas jor ON pac.id_jornada = jor.id_jornada
    WHERE pac.no_afiliacion = identificador OR pac.dpi = identificador;
END;
$BODY$;
ALTER PROCEDURE public.sp_mostrar_paciente_actualizacion(text)
    OWNER TO postgres;



-- PROCEDURE: public.sp_registrar_faltistas(text, bigint, date, text, text)

-- DROP PROCEDURE IF EXISTS public.sp_registrar_faltistas(text, bigint, date, text, text);

CREATE OR REPLACE PROCEDURE public.sp_registrar_faltistas(
	IN p_no_afiliacion text,
	IN p_id_clinica bigint,
	IN p_fecha_falta date,
	IN p_motivo_falta text,
	IN p_usuario_creacion text)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
    INSERT INTO tbl_faltistas (
        no_afiliacion,
        id_clinica,
        fecha_falta,
        motivo_falta,
        usuario_creacion,
        fecha_creacion
    ) VALUES (
        p_no_afiliacion,
        p_id_clinica,
        p_fecha_falta,
        p_motivo_falta,
        p_usuario_creacion,
        NOW()
    );
END;
$BODY$;
ALTER PROCEDURE public.sp_registrar_faltistas(text, bigint, date, text, text)
    OWNER TO postgres;



-- PROCEDURE: public.sp_registro_formularios(json, text)

-- DROP PROCEDURE IF EXISTS public.sp_registro_formularios(json, text);

CREATE OR REPLACE PROCEDURE public.sp_registro_formularios(
	IN p_pacientes json,
	IN p_usuario text)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    r RECORD;
    v_existente INTEGER;
BEGIN
    -- Validar usuario
    IF p_usuario IS NULL OR p_usuario = '' THEN
        RAISE EXCEPTION 'Debe proporcionar el usuario que realiza la actualización.';
    END IF;

    -- Iterar sobre cada paciente del JSON
    FOR r IN
        SELECT *
        FROM json_to_recordset(p_pacientes) AS (
            noafiliacion TEXT,
            numeroformulario TEXT,
            fechainicioperiodo DATE,
            fechafinperiodo DATE,
            sesionesautorizadasmes INTEGER,
            idjornada BIGINT
        )
    LOOP
        -- Verificar existencia del paciente
        SELECT COUNT(*) INTO v_existente
        FROM tbl_pacientes
        WHERE noafiliacion = r.noafiliacion;

        IF v_existente = 0 THEN
            RAISE EXCEPTION 'No existe paciente con noafiliacion=%', r.noafiliacion;
        END IF;

        -- Actualizar paciente
        UPDATE tbl_pacientes
        SET numeroformulario = r.numeroformulario,
            fechainicioperiodo = r.fechainicioperiodo,
            fechafinperiodo = r.fechafinperiodo,
            sesionesautorizadasmes = r.sesionesautorizadasmes,
            idjornada = COALESCE(r.idjornada, idjornada),
            idestado = 2
        WHERE noafiliacion = r.noafiliacion;

        -- Insertar en historial
        INSERT INTO tbl_historial_formularios (
            noafiliacion,
            numeroformulario,
            fechainicioperiodo,
            fechafinperiodo,
            sesionesautorizadasmes,
            idjornada,
            usuario_creacion,
            fecha_creacion
        ) VALUES (
            r.noafiliacion,
            r.numeroformulario,
            r.fechainicioperiodo,
            r.fechafinperiodo,
            r.sesionesautorizadasmes,
            r.idjornada,
            p_usuario,
            NOW()
        );
    END LOOP;
END;
$BODY$;
ALTER PROCEDURE public.sp_registro_formularios(json, text)
    OWNER TO postgres;
