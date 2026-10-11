-- FUNCTION: public.fn_buscar_pacientes_reingreso(character, text)

-- DROP FUNCTION IF EXISTS public.fn_buscar_pacientes_reingreso(character, text);

CREATE OR REPLACE FUNCTION public.fn_buscar_pacientes_reingreso(
	p_dpi character DEFAULT NULL::bpchar,
	p_noafiliacion text DEFAULT NULL::text)
    RETURNS TABLE(noafiliacion text, dpi character, nopacienteproveedor text, primernombre text, segundonombre text, otrosnombres text, primerapellido text, segundoapellido text, apellidocasada text, fechanacimiento date, sexo text, direccion text, fechaegreso date, idcausa bigint, causaegreso text, descripcionegreso text, urlfoto text, iddepartamento character, idestado integer, fechainicioperiodo date, fechafinperiodo date, sesionesautorizadas integer, observaciones text) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
BEGIN
    RETURN QUERY
        SELECT 
            pac.noafiliacion,
            pac.dpi,
            pac.nopacienteproveedor,
            pac.primernombre,
            pac.segundonombre,
            pac.otrosnombres,
            pac.primerapellido,
            pac.segundoapellido,
            pac.apellidocasada,
            pac.fechanacimiento,
            pac.sexo,
            pac.direccion,
            pac.fechaegreso,
            pac.idcausa,
            pac.causaegreso,
            cau.descripcion AS descripcionegreso,
            pac.urlfoto,
            pac.iddepartamento,
            pac.idestado,
            pac.fechainicioperiodo,
            pac.fechafinperiodo,
            pac.sesionesautorizadasmes AS sesionesautorizadas,
            pac.observaciones
        FROM tbl_pacientes pac
        LEFT JOIN tbl_causaegreso cau ON pac.idcausa = cau.idcausa
        WHERE pac.idestado = 3
          
          AND (
              (p_dpi IS NOT NULL AND pac.dpi = p_dpi) OR
              (p_noafiliacion IS NOT NULL AND pac.noafiliacion = p_noafiliacion)
          );
END;
$BODY$;

ALTER FUNCTION public.fn_buscar_pacientes_reingreso(character, text)
    OWNER TO postgres;
	
-- FUNCTION: public.fn_consultar_turnos(text, date, text)

-- DROP FUNCTION IF EXISTS public.fn_consultar_turnos(text, date, text);

CREATE OR REPLACE FUNCTION public.fn_consultar_turnos(
	p_no_afiliacion text DEFAULT NULL::text,
	p_fecha date DEFAULT NULL::date,
	p_clinica text DEFAULT NULL::text)
    RETURNS TABLE(id_turno text, numero_afiliacion text, nombre_paciente text, fecha text, hora text, nombre_clinica text, estado text) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
BEGIN
    RETURN QUERY
    SELECT 
        t.id_turno,
        t.no_afiliacion,
        p.primer_nombre || ' ' || COALESCE(p.segundo_nombre, '') || ' ' || p.primer_apellido || ' ' || COALESCE(p.segundo_apellido, '') AS nombre_paciente,
        TO_CHAR(t.fecha_turno, 'YYYY-MM-DD') AS fecha,
        TO_CHAR(t.fecha_turno, 'HH24:MI') AS hora,
        c.descripcion AS nombre_clinica,
        e.descripcion AS estado
    FROM tbl_turnos t
    INNER JOIN tbl_pacientes p ON t.no_afiliacion = p.no_afiliacion
    INNER JOIN tbl_clinica c ON t.id_clinica = c.id_clinica
    INNER JOIN tbl_estados_turno e ON t.id_estado_turno = e.id_estado_turno
    WHERE 
        (p_no_afiliacion IS NULL OR t.no_afiliacion = p_no_afiliacion) AND
        (p_fecha IS NULL OR DATE(t.fecha_turno) = p_fecha) AND
        (p_clinica IS NULL OR c.descripcion ILIKE '%' || p_clinica || '%')
    ORDER BY t.fecha_turno DESC;
