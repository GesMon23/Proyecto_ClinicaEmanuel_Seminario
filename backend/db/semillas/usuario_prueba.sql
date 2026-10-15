-- Usuario de prueba para poder iniciar sesion contra el esquema reconstruido.
-- Reutiliza el hash bcrypt que ya se genero antes para 'gemonzov'.

INSERT INTO public.tbl_empleados (
  dpi, primer_nombre, primer_apellido, sexo, fecha_ingreso, estado
) VALUES (
  '1234567890101', 'Admin', 'Prueba', 'Masculino', CURRENT_DATE, true
)
ON CONFLICT (dpi) DO NOTHING;

INSERT INTO public.tbl_usuarios (
  nombre_usuario, contrasenia, id_empleado, estado
) VALUES (
  'gemonzov',
  '$2b$10$/iUPdbhw5ctnTNr.Un1tIu5pBwi/7/ky0iwix38TTLGl9FjF7HmpS',
  (SELECT id_empleado FROM public.tbl_empleados WHERE dpi = '1234567890101'),
  true
)
ON CONFLICT (nombre_usuario) DO NOTHING;

-- Le asigna TODOS los roles existentes (acceso total, solo para pruebas locales).
INSERT INTO public.tbl_usuario_rol (id_usuario, id_rol)
SELECT
  (SELECT id_usuario FROM public.tbl_usuarios WHERE nombre_usuario = 'gemonzov'),
  id_rol
FROM public.tbl_roles
ON CONFLICT DO NOTHING;
