-- 1CONSULTA PARA ACTUALIZACION PACIENTES

Select 	pac.primer_nombre,
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
		dep.nombre as nombre_departamento,
		acc.descripcion as acceso_vascular,
		jor.descripcion as jornada,
		pac.url_foto
from tbl_pacientes pac
LEFT JOIN tbl_departamento dep ON pac.id_departamento = dep.id_departamento
    LEFT JOIN tbl_acceso_vascular acc ON pac.id_acceso = acc.id_acceso
    LEFT JOIN tbl_jornadas jor ON pac.id_jornada = jor.id_jornada
    WHERE p.noafiliacion = $1 or p.dpi= $1;

--1. 1SP CONSULTA PARA ACTUALIZAR PACIENTES

CREATE OR REPLACE PROCEDURE SP_Mostrar_paciente_actualizacion(
    identificador TEXT,             
    ref OUT REFCURSOR
)
LANGUAGE plpgsql
AS $$
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
$$;


--2. Update de pacientes Actualizacion de datos de pacientes

CREATE OR REPLACE PROCEDURE SP_Actualizar_datos_paciente(
    p_usuario_actualizacion TEXT,
    p_no_afiliacion TEXT,
    p_dpi CHAR(13) DEFAULT NULL,
    p_primer_nombre TEXT DEFAULT NULL,
    p_segundo_nombre TEXT DEFAULT NULL,
    p_otros_nombres TEXT DEFAULT NULL,
    p_primer_apellido TEXT DEFAULT NULL,
    p_segundo_apellido TEXT DEFAULT NULL,
    p_apellido_casada TEXT DEFAULT NULL,
    p_fecha_nacimiento DATE DEFAULT NULL,
    p_sexo TEXT DEFAULT NULL,
    p_direccion TEXT DEFAULT NULL,
    p_id_departamento CHAR(2) DEFAULT NULL,
    p_id_acceso BIGINT DEFAULT NULL,
    p_id_jornada BIGINT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
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
$$;

select * from tbl_pacientes

--FUncion para saber si existe Url_foto
CREATE OR REPLACE FUNCTION FN_Mostrar_url_foto(no_afiliacion_param text)
RETURNS text AS $$
DECLARE
    resultado text;
BEGIN
    SELECT url_foto INTO resultado
    FROM tbl_pacientes
    WHERE no_afiliacion = no_afiliacion_param;
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;


--Función para buscar turnos creados por pacientes

CREATE OR REPLACE FUNCTION FN_Mostrar_Turnos_Creados_Paciente(no_afiliacion_param text)
RETURNS TABLE (
    noafiliacion text,
    nombrepaciente text,
    idturno text,
    nombreclinica text,
    fechaturno date
) AS $$
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
$$ LANGUAGE plpgsql;



--SP para asignar un turno

CREATE OR REPLACE PROCEDURE SP_Asignar_Turnos(
    id_turno_param text,
    id_usuario_asignado_param bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE tbl_turnos
    SET 
        id_estado_turno = 2,
        fecha_asignacion = NOW(),
        id_usuario_asignado = id_usuario_asignado_param
    WHERE id_turno = id_turno_param;
END;
$$;
Select * from tbl_turnos
Select * from tbl_estados_turno



--SP para faltar turno

CREATE OR REPLACE PROCEDURE SP_Faltar_Turnos(
	id_turno_param text,
    id_usuario_asignado_param bigint)
LANGUAGE 'plpgsql'
AS $$
BEGIN
    UPDATE tbl_turnos
    SET id_estado_turno = 7,
        fecha_asignacion = NOW(),
        id_usuario_asignado = id_usuario_asignado_param
    WHERE id_turno = id_turno_param;
END;
$$;


--SP Insertar Faltistas

CREATE OR REPLACE PROCEDURE SP_Registrar_Faltistas(
    IN p_no_afiliacion text,
    IN p_id_clinica bigint,
    IN p_fecha_falta date,
    IN p_motivo_falta text,
    IN p_usuario_creacion text
)
LANGUAGE plpgsql
AS $$
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
$$;

Select * from tbl_faltistas




--FN para mostrar los datos de los apacientes en ConsultaPacientes PENDIENTEEEE
SELECT 
    p.*, 
    d.nombre AS departamento_nombre,
    e.descripcion AS estado_descripcion,
    a.descripcion AS acceso_descripcion,
    j.descripcion AS jornada_descripcion,
    ce.descripcion AS causaegreso_descripcion
FROM tbl_pacientes p
LEFT JOIN tbl_departamento d ON p.id_departamento = d.id_departamento
LEFT JOIN tbl_estados_paciente e ON p.id_estado = e.id_estado
LEFT JOIN tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
LEFT JOIN tbl_jornadas j ON p.id_jornada = j.id_jornada
LEFT JOIN tbl_egresos eg ON p.no_afiliacion = eg.no_afiliacion
LEFT JOIN tbl_causa_egreso ce ON eg.id_causa_egreso = ce.id_causa
WHERE p.no_afiliacion = $1


--FN para mostrar medicos
CREATE OR REPLACE FUNCTION fn_mostrar_medicos(
	)
    RETURNS TABLE(idmedico bigint, NombreMedico text) 
    LANGUAGE 'sql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
SELECT id_medico, nombre_medico FROM tbl_medicos WHERE estado = true ORDER BY nombre_medico ASC
$BODY$;


SELECT id_medico, nombre_medico FROM tbl_medicos WHERE estado = true ORDER BY nombre_medico ASC