END;
$BODY$;

ALTER FUNCTION public.fn_consultar_turnos(text, date, text)
    OWNER TO postgres;

-- FUNCTION: public.fn_mostrar_accesos_vascular()

-- DROP FUNCTION IF EXISTS public.fn_mostrar_accesos_vascular();

CREATE OR REPLACE FUNCTION public.fn_mostrar_accesos_vascular(
	)
    RETURNS TABLE(idacceso bigint, descripcion text) 
    LANGUAGE 'sql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
SELECT id_acceso, descripcion FROM tbl_acceso_vascular where estado=true ORDER BY descripcion ASC
$BODY$;

ALTER FUNCTION public.fn_mostrar_accesos_vascular()
    OWNER TO postgres;

-- FUNCTION: public.fn_mostrar_departamentos()

-- DROP FUNCTION IF EXISTS public.fn_mostrar_departamentos();

CREATE OR REPLACE FUNCTION public.fn_mostrar_departamentos(
	)
    RETURNS TABLE(iddepartamento character, nombredepartamento text) 
    LANGUAGE 'sql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
SELECT id_departamento, nombre FROM tbl_departamento ORDER BY nombre ASC
$BODY$;

ALTER FUNCTION public.fn_mostrar_departamentos()
    OWNER TO postgres;

-- FUNCTION: public.fn_mostrar_estados_paciente()

-- DROP FUNCTION IF EXISTS public.fn_mostrar_estados_paciente();

CREATE OR REPLACE FUNCTION public.fn_mostrar_estados_paciente(
	)
    RETURNS TABLE(idestado bigint, descripcion text) 
    LANGUAGE 'sql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
    SELECT id_estado, descripcion
    FROM tbl_estados_paciente
    ORDER BY descripcion ASC;
$BODY$;

ALTER FUNCTION public.fn_mostrar_estados_paciente()
    OWNER TO postgres;

-- FUNCTION: public.fn_mostrar_jornadas()

-- DROP FUNCTION IF EXISTS public.fn_mostrar_jornadas();

CREATE OR REPLACE FUNCTION public.fn_mostrar_jornadas(
	)
    RETURNS TABLE(idjornada bigint, descripcion text, dias text) 
    LANGUAGE 'sql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
SELECT id_jornada, descripcion, dias FROM tbl_jornadas where estado=true ORDER BY descripcion ASC
$BODY$;

ALTER FUNCTION public.fn_mostrar_jornadas()
    OWNER TO postgres;


-- FUNCTION: public.fn_mostrar_medicos()

-- DROP FUNCTION IF EXISTS public.fn_mostrar_medicos();

CREATE OR REPLACE FUNCTION public.fn_mostrar_medicos(
	)
    RETURNS TABLE(idmedico bigint, nombremedico text) 
    LANGUAGE 'sql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
SELECT id_medico, nombre_medico FROM tbl_medicos WHERE estado = true ORDER BY nombre_medico ASC
$BODY$;

ALTER FUNCTION public.fn_mostrar_medicos()
    OWNER TO postgres;

-- FUNCTION: public.fn_mostrar_pacientes_tabla_formularios(text)

-- DROP FUNCTION IF EXISTS public.fn_mostrar_pacientes_tabla_formularios(text);

CREATE OR REPLACE FUNCTION public.fn_mostrar_pacientes_tabla_formularios(
	p_noafiliacion text)
    RETURNS TABLE(noafiliacion text, primernombre text, segundonombre text, primerapellido text, segundoapellido text, departamento_nombre text, estado_descripcion text, acceso_descripcion text, causaegreso_descripcion text, jornada_descripcion text) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
