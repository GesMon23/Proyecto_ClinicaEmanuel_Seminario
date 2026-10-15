-- Clínicas por usuario en Turnos: un administrador elige en qué clínicas puede llamar turnos cada usuario
-- (pestaña Llamado) y para qué clínicas puede crearlos, editarlos o cancelarlos (pestaña Crear).
-- Sin filas para una función, el usuario usa todas las clínicas (como antes de esta migración).

-- Pestaña nueva en Turnos para administrarlo. Va al rol administrador, no a RolTurnos: así un operador de turnos
-- no puede cambiar las clínicas de los demás. Se puede dar a otros roles desde Permisos de Roles.
INSERT INTO public.tbl_permisos (codigo, modulo, pestana, descripcion, orden) VALUES
  ('turnos.clinicas', 'Turnos', 'Clínicas por Usuario', 'Elegir en qué clínicas llama y crea turnos cada usuario', 34)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.tbl_rol_permiso (id_rol, id_permiso, usuario_creacion)
SELECT r.id_rol, p.id_permiso, 'migracion_007'
FROM public.tbl_roles r JOIN public.tbl_permisos p ON p.codigo = 'turnos.clinicas'
WHERE r.nombre = 'RolGestionUsuarios'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tbl_usuario_clinica (
  id_usuario bigint NOT NULL REFERENCES public.tbl_usuarios (id_usuario) ON DELETE CASCADE,
  funcion text NOT NULL CHECK (funcion IN ('llamado', 'crear')),
  id_clinica bigint NOT NULL REFERENCES public.tbl_clinica (id_clinica) ON DELETE CASCADE,
  usuario_creacion text,
  fecha_creacion timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario, funcion, id_clinica)
);

-- ¿El usuario puede usar la clínica (por nombre) en esa función? Sin restricción = todas.
CREATE OR REPLACE FUNCTION public.fn_usuario_puede_clinica(p_usuario bigint, p_funcion text, p_clinica text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.tbl_usuario_clinica WHERE id_usuario = p_usuario AND funcion = p_funcion)
      OR EXISTS (
        SELECT 1 FROM public.tbl_usuario_clinica uc JOIN public.tbl_clinica c ON c.id_clinica = uc.id_clinica
        WHERE uc.id_usuario = p_usuario AND uc.funcion = p_funcion AND c.descripcion = p_clinica
      );
$$;

-- Igual, a partir de un turno (su clínica). Un turno inexistente devuelve true: el procedimiento de la
-- operación responde "no encontrado".
CREATE OR REPLACE FUNCTION public.fn_usuario_puede_turno(p_usuario bigint, p_funcion text, p_id_turno text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.tbl_usuario_clinica WHERE id_usuario = p_usuario AND funcion = p_funcion)
      OR NOT EXISTS (SELECT 1 FROM public.tbl_turnos WHERE id_turno = p_id_turno)
      OR EXISTS (
        SELECT 1 FROM public.tbl_turnos t JOIN public.tbl_usuario_clinica uc ON uc.id_clinica = t.id_clinica
        WHERE t.id_turno = p_id_turno AND uc.id_usuario = p_usuario AND uc.funcion = p_funcion
      );
$$;

-- Clínicas activas que el usuario puede usar en una función (todas si no tiene restricción)
CREATE OR REPLACE PROCEDURE public.sp_clinicas_usuario(IN p_usuario bigint, IN p_funcion text, INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT c.* FROM public.tbl_clinica c
    WHERE c.estado = true AND public.fn_usuario_puede_clinica(p_usuario, p_funcion, c.descripcion)
    ORDER BY c.descripcion;
END;
$$;

-- Usuarios activos que tienen Llamado o Crear (por alguno de sus roles activos) y sus clínicas por función
-- (NULL = todas las clínicas)
CREATE OR REPLACE PROCEDURE public.sp_usuarios_clinicas(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT u.id_usuario, u.nombre_usuario,
           trim(regexp_replace(COALESCE(e.primer_nombre, '') || ' ' || COALESCE(e.primer_apellido, ''), '\s+', ' ', 'g')) AS empleado,
           bool_or(p.codigo = 'turnos.llamado') AS tiene_llamado,
           bool_or(p.codigo = 'turnos.crear') AS tiene_crear,
           (SELECT array_agg(uc.id_clinica ORDER BY uc.id_clinica) FROM public.tbl_usuario_clinica uc
            WHERE uc.id_usuario = u.id_usuario AND uc.funcion = 'llamado') AS clinicas_llamado,
           (SELECT array_agg(uc.id_clinica ORDER BY uc.id_clinica) FROM public.tbl_usuario_clinica uc
            WHERE uc.id_usuario = u.id_usuario AND uc.funcion = 'crear') AS clinicas_crear
    FROM public.tbl_usuarios u
    JOIN public.tbl_empleados e ON e.id_empleado = u.id_empleado AND e.estado = true
    JOIN public.tbl_usuario_rol ur ON ur.id_usuario = u.id_usuario
    JOIN public.tbl_roles r ON r.id_rol = ur.id_rol AND r.estado = true
    JOIN public.tbl_rol_permiso rp ON rp.id_rol = r.id_rol
    JOIN public.tbl_permisos p ON p.id_permiso = rp.id_permiso AND p.codigo IN ('turnos.llamado', 'turnos.crear')
    WHERE u.estado = true
    GROUP BY u.id_usuario, u.nombre_usuario, e.primer_nombre, e.primer_apellido
    ORDER BY u.nombre_usuario;
END;
$$;

-- Reemplaza las clínicas de un usuario en una función. p_clinicas NULL = todas (sin restricción).
-- Errores: FUNCION_INVALIDA, USUARIO_NO_ENCONTRADO, SIN_CLINICAS (lista vacía), CLINICA_INVALIDA.
CREATE OR REPLACE PROCEDURE public.sp_guardar_clinicas_usuario(
  IN p_usuario bigint, IN p_funcion text, IN p_clinicas bigint[], IN p_actor text
) LANGUAGE plpgsql AS $$
DECLARE
  v_invalidas text;
BEGIN
  IF p_funcion NOT IN ('llamado', 'crear') THEN
    RAISE EXCEPTION 'FUNCION_INVALIDA: Función desconocida: %', p_funcion;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tbl_usuarios WHERE id_usuario = p_usuario) THEN
    RAISE EXCEPTION 'USUARIO_NO_ENCONTRADO: El usuario % no existe', p_usuario;
  END IF;
  IF p_clinicas IS NOT NULL AND cardinality(p_clinicas) = 0 THEN
    RAISE EXCEPTION 'SIN_CLINICAS: Marca al menos una clínica o elige "Todas las clínicas"';
  END IF;
  SELECT string_agg(x::text, ', ') INTO v_invalidas
  FROM unnest(COALESCE(p_clinicas, ARRAY[]::bigint[])) AS x
  WHERE NOT EXISTS (SELECT 1 FROM public.tbl_clinica c WHERE c.id_clinica = x AND c.estado = true);
  IF v_invalidas IS NOT NULL THEN
    RAISE EXCEPTION 'CLINICA_INVALIDA: Clínicas inexistentes o inactivas: %', v_invalidas;
  END IF;

  DELETE FROM public.tbl_usuario_clinica WHERE id_usuario = p_usuario AND funcion = p_funcion;
  IF p_clinicas IS NOT NULL THEN
    INSERT INTO public.tbl_usuario_clinica (id_usuario, funcion, id_clinica, usuario_creacion)
    SELECT DISTINCT p_usuario, p_funcion, x, p_actor FROM unnest(p_clinicas) AS x;
  END IF;
END;
$$;
