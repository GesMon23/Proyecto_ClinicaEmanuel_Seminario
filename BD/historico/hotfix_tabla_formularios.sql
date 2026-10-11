CREATE OR REPLACE PROCEDURE public.sp_mostrar_pacientes_tabla_formularios(
  IN p_noafiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.no_afiliacion AS noafiliacion,
           p.dpi,
           p.primer_nombre AS primernombre,
           p.segundo_nombre AS segundonombre,
           p.otros_nombres AS otrosnombres,
           p.primer_apellido AS primerapellido,
           p.segundo_apellido AS segundoapellido,
           p.apellido_casada AS apellidocasada,
           p.sexo,
           p.id_departamento AS iddepartamento,
           p.id_estado AS idestado,
           p.id_acceso AS idacceso,
           p.id_jornada AS idjornada,
           p.numero_formulario_activo AS numeroformulario,
           d.nombre AS departamento_nombre, es.descripcion AS estado_descripcion,
           a.descripcion AS acceso_descripcion, j.descripcion AS jornada_descripcion
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    LEFT JOIN public.tbl_estados_paciente es ON p.id_estado = es.id_estado
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    WHERE p.no_afiliacion = p_noafiliacion;
END;
$$;