BEGIN
    RETURN QUERY
        SELECT 
            p.noafiliacion, 
            p.primernombre, p.segundonombre, p.primerapellido, p.segundoapellido,
            d.nombre AS departamento_nombre,
            e.descripcion AS estado_descripcion,
            a.descripcion AS acceso_descripcion,
            c.descripcion AS causaegreso_descripcion,
            j.descripcion AS jornada_descripcion
        FROM tbl_pacientes p
        LEFT JOIN tbl_departamentos d ON p.iddepartamento = d.iddepartamento
        LEFT JOIN tbl_estadospaciente e ON p.idestado = e.idestado
        LEFT JOIN tbl_accesovascular a ON p.idacceso = a.idacceso
        LEFT JOIN tbl_causaegreso c ON p.idcausa = c.idcausa
        LEFT JOIN tbl_jornadas j ON p.idjornada = j.idjornada
        WHERE p.noafiliacion = p_noafiliacion;
END;
$BODY$;

ALTER FUNCTION public.fn_mostrar_pacientes_tabla_formularios(text)
    OWNER TO postgres;


-- FUNCTION: public.fn_mostrar_turnos_creados_paciente(text)

-- DROP FUNCTION IF EXISTS public.fn_mostrar_turnos_creados_paciente(text);

CREATE OR REPLACE FUNCTION public.fn_mostrar_turnos_creados_paciente(
	no_afiliacion_param text)
    RETURNS TABLE(noafiliacion text, nombrepaciente text, idturno text, nombreclinica text, fechaturno date) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
BEGIN
    RETURN QUERY
    SELECT 
        pac.no_afiliacion,
        pac.primer_nombre || ' ' || COALESCE(pac.segundo_nombre, '') || ' ' ||
        pac.primer_apellido || ' ' || COALESCE(pac.segundo_apellido, '') AS nombrepaciente,
        tur.id_turno,
        cli.descripcion AS nombreclinica,
        tur.fecha_turno
    FROM tbl_turnos tur
    INNER JOIN tbl_pacientes pac ON tur.no_afiliacion = pac.no_afiliacion
    INNER JOIN tbl_clinica cli ON tur.id_clinica = cli.id_clinica
    WHERE tur.id_estado_turno = 1 AND pac.no_afiliacion = no_afiliacion_param;
END;
$BODY$;

ALTER FUNCTION public.fn_mostrar_turnos_creados_paciente(text)
    OWNER TO postgres;


-- FUNCTION: public.fn_mostrar_turnos_creados_paciente(text)

-- DROP FUNCTION IF EXISTS public.fn_mostrar_turnos_creados_paciente(text);

CREATE OR REPLACE FUNCTION public.fn_mostrar_turnos_creados_paciente(
	no_afiliacion_param text)
    RETURNS TABLE(noafiliacion text, nombrepaciente text, idturno text, nombreclinica text, fechaturno date) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
BEGIN
    RETURN QUERY
    SELECT 
        pac.no_afiliacion,
        pac.primer_nombre || ' ' || COALESCE(pac.segundo_nombre, '') || ' ' ||
        pac.primer_apellido || ' ' || COALESCE(pac.segundo_apellido, '') AS nombrepaciente,
        tur.id_turno,
        cli.descripcion AS nombreclinica,
        tur.fecha_turno
    FROM tbl_turnos tur
    INNER JOIN tbl_pacientes pac ON tur.no_afiliacion = pac.no_afiliacion
    INNER JOIN tbl_clinica cli ON tur.id_clinica = cli.id_clinica
    WHERE tur.id_estado_turno = 1 AND pac.no_afiliacion = no_afiliacion_param;
END;
$BODY$;

ALTER FUNCTION public.fn_mostrar_turnos_creados_paciente(text)
    OWNER TO postgres;


-- FUNCTION: public.fn_mostrar_url_foto(text)

-- DROP FUNCTION IF EXISTS public.fn_mostrar_url_foto(text);

CREATE OR REPLACE FUNCTION public.fn_mostrar_url_foto(
	no_afiliacion_param text)
    RETURNS text
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
DECLARE
    resultado text;
BEGIN
    SELECT url_foto INTO resultado
    FROM tbl_pacientes
    WHERE no_afiliacion = no_afiliacion_param;
    RETURN resultado;
END;
$BODY$;

ALTER FUNCTION public.fn_mostrar_url_foto(text)
    OWNER TO postgres;
