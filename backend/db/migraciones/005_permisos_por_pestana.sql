-- Permisos por pestaña. Cada pestaña de un módulo es un permiso y los roles pasan a ser grupos de permisos:
-- un usuario puede usar una pestaña si alguno de sus roles activos tiene ese permiso. El backend valida cada
-- ruta contra estos permisos (src/config/permisos.js); los códigos de aquí y de ese archivo deben coincidir.
-- Cada rol existente recibe todas las pestañas de su módulo, así que nadie pierde acceso con esta migración.

CREATE TABLE IF NOT EXISTS public.tbl_permisos (
  id_permiso bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  codigo text NOT NULL UNIQUE,
  modulo text NOT NULL,
  pestana text NOT NULL,
  descripcion text,
  orden integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.tbl_rol_permiso (
  id_rol bigint NOT NULL REFERENCES public.tbl_roles (id_rol) ON DELETE CASCADE,
  id_permiso bigint NOT NULL REFERENCES public.tbl_permisos (id_permiso) ON DELETE CASCADE,
  usuario_creacion text,
  fecha_creacion timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_rol, id_permiso)
);

INSERT INTO public.tbl_permisos (codigo, modulo, pestana, descripcion, orden) VALUES
  ('consulta.pacientes',          'Consulta de Pacientes',  'Consulta de Pacientes',   'Ficha completa del paciente, reporte PDF y carné', 10),
  ('pacientes.registro',          'Gestión de Pacientes',   'Registro',                'Registrar pacientes nuevos', 20),
  ('pacientes.reingreso',         'Gestión de Pacientes',   'Reingreso',               'Reingresar pacientes egresados', 21),
  ('pacientes.egreso',            'Gestión de Pacientes',   'Egreso',                  'Egresar pacientes', 22),
  ('pacientes.formularios',       'Gestión de Pacientes',   'Registro de Formularios', 'Registrar formularios y sesiones autorizadas', 23),
  ('pacientes.actualizacion',     'Gestión de Pacientes',   'Actualizar Paciente',     'Editar datos y foto del paciente', 24),
  ('turnos.llamado',              'Turnos',                 'Llamado',                 'Llamar, finalizar y abandonar turnos', 30),
  ('turnos.asignacion',           'Turnos',                 'Asignación',              'Asignar turnos y registrar faltistas', 31),
  ('turnos.crear',                'Turnos',                 'Crear',                   'Crear, editar y cancelar turnos', 32),
  ('turnos.consulta',             'Turnos',                 'Consulta Turnos',         'Consultar turnos', 33),
  ('nutricion.registro',          'Nutrición',              'Registro',                'Registrar informes de nutrición', 40),
  ('nutricion.consulta',          'Nutrición',              'Consulta',                'Consultar informes de nutrición', 41),
  ('psicologia.registro',         'Psicología',             'Registro',                'Registrar evaluaciones psicológicas', 50),
  ('psicologia.consulta',         'Psicología',             'Consulta',                'Consultar evaluaciones psicológicas', 51),
  ('laboratorios.registro',       'Laboratorios',           'Registro de Laboratorio', 'Registrar resultados de laboratorio', 60),
  ('laboratorios.consulta',       'Laboratorios',           'Consulta de Laboratorio', 'Consultar resultados de laboratorio', 61),
  ('referencias.registro',        'Referencias',            'Registro de Referencias', 'Registrar referencias', 70),
  ('referencias.consulta',        'Referencias',            'Consulta de Referencias', 'Consultar referencias', 71),
  ('reportes.pacientes',          'Reportes',               'Reporte de Pacientes',    'Reporte de pacientes', 80),
  ('reportes.nuevo_ingreso',      'Reportes',               'Nuevo Ingreso',           'Reporte de nuevos ingresos', 81),
  ('reportes.egreso',             'Reportes',               'Egreso',                  'Reporte de egresos', 82),
  ('reportes.fallecidos',         'Reportes',               'Fallecidos',              'Reporte de fallecidos', 83),
  ('estadisticas.pacientes',      'Estadísticas',           'Pacientes',               'Panel de pacientes', 90),
  ('estadisticas.nutricion',      'Estadísticas',           'Nutrición',               'Panel de nutrición', 91),
  ('estadisticas.psicologia',     'Estadísticas',           'Psicología',              'Panel de psicología', 92),
  ('usuarios.registro_empleados', 'Gestión de Usuarios',    'Registrar Empleados',     'Registrar empleados', 100),
  ('usuarios.creacion',           'Gestión de Usuarios',    'Creación Usuarios',       'Crear usuarios para empleados', 101),
  ('usuarios.empleados',          'Gestión de Usuarios',    'Gestión de Empleados',    'Editar, activar y desactivar empleados', 102),
  ('usuarios.roles',              'Gestión de Usuarios',    'Roles',                   'Asignar roles, activar usuarios y enviar enlaces de contraseña', 103)
ON CONFLICT (codigo) DO NOTHING;

-- Cada rol existente recibe todas las pestañas de su módulo
INSERT INTO public.tbl_rol_permiso (id_rol, id_permiso, usuario_creacion)
SELECT r.id_rol, p.id_permiso, 'migracion_005'
FROM (VALUES
  ('RolConsulta', 'consulta.'),
  ('RolGestionPaciente', 'pacientes.'),
  ('RolTurnos', 'turnos.'),
  ('RolNutricion', 'nutricion.'),
  ('RolPsicologia', 'psicologia.'),
  ('RolLaboratorio', 'laboratorios.'),
  ('RolReferencia', 'referencias.'),
  ('RolReportes', 'reportes.'),
  ('RolEstadistica', 'estadisticas.'),
  ('RolGestionUsuarios', 'usuarios.')
) AS m (rol, prefijo)
JOIN public.tbl_roles r ON r.nombre = m.rol
JOIN public.tbl_permisos p ON p.codigo LIKE m.prefijo || '%'
ON CONFLICT DO NOTHING;

-- Acceso vigente de un usuario: si sigue activo (usuario y empleado) y los permisos de sus roles activos.
-- Lo consulta el backend en cada petición (con un caché corto), así que un cambio de roles o una baja
-- se aplican sin esperar a que venza la sesión.
CREATE OR REPLACE PROCEDURE public.sp_acceso_usuario(
  IN p_id_usuario bigint, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT (u.estado IS TRUE AND e.estado IS TRUE) AS activo,
           COALESCE(
             (SELECT array_agg(DISTINCT p.codigo ORDER BY p.codigo)
              FROM public.tbl_usuario_rol ur
              JOIN public.tbl_roles r ON r.id_rol = ur.id_rol AND r.estado = true
              JOIN public.tbl_rol_permiso rp ON rp.id_rol = r.id_rol
              JOIN public.tbl_permisos p ON p.id_permiso = rp.id_permiso
              WHERE ur.id_usuario = u.id_usuario),
             ARRAY[]::text[]
           ) AS permisos
    FROM public.tbl_usuarios u
    LEFT JOIN public.tbl_empleados e ON e.id_empleado = u.id_empleado
    WHERE u.id_usuario = p_id_usuario;
END;
$$;

-- Foto pública de la pantalla de turnos: solo la del paciente que está en atención (lo que la TV ya muestra)
CREATE OR REPLACE FUNCTION public.fn_paciente_en_atencion(p_no_afiliacion text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tbl_turnos t
    WHERE t.no_afiliacion = p_no_afiliacion AND t.id_estado_turno = 4
  );
$$;
