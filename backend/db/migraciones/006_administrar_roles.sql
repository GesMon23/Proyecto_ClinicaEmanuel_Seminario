-- Administración de roles desde Gestión de Usuarios > Permisos de Roles: crear roles, elegir sus pestañas y
-- activarlos o desactivarlos. Es una pestaña aparte de "Roles" (asignar roles a usuarios) para que quien asigna
-- roles no pueda también redefinir lo que cada rol permite.

INSERT INTO public.tbl_permisos (codigo, modulo, pestana, descripcion, orden) VALUES
  ('usuarios.permisos', 'Gestión de Usuarios', 'Permisos de Roles', 'Crear roles y elegir las pestañas de cada uno', 104)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.tbl_rol_permiso (id_rol, id_permiso, usuario_creacion)
SELECT r.id_rol, p.id_permiso, 'migracion_006'
FROM public.tbl_roles r JOIN public.tbl_permisos p ON p.codigo = 'usuarios.permisos'
WHERE r.nombre = 'RolGestionUsuarios'
ON CONFLICT DO NOTHING;

-- Usuarios activos (usuario y empleado) que tienen un permiso por alguno de sus roles activos.
-- Sirve para no dejar el sistema sin nadie que pueda administrar los permisos.
CREATE OR REPLACE FUNCTION public.fn_usuarios_con_permiso(p_codigo text)
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT count(DISTINCT u.id_usuario)::int
  FROM public.tbl_usuarios u
  JOIN public.tbl_empleados e ON e.id_empleado = u.id_empleado AND e.estado = true
  JOIN public.tbl_usuario_rol ur ON ur.id_usuario = u.id_usuario
  JOIN public.tbl_roles r ON r.id_rol = ur.id_rol AND r.estado = true
  JOIN public.tbl_rol_permiso rp ON rp.id_rol = r.id_rol
  JOIN public.tbl_permisos p ON p.id_permiso = rp.id_permiso AND p.codigo = p_codigo
  WHERE u.estado = true;
$$;

-- Catálogo de pestañas, en el orden en que aparecen en los módulos
CREATE OR REPLACE PROCEDURE public.sp_permisos_catalogo(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT codigo, modulo, pestana, descripcion FROM public.tbl_permisos ORDER BY orden, codigo;
END;
$$;

-- Todos los roles (también los inactivos) con sus pestañas y cuántos usuarios activos los tienen
CREATE OR REPLACE PROCEDURE public.sp_roles_con_permisos(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT r.id_rol, r.nombre, r.descripcion, COALESCE(r.estado, false) AS estado,
           COALESCE(
             (SELECT array_agg(p.codigo ORDER BY p.orden)
              FROM public.tbl_rol_permiso rp JOIN public.tbl_permisos p ON p.id_permiso = rp.id_permiso
              WHERE rp.id_rol = r.id_rol),
             ARRAY[]::text[]
           ) AS permisos,
           (SELECT count(*)::int
            FROM public.tbl_usuario_rol ur JOIN public.tbl_usuarios u ON u.id_usuario = ur.id_usuario AND u.estado = true
            WHERE ur.id_rol = r.id_rol) AS usuarios
    FROM public.tbl_roles r
    ORDER BY r.nombre;
END;
$$;

-- Crea (p_id_rol NULL) o actualiza un rol y reemplaza sus pestañas. Errores de negocio:
--   ROL_NO_ENCONTRADO, ROL_DUPLICADO, PERMISO_INVALIDO y SIN_ADMINISTRADOR (el cambio dejaría el sistema sin
--   ningún usuario activo que pueda administrar los permisos).
CREATE OR REPLACE PROCEDURE public.sp_guardar_rol(
  IN p_id_rol bigint, IN p_nombre text, IN p_descripcion text, IN p_estado boolean, IN p_permisos text[],
  IN p_usuario text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
DECLARE
  v_id bigint := p_id_rol;
  v_nombre text := btrim(p_nombre);
  v_administradores integer := public.fn_usuarios_con_permiso('usuarios.permisos');
  v_invalidos text;
BEGIN
  SELECT string_agg(c, ', ') INTO v_invalidos
  FROM unnest(COALESCE(p_permisos, ARRAY[]::text[])) AS c
  WHERE NOT EXISTS (SELECT 1 FROM public.tbl_permisos p WHERE p.codigo = c);
  IF v_invalidos IS NOT NULL THEN
    RAISE EXCEPTION 'PERMISO_INVALIDO: Pestañas desconocidas: %', v_invalidos;
  END IF;

  IF EXISTS (SELECT 1 FROM public.tbl_roles WHERE lower(nombre) = lower(v_nombre) AND id_rol IS DISTINCT FROM v_id) THEN
    RAISE EXCEPTION 'ROL_DUPLICADO: Ya existe un rol llamado %', v_nombre;
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.tbl_roles (nombre, descripcion, estado, usuario_creacion, fecha_creacion)
    VALUES (v_nombre, p_descripcion, COALESCE(p_estado, true), p_usuario, now())
    RETURNING id_rol INTO v_id;
  ELSE
    UPDATE public.tbl_roles
    SET nombre = v_nombre, descripcion = p_descripcion, estado = COALESCE(p_estado, estado),
        usuario_actualizacion = p_usuario, fecha_actualizacion = now()
    WHERE id_rol = v_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ROL_NO_ENCONTRADO: El rol % no existe', v_id;
    END IF;
  END IF;

  DELETE FROM public.tbl_rol_permiso WHERE id_rol = v_id;
  INSERT INTO public.tbl_rol_permiso (id_rol, id_permiso, usuario_creacion)
  SELECT v_id, p.id_permiso, p_usuario
  FROM public.tbl_permisos p
  WHERE p.codigo = ANY (COALESCE(p_permisos, ARRAY[]::text[]));

  IF v_administradores > 0 AND public.fn_usuarios_con_permiso('usuarios.permisos') = 0 THEN
    RAISE EXCEPTION 'SIN_ADMINISTRADOR: Debe quedar al menos un usuario activo con la pestaña "Permisos de Roles"';
  END IF;

  OPEN ref FOR SELECT v_id AS id_rol;
END;
$$;
