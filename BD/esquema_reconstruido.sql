-- ============================================================================
-- ESQUEMA RECONSTRUIDO - Clinica Emanuel (seminarioclinic)
-- ============================================================================
-- CONTEXTO: el servidor de PostgreSQL original de este proyecto ya no existe.
-- Este script se reconstruyo SIN acceso a la base de datos real, unicamente
-- a partir de:
--   1) Los archivos sueltos en BD/ (esquemas parciales de una etapa temprana
--      del proyecto, ~20 procedures, muchos ya obsoletos).
--   2) El codigo del backend (backend/src/controllers/*.js, backend/BackLogin.js),
--      que revela el NOMBRE, PARAMETROS y CURSORES de cada procedure/funcion
--      que la aplicacion invoca (mas de 100 objetos), pero NO su logica SQL
--      interna original.
--
-- NIVEL DE CONFIANZA por objeto (marcado en cada seccion):
--   [REAL]      Definido con evidencia directa y clara del codigo que lo llama.
--                Deberia funcionar, pero no fue probado contra Postgres real.
--   [INFERIDO]  Reconstruido con logica de negocio razonable a partir de
--                columnas/parametros observados, con supuestos documentados.
--   [PENDIENTE] Stub con la firma correcta (para que la app no truene por
--                "procedure does not exist"), pero la logica de negocio real
--                (agregaciones/reportes complejos) se PERDIO y no se inventa.
--                Busca el comentario "TODO(reconstruido)" para completarlos.
--
-- Ejecutar en una base nueva y vacia:
--   createdb -h localhost -U postgres seminarioclinic
--   psql -h localhost -U postgres -d seminarioclinic -f BD/esquema_reconstruido.sql
-- ============================================================================

-- ============================================================================
-- SECCION 1: TABLAS
-- ============================================================================
-- Base: BD/db_clinica.sql (version mas limpia de las dos que habia), mas
-- columnas adicionales confirmadas por el codigo del backend (ver comentarios
-- "-- [nuevo]" en cada tabla).

CREATE TABLE IF NOT EXISTS public.tbl_departamento (
  id_departamento char(2) PRIMARY KEY,
  nombre text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

CREATE TABLE IF NOT EXISTS public.tbl_estados_paciente (
  id_estado bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  descripcion text UNIQUE,
  estado boolean,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

CREATE TABLE IF NOT EXISTS public.tbl_acceso_vascular (
  id_acceso bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  descripcion text,
  estado boolean,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

CREATE TABLE IF NOT EXISTS public.tbl_causa_egreso (
  id_causa bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  descripcion text UNIQUE,
  estado boolean,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

CREATE TABLE IF NOT EXISTS public.tbl_clinica (
  id_clinica bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  descripcion text,
  estado boolean,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

CREATE TABLE IF NOT EXISTS public.tbl_jornadas (
  id_jornada bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  descripcion text,
  estado boolean,
  dias text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

CREATE TABLE IF NOT EXISTS public.tbl_medicos (
  id_medico bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre_medico text,
  estado boolean,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

-- id_estado_turno confirmados por comentarios en el codigo del backend
-- (BackGestionTurno.js): 1=Asignado, 4=Llamado, 7=Faltante. 5=Finalizado y
-- 8=Abandonado son SUPUESTOS [INFERIDO] (no hay evidencia directa de esos 2).
CREATE TABLE IF NOT EXISTS public.tbl_estados_turno (
  id_estado_turno bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  descripcion text UNIQUE,
  estado boolean,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

CREATE TABLE IF NOT EXISTS public.tbl_periodicidadlaboratorio (
  idperlaboratorio bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  descripcion text,
  estado boolean,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

CREATE TABLE IF NOT EXISTS public.tbl_empleados (
  id_empleado bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  dpi char(13) UNIQUE NOT NULL,
  primer_nombre text,
  segundo_nombre text,
  otros_nombres text,
  primer_apellido text,
  segundo_apellido text,
  apellido_casada text,
  fecha_nacimiento date,
  sexo text,
  direccion text,
  telefono text,
  email text,
  fecha_ingreso date,
  fecha_registro timestamp DEFAULT CURRENT_TIMESTAMP,
  estado boolean DEFAULT true,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

CREATE TABLE IF NOT EXISTS public.tbl_roles (
  id_rol bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre text NOT NULL UNIQUE,
  descripcion text,
  estado boolean DEFAULT true,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

-- [nuevo] no hay columnas nuevas confirmadas en tbl_pacientes salvo
-- inicio_prest_servicios/fin_prest_servicios (confirmadas por el INSERT
-- directo en BackConsultaPacientes.js /pacientes/mock-nuevo-ingreso).
CREATE TABLE IF NOT EXISTS public.tbl_pacientes (
  no_afiliacion text PRIMARY KEY,
  dpi char(13),
  no_paciente_proveedor text,
  primer_nombre text,
  segundo_nombre text,
  otros_nombres text,
  primer_apellido text,
  segundo_apellido text,
  apellido_casada text,
  edad integer,
  fecha_nacimiento date,
  sexo text,
  direccion text,
  fecha_ingreso date,
  id_departamento char(2) REFERENCES public.tbl_departamento (id_departamento),
  id_estado bigint REFERENCES public.tbl_estados_paciente (id_estado),
  id_acceso bigint REFERENCES public.tbl_acceso_vascular (id_acceso),
  numero_formulario_activo text,
  id_jornada bigint REFERENCES public.tbl_jornadas (id_jornada),
  sesiones_autorizadas_mes integer,
  inicio_prest_servicios date, -- [nuevo]
  fin_prest_servicios date,    -- [nuevo]
  fecha_registro timestamp,
  url_foto text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

CREATE TABLE IF NOT EXISTS public.tbl_laboratorios (
  idlaboratorio bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  no_afiliacion text NOT NULL,
  idperlaboratorio bigint NOT NULL,
  fecha_laboratorio date NOT NULL,
  infeccion_acceso text,
  complicacion_acceso text,
  observacion text,
  examen_realizado boolean,
  causa_no_realizado text,
  virologia text,
  antigeno_hepatitis_c boolean,
  antigeno_superficie boolean,
  hiv text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp,
  fecha_registro timestamp WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tbl_laboratorios_idperlaboratorio_fkey
    FOREIGN KEY (idperlaboratorio) REFERENCES public.tbl_periodicidadlaboratorio (idperlaboratorio)
      ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT tbl_laboratorios_noafiliacion_fkey
    FOREIGN KEY (no_afiliacion) REFERENCES public.tbl_pacientes (no_afiliacion)
      ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.tbl_parametros_laboratorio (
  idparametro bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  idlaboratorio bigint NOT NULL,
  parametro text NOT NULL,
  valor text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp,
  CONSTRAINT tbl_parametros_laboratorio_idlaboratorio_fkey
    FOREIGN KEY (idlaboratorio) REFERENCES public.tbl_laboratorios (idlaboratorio)
      ON UPDATE NO ACTION ON DELETE CASCADE
);

-- [nuevo] inicio_prest_servicios/fin_prest_servicios confirmados como
-- parametros de sp_historial_formulario_crear.
CREATE TABLE IF NOT EXISTS public.tbl_historial_formularios (
  no_afiliacion text REFERENCES public.tbl_pacientes (no_afiliacion),
  numero_formulario text,
  sesiones_autorizadas_mes integer,
  sesiones_realizadas_mes integer,
  sesiones_no_realizadas_mes integer,
  inicio_prest_servicios date, -- [nuevo]
  fin_prest_servicios date,    -- [nuevo]
  observaciones text,          -- [nuevo]
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp,
  PRIMARY KEY (no_afiliacion, numero_formulario)
);

CREATE TABLE IF NOT EXISTS public.tbl_egresos (
  no_afiliacion text REFERENCES public.tbl_pacientes (no_afiliacion),
  id_causa_egreso bigint REFERENCES public.tbl_causa_egreso (id_causa),
  descripcion text,
  fecha_egreso date,
  observaciones text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp,
  PRIMARY KEY (no_afiliacion, id_causa_egreso)
);

CREATE TABLE IF NOT EXISTS public.tbl_fallecimientos (
  no_afiliacion text REFERENCES public.tbl_pacientes (no_afiliacion),
  comorbilidades text,
  fechafallecido timestamp,
  lugarfallecimiento text,
  causafallecimiento text,
  observaciones text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp,
  PRIMARY KEY (no_afiliacion)
);

CREATE TABLE IF NOT EXISTS public.tbl_casos_concluidos (
  no_afiliacion text REFERENCES public.tbl_pacientes (no_afiliacion),
  no_caso_concluido text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp,
  PRIMARY KEY (no_afiliacion, no_caso_concluido)
);

-- [nuevo] sesiones_autorizadas_mes/inicio_prest_servicios/fin_prest_servicios
-- confirmados como parametros de sp_paciente_reingreso_insertar.
CREATE TABLE IF NOT EXISTS public.tbl_reingresos (
  no_afiliacion text REFERENCES public.tbl_pacientes (no_afiliacion),
  numero_formulario text,
  sesiones_autorizadas_mes integer, -- [nuevo]
  inicio_prest_servicios date,      -- [nuevo]
  fin_prest_servicios date,         -- [nuevo]
  fecha_reingreso date,
  observaciones text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp,
  PRIMARY KEY (no_afiliacion, numero_formulario)
);

CREATE TABLE IF NOT EXISTS public.tbl_faltistas (
  no_afiliacion text REFERENCES public.tbl_pacientes (no_afiliacion),
  id_clinica bigint REFERENCES public.tbl_clinica (id_clinica),
  fecha_falta date,
  motivo_falta text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp,
  PRIMARY KEY (no_afiliacion, id_clinica, fecha_falta)
);

-- [nuevo] id_medico/especialidad_referencia confirmados por sp_registrar_referencia
-- y sp_consultar_referencias_filtrado (filtro por idmedico).
CREATE TABLE IF NOT EXISTS public.tbl_referencias (
  id_referencia text PRIMARY KEY,
  no_afiliacion text REFERENCES public.tbl_pacientes (no_afiliacion),
  id_medico bigint REFERENCES public.tbl_medicos (id_medico), -- [nuevo]
  fecha_referencia date,
  motivo_traslado text,
  especialidad_referencia text, -- [nuevo]
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

CREATE TABLE IF NOT EXISTS public.tbl_turnos (
  id_turno text PRIMARY KEY,
  no_afiliacion text REFERENCES public.tbl_pacientes (no_afiliacion),
  id_clinica bigint REFERENCES public.tbl_clinica (id_clinica),
  id_estado_turno bigint REFERENCES public.tbl_estados_turno (id_estado_turno),
  fecha_asignacion date,
  fecha_finalizacion date,
  fecha_turno date,
  id_usuario_asignado bigint,
  id_usuario_llamado bigint,
  id_usuario_finalizado bigint,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

-- [nuevo] tipo_atencion, pronostico_paciente, aplicacion_kdqol y los 5
-- puntajes KDQOL confirmados por sp_guardar_evaluacion_psicologia.
CREATE TABLE IF NOT EXISTS public.tbl_informes_psicologia (
  id_informe text PRIMARY KEY,
  no_afiliacion text REFERENCES public.tbl_pacientes (no_afiliacion),
  motivo_consulta text,
  tipo_consulta text,
  tipo_atencion text,        -- [nuevo]
  pronostico_paciente text,  -- [nuevo]
  aplicacion_kdqol boolean,  -- [nuevo]
  fisico_mental integer,     -- [nuevo]
  enfermedad_renal integer,  -- [nuevo]
  sintomas_problemas integer,-- [nuevo]
  efectos_enfermedad integer,-- [nuevo]
  vida_diaria integer,       -- [nuevo]
  observaciones text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

-- [nuevo] altura_cm/peso_kg/imc confirmados por sp_guardar_informe_nutricion.
CREATE TABLE IF NOT EXISTS public.tbl_informe_nutricion (
  id_informe text PRIMARY KEY,
  no_afiliacion text REFERENCES public.tbl_pacientes (no_afiliacion),
  motivo_consulta text,
  estado_nutricional text,
  altura_cm numeric(5,2), -- [nuevo]
  peso_kg numeric(5,2),   -- [nuevo]
  imc numeric(5,2),       -- [nuevo]
  observaciones text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

CREATE TABLE IF NOT EXISTS public.tbl_EmpleadosClinicas (
  id_empleado bigint REFERENCES public.tbl_empleados (id_empleado),
  id_clinica bigint REFERENCES public.tbl_clinica (id_clinica),
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp,
  PRIMARY KEY (id_empleado, id_clinica)
);

-- usuario_actualizacion en esta tabla es reutilizada por el backend como
-- bandera de negocio literal 'FORCE_CHANGE_PASSWORD' (ver sp_usuario_flag_force_change_*
-- mas abajo) ademas de su uso normal de auditoria. Se deja como text, sin cambios.
CREATE TABLE IF NOT EXISTS public.tbl_usuarios (
  id_usuario bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre_usuario text UNIQUE NOT NULL,
  contrasenia text NOT NULL,
  id_empleado bigint REFERENCES public.tbl_empleados (id_empleado),
  estado boolean DEFAULT true,
  fecha_registro timestamp DEFAULT CURRENT_TIMESTAMP,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

CREATE TABLE IF NOT EXISTS public.tbl_usuario_rol (
  id_usuario bigint REFERENCES public.tbl_usuarios (id_usuario),
  id_rol bigint REFERENCES public.tbl_roles (id_rol),
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp,
  PRIMARY KEY (id_usuario, id_rol)
);

-- ============================================================================
-- SECCION 2: DATOS SEMILLA (catalogos minimos para que la app no arranque vacia)
-- ============================================================================

INSERT INTO public.tbl_roles (nombre, descripcion, estado) VALUES
  ('RolTurnos','Manejo de los turnos de los pacientes', true),
  ('RolConsulta','Visualizar informacion del paciente', true),
  ('RolGestionPaciente','Manejar la gestion administrativa del paciente', true),
  ('RolReferencia','Registrar y consultar referencias a clinicas del IGSS', true),
  ('RolNutricion','Registro de informacion de nutricion de paciente', true),
  ('RolPsicologia','Registro de informacion de psicologia de paciente', true),
  ('RolLaboratorio','Registro y consulta de informacion de laboratorios de pacientes', true),
  ('RolReportes','Generacion de reportes de la gestion e informacion clinica del paciente', true),
  ('RolEstadistica','Visualizar estadisticas y dashboards', true),
  ('RolGestionUsuarios','Gestion de usuarios y roles', true)
ON CONFLICT (nombre) DO NOTHING;

-- id_estado_turno: 1 y 4 y 7 confirmados por comentarios del backend.
INSERT INTO public.tbl_estados_turno (descripcion, estado) VALUES
  ('Asignado', true),   -- id 1 [REAL]
  ('En espera', true),  -- id 2
  ('En atencion', true),-- id 3
  ('Llamado', true),    -- id 4 [REAL]
  ('Finalizado', true), -- id 5 [INFERIDO]
  ('Cancelado', true),  -- id 6
  ('Faltante', true),   -- id 7 [REAL]
  ('Abandonado', true)  -- id 8 [INFERIDO]
ON CONFLICT (descripcion) DO NOTHING;

-- id_estado (tbl_estados_paciente): 1=Activo y 3=Egresado confirmados por
-- comentarios/logica del backend (id_estado=3 se compara literalmente con
-- "Egresado" en varios controladores).
INSERT INTO public.tbl_estados_paciente (descripcion, estado) VALUES
  ('Activo', true),      -- id 1 [REAL]
  ('Nuevo ingreso', true), -- id 2 [INFERIDO]
  ('Egresado', true),    -- id 3 [REAL]
  ('Reingreso', true)    -- id 4 [INFERIDO]
ON CONFLICT (descripcion) DO NOTHING;

-- id_causa (tbl_causa_egreso): 1=Fallecido confirmado por comparacion literal
-- en el backend (idCausa === 1 -> "Fallecido").
INSERT INTO public.tbl_causa_egreso (descripcion, estado) VALUES
  ('Fallecido', true),      -- id 1 [REAL]
  ('Alta medica', true),
  ('Traslado', true),
  ('Abandono de tratamiento', true)
ON CONFLICT (descripcion) DO NOTHING;

-- ============================================================================
-- SECCION 3: FUNCIONES ESCALARES (fn_*)
-- ============================================================================

-- [REAL] Resuelve el "nombre visible" del actor autenticado para columnas de
-- auditoria. Usada por Referencias, Nutricion y Psicologia.
CREATE OR REPLACE FUNCTION public.fn_resolver_actor(
  nombre_usuario_jwt text,
  id_usuario_jwt bigint
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  resultado text;
BEGIN
  IF nombre_usuario_jwt IS NOT NULL AND length(trim(nombre_usuario_jwt)) > 0 THEN
    RETURN nombre_usuario_jwt;
  END IF;

  IF id_usuario_jwt IS NOT NULL THEN
    SELECT nombre_usuario INTO resultado FROM public.tbl_usuarios WHERE id_usuario = id_usuario_jwt;
    IF resultado IS NOT NULL THEN
      RETURN resultado;
    END IF;
  END IF;

  RETURN 'sistema';
END;
$$;

-- ============================================================================
-- SECCION 4: CATALOGOS (todos [REAL] - lecturas simples de una tabla)
-- ============================================================================

CREATE OR REPLACE PROCEDURE public.sp_mostrar_medicos(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT id_medico AS idmedico, nombre_medico AS nombrecompleto
    FROM public.tbl_medicos WHERE estado = true ORDER BY nombre_medico ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_catalogo_departamentos(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT id_departamento, nombre FROM public.tbl_departamento ORDER BY nombre ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_departamentos_lista(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT id_departamento, nombre FROM public.tbl_departamento ORDER BY nombre ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_catalogo_estados_paciente(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT id_estado, descripcion FROM public.tbl_estados_paciente
    WHERE estado = true ORDER BY descripcion ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_pacientes_catalogo_estados(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT descripcion FROM public.tbl_estados_paciente
    WHERE estado = true ORDER BY descripcion ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_catalogo_accesos_vascular(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT id_acceso, descripcion FROM public.tbl_acceso_vascular
    WHERE estado = true ORDER BY descripcion ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_accesos_vasculares_activos(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT id_acceso, descripcion FROM public.tbl_acceso_vascular
    WHERE estado = true ORDER BY descripcion ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_catalogo_jornadas(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT id_jornada, descripcion, dias FROM public.tbl_jornadas
    WHERE estado = true ORDER BY descripcion ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_jornadas_activas(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT id_jornada, descripcion, dias FROM public.tbl_jornadas
    WHERE estado = true ORDER BY descripcion ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_causas_egreso_activas(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT id_causa, descripcion FROM public.tbl_causa_egreso
    WHERE estado = true ORDER BY descripcion ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_egreso_catalogo_causas(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT descripcion FROM public.tbl_causa_egreso
    WHERE estado = true ORDER BY descripcion ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_laboratorios_catalogo_periodicidades(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT descripcion FROM public.tbl_periodicidadlaboratorio
    WHERE estado = true ORDER BY descripcion ASC;
END;
$$;

-- [INFERIDO] No hay tabla de catalogo de sexos; se devuelven los 2 valores
-- literales que usa el resto del sistema.
CREATE OR REPLACE PROCEDURE public.sp_laboratorios_catalogo_sexos(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT unnest(ARRAY['Masculino','Femenino']) AS sexo;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_nuevo_ingreso_catalogo_jornadas(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT descripcion FROM public.tbl_jornadas WHERE estado = true ORDER BY descripcion ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_nuevo_ingreso_catalogo_accesos(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT descripcion FROM public.tbl_acceso_vascular WHERE estado = true ORDER BY descripcion ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_nuevo_ingreso_catalogo_departamentos(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT nombre FROM public.tbl_departamento ORDER BY nombre ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_nuevo_ingreso_catalogo_sexos(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT unnest(ARRAY['Masculino','Femenino']) AS sexo;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_faltistas_catalogo_clinicas(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT descripcion FROM public.tbl_clinica WHERE estado = true ORDER BY descripcion ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_mostrar_estados_turno(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT * FROM public.tbl_estados_turno ORDER BY id_estado_turno ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_mostrar_jornadas_turnos(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT * FROM public.tbl_jornadas WHERE estado = true ORDER BY descripcion ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_mostrar_clinicas(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT * FROM public.tbl_clinica WHERE estado = true ORDER BY descripcion ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_roles_activos(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT id_rol, nombre, descripcion FROM public.tbl_roles
    WHERE estado = true ORDER BY nombre ASC;
END;
$$;

-- ============================================================================
-- SECCION 5: AUTENTICACION Y USUARIOS (BackLogin.js, BackCreacionUsuarios.js,
-- BackRolesUsuarios.js) - todos [REAL], firmas confirmadas por el codigo.
-- ============================================================================

CREATE OR REPLACE PROCEDURE public.sp_actualizar_password_usuario(
  IN p_id_usuario bigint, IN p_hash text
) LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.tbl_usuarios SET contrasenia = p_hash, fecha_actualizacion = now()
  WHERE id_usuario = p_id_usuario;
END;
$$;

-- Reutiliza usuario_actualizacion como bandera de negocio (ver nota en la tabla).
CREATE OR REPLACE PROCEDURE public.sp_usuario_flag_force_change_set(
  IN p_id_usuario bigint, IN p_flag boolean
) LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.tbl_usuarios
  SET usuario_actualizacion = CASE WHEN p_flag THEN 'FORCE_CHANGE_PASSWORD' ELSE NULL END,
      fecha_actualizacion = now()
  WHERE id_usuario = p_id_usuario;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_usuario_flag_force_change_get(
  IN p_id_usuario bigint, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT usuario_actualizacion FROM public.tbl_usuarios WHERE id_usuario = p_id_usuario;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_usuario_email_by_id(
  IN p_id_usuario bigint, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT e.email
    FROM public.tbl_usuarios u JOIN public.tbl_empleados e ON u.id_empleado = e.id_empleado
    WHERE u.id_usuario = p_id_usuario;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_usuario_autenticado(
  IN p_id_usuario bigint, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT id_usuario, nombre_usuario, estado, contrasenia
    FROM public.tbl_usuarios WHERE id_usuario = p_id_usuario;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_confirmar_pasword_usuario(
  IN p_id_usuario bigint, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT id_usuario, nombre_usuario, estado, contrasenia
    FROM public.tbl_usuarios WHERE id_usuario = p_id_usuario;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_buscar_usuario_auth(
  IN p_nombre_usuario text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT id_usuario, nombre_usuario, estado, contrasenia
    FROM public.tbl_usuarios WHERE lower(nombre_usuario) = lower(p_nombre_usuario);
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_buscar_usuario_por_nombre(
  IN p_nombre_usuario text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT u.id_usuario, u.nombre_usuario, u.estado, u.id_empleado,
           e.primer_nombre, e.primer_apellido
    FROM public.tbl_usuarios u
    LEFT JOIN public.tbl_empleados e ON u.id_empleado = e.id_empleado
    WHERE lower(u.nombre_usuario) = lower(p_nombre_usuario);
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_usuarios_activos(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT u.id_usuario, u.nombre_usuario, e.primer_nombre, e.primer_apellido
    FROM public.tbl_usuarios u
    LEFT JOIN public.tbl_empleados e ON u.id_empleado = e.id_empleado
    WHERE u.estado = true
    ORDER BY u.nombre_usuario ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_usuario_empleado_estado_get(
  IN p_id_usuario bigint, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT e.estado AS empleado_activo
    FROM public.tbl_usuarios u JOIN public.tbl_empleados e ON u.id_empleado = e.id_empleado
    WHERE u.id_usuario = p_id_usuario;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_roles_usuario(
  IN p_id_usuario bigint, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT r.nombre
    FROM public.tbl_usuario_rol ur JOIN public.tbl_roles r ON ur.id_rol = r.id_rol
    WHERE ur.id_usuario = p_id_usuario AND r.estado = true;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_roles_usuario_detalle(
  IN p_id_usuario bigint, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT r.id_rol, r.nombre, r.descripcion, (ur.id_usuario IS NOT NULL) AS asignado
    FROM public.tbl_roles r
    LEFT JOIN public.tbl_usuario_rol ur ON ur.id_rol = r.id_rol AND ur.id_usuario = p_id_usuario
    WHERE r.estado = true
    ORDER BY r.nombre ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_actualizar_roles_usuario(
  IN p_id_usuario bigint, IN p_roles bigint[], IN p_usuario_creacion text
) LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.tbl_usuario_rol WHERE id_usuario = p_id_usuario;
  INSERT INTO public.tbl_usuario_rol (id_usuario, id_rol, usuario_creacion, fecha_creacion)
    SELECT p_id_usuario, unnest(p_roles), p_usuario_creacion, now();
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_actualizar_estado_usuario(
  IN p_id_usuario bigint, IN p_estado boolean
) LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.tbl_usuarios SET estado = p_estado, fecha_actualizacion = now()
  WHERE id_usuario = p_id_usuario;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_empleados_sin_usuario(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT e.* FROM public.tbl_empleados e
    WHERE e.estado = true
      AND NOT EXISTS (SELECT 1 FROM public.tbl_usuarios u WHERE u.id_empleado = e.id_empleado);
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_usuario_existe(
  IN p_nombre_usuario text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT EXISTS(SELECT 1 FROM public.tbl_usuarios WHERE lower(nombre_usuario) = lower(p_nombre_usuario)) AS existe;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_crear_usuario_con_roles(
  IN p_usuario text, IN p_id_empleado bigint, IN p_hash text,
  IN p_roles bigint[], IN p_usuario_creacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
DECLARE
  v_id_usuario bigint;
BEGIN
  INSERT INTO public.tbl_usuarios (nombre_usuario, contrasenia, id_empleado, estado, usuario_creacion, fecha_creacion)
  VALUES (p_usuario, p_hash, p_id_empleado, true, p_usuario_creacion, now())
  RETURNING id_usuario INTO v_id_usuario;

  INSERT INTO public.tbl_usuario_rol (id_usuario, id_rol, usuario_creacion, fecha_creacion)
    SELECT v_id_usuario, unnest(p_roles), p_usuario_creacion, now();

  OPEN ref FOR SELECT v_id_usuario AS id_usuario;
END;
$$;

-- ============================================================================
-- SECCION 6: EMPLEADOS (BackGestionEmpleados.js, BackRegistroEmpleados.js)
-- ============================================================================

CREATE OR REPLACE PROCEDURE public.sp_listar_empleados(
  IN p_q text, IN p_estado boolean, IN p_limit integer, IN p_offset integer, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT * FROM public.tbl_empleados
    WHERE (p_q IS NULL OR
           (primer_nombre || ' ' || COALESCE(primer_apellido,'') || ' ' || dpi) ILIKE '%' || p_q || '%')
      AND (p_estado IS NULL OR estado = p_estado)
    ORDER BY primer_apellido ASC, primer_nombre ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- [INFERIDO] UPDATE parcial dinamico desde JSONB. Deja propagar la violacion
-- de unicidad de dpi (23505) tal cual, como espera el backend.
CREATE OR REPLACE PROCEDURE public.sp_actualizar_empleado(
  IN p_dpi_actual text, IN p_datos jsonb, IN p_actor text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.tbl_empleados SET
    dpi = COALESCE(NULLIF(p_datos->>'dpi',''), dpi),
    primer_nombre = COALESCE(NULLIF(p_datos->>'primer_nombre',''), primer_nombre),
    segundo_nombre = COALESCE(NULLIF(p_datos->>'segundo_nombre',''), segundo_nombre),
    otros_nombres = COALESCE(NULLIF(p_datos->>'otros_nombres',''), otros_nombres),
    primer_apellido = COALESCE(NULLIF(p_datos->>'primer_apellido',''), primer_apellido),
    segundo_apellido = COALESCE(NULLIF(p_datos->>'segundo_apellido',''), segundo_apellido),
    apellido_casada = COALESCE(NULLIF(p_datos->>'apellido_casada',''), apellido_casada),
    fecha_nacimiento = COALESCE((p_datos->>'fecha_nacimiento')::date, fecha_nacimiento),
    sexo = COALESCE(NULLIF(p_datos->>'sexo',''), sexo),
    direccion = COALESCE(NULLIF(p_datos->>'direccion',''), direccion),
    telefono = COALESCE(NULLIF(p_datos->>'telefono',''), telefono),
    email = COALESCE(NULLIF(p_datos->>'email',''), email),
    fecha_ingreso = COALESCE((p_datos->>'fecha_ingreso')::date, fecha_ingreso),
    usuario_actualizacion = p_actor,
    fecha_actualizacion = now()
  WHERE dpi = p_dpi_actual;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  OPEN ref FOR SELECT (v_count > 0) AS success;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_cambiar_estado_empleado(
  IN p_dpi text, IN p_activo boolean, IN p_actor text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.tbl_empleados
  SET estado = p_activo, usuario_actualizacion = p_actor, fecha_actualizacion = now()
  WHERE dpi = p_dpi;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  OPEN ref FOR SELECT (v_count > 0) AS success;
END;
$$;

-- [INFERIDO] Upsert masivo desde un array JSON; se identifica cada elemento
-- por dpi. Estructura del JSON asumida a partir de tbl_empleados.
CREATE OR REPLACE PROCEDURE public.sp_registro_empleados(
  IN p_empleados jsonb, IN p_actor text
) LANGUAGE plpgsql AS $$
DECLARE
  r jsonb;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_empleados)
  LOOP
    UPDATE public.tbl_empleados SET
      primer_nombre = COALESCE(r->>'primer_nombre', primer_nombre),
      segundo_nombre = COALESCE(r->>'segundo_nombre', segundo_nombre),
      otros_nombres = COALESCE(r->>'otros_nombres', otros_nombres),
      primer_apellido = COALESCE(r->>'primer_apellido', primer_apellido),
      segundo_apellido = COALESCE(r->>'segundo_apellido', segundo_apellido),
      apellido_casada = COALESCE(r->>'apellido_casada', apellido_casada),
      telefono = COALESCE(r->>'telefono', telefono),
      email = COALESCE(r->>'email', email),
      usuario_actualizacion = p_actor,
      fecha_actualizacion = now()
    WHERE dpi = r->>'dpi';
  END LOOP;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_insertar_empleado(
  IN p_dpi char(13), IN p_primer_nombre text, IN p_segundo_nombre text, IN p_otros_nombres text,
  IN p_primer_apellido text, IN p_segundo_apellido text, IN p_apellido_casada text,
  IN p_fecha_nacimiento date, IN p_sexo text, IN p_direccion text, IN p_telefono text,
  IN p_email text, IN p_fecha_ingreso date, IN p_activo boolean, IN p_actor text
) LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.tbl_empleados (
    dpi, primer_nombre, segundo_nombre, otros_nombres, primer_apellido, segundo_apellido,
    apellido_casada, fecha_nacimiento, sexo, direccion, telefono, email, fecha_ingreso,
    estado, usuario_creacion, fecha_creacion
  ) VALUES (
    p_dpi, p_primer_nombre, p_segundo_nombre, p_otros_nombres, p_primer_apellido, p_segundo_apellido,
    p_apellido_casada, p_fecha_nacimiento, p_sexo, p_direccion, p_telefono, p_email, p_fecha_ingreso,
    COALESCE(p_activo, true), p_actor, now()
  );
END;
$$;

-- ============================================================================
-- SECCION 7: PACIENTES - actualizacion, consulta, registro
-- ============================================================================

-- [REAL] No incluye id_estado: este endpoint no permite cambiar el estado
-- clinico. Replica los mensajes de error EXACTOS que el backend detecta por
-- regex (BackActualizacionPacientes.js).
CREATE OR REPLACE PROCEDURE public.sp_actualizar_paciente_por_noafiliacion(
  IN p_no_afiliacion text, IN p_dpi char(13), IN p_primer_nombre text, IN p_segundo_nombre text,
  IN p_otros_nombres text, IN p_primer_apellido text, IN p_segundo_apellido text, IN p_apellido_casada text,
  IN p_edad integer, IN p_fecha_nacimiento date, IN p_sexo text, IN p_direccion text,
  IN p_fecha_ingreso date, IN p_id_departamento char(2), IN p_id_acceso bigint,
  IN p_numero_formulario_activo text, IN p_id_jornada bigint, IN p_sesiones_autorizadas_mes integer,
  IN p_url_foto text, IN p_actor text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  IF p_dpi IS NOT NULL AND p_dpi !~ '^[0-9]{13}$' THEN
    RAISE EXCEPTION 'DPI invalido: debe contener exactamente 13 digitos numericos.';
  END IF;

  IF p_dpi IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tbl_pacientes WHERE dpi = p_dpi AND no_afiliacion <> p_no_afiliacion
  ) THEN
    RAISE EXCEPTION 'El DPI % ya esta registrado para otro paciente.', p_dpi;
  END IF;

  UPDATE public.tbl_pacientes SET
    dpi = COALESCE(p_dpi, dpi),
    primer_nombre = COALESCE(p_primer_nombre, primer_nombre),
    segundo_nombre = COALESCE(p_segundo_nombre, segundo_nombre),
    otros_nombres = COALESCE(p_otros_nombres, otros_nombres),
    primer_apellido = COALESCE(p_primer_apellido, primer_apellido),
    segundo_apellido = COALESCE(p_segundo_apellido, segundo_apellido),
    apellido_casada = COALESCE(p_apellido_casada, apellido_casada),
    edad = COALESCE(p_edad, edad),
    fecha_nacimiento = COALESCE(p_fecha_nacimiento, fecha_nacimiento),
    sexo = COALESCE(p_sexo, sexo),
    direccion = COALESCE(p_direccion, direccion),
    fecha_ingreso = COALESCE(p_fecha_ingreso, fecha_ingreso),
    id_departamento = COALESCE(p_id_departamento, id_departamento),
    id_acceso = COALESCE(p_id_acceso, id_acceso),
    numero_formulario_activo = COALESCE(p_numero_formulario_activo, numero_formulario_activo),
    id_jornada = COALESCE(p_id_jornada, id_jornada),
    sesiones_autorizadas_mes = COALESCE(p_sesiones_autorizadas_mes, sesiones_autorizadas_mes),
    url_foto = COALESCE(p_url_foto, url_foto),
    usuario_actualizacion = p_actor,
    fecha_actualizacion = now()
  WHERE no_afiliacion = p_no_afiliacion;

  OPEN ref FOR SELECT * FROM public.tbl_pacientes WHERE no_afiliacion = p_no_afiliacion;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_paciente_actualizar_foto(
  IN p_no_afiliacion text, IN p_filename text, IN p_actor text
) LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.tbl_pacientes
  SET url_foto = p_filename, usuario_actualizacion = p_actor, fecha_actualizacion = now()
  WHERE no_afiliacion = p_no_afiliacion;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_paciente_para_actualizacion(
  IN p_dpi text, IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.*, d.nombre AS nombre_departamento, a.descripcion AS acceso_vascular,
           j.descripcion AS jornada
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    WHERE (p_dpi IS NOT NULL AND p.dpi = p_dpi) OR (p_no_afiliacion IS NOT NULL AND p.no_afiliacion = p_no_afiliacion);
END;
$$;

-- [REAL] Usado como guarda de negocio en Egresos/Reingresos/Laboratorios/
-- Referencias/Nutricion/Psicologia/Formularios para bloquear pacientes
-- egresados/fallecidos. id_estado=3 y id_causa=1 confirmados por el backend.
-- Tambien alimenta la pestana "Datos Personales" de ConsultaPacientes.jsx,
-- que ademas de estado_descripcion necesita departamento_nombre,
-- acceso_descripcion y jornada_descripcion (confirmado leyendo el JSX).
CREATE OR REPLACE PROCEDURE public.sp_paciente_por_afiliacion(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.*, es.descripcion AS estado_descripcion,
           d.nombre AS departamento_nombre, a.descripcion AS acceso_descripcion,
           j.descripcion AS jornada_descripcion,
           eg.id_causa_egreso AS id_causa, ce.descripcion AS causaegreso_descripcion
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_estados_paciente es ON p.id_estado = es.id_estado
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    LEFT JOIN LATERAL (
      SELECT * FROM public.tbl_egresos e WHERE e.no_afiliacion = p.no_afiliacion
      ORDER BY e.fecha_creacion DESC NULLS LAST LIMIT 1
    ) eg ON true
    LEFT JOIN public.tbl_causa_egreso ce ON eg.id_causa_egreso = ce.id_causa
    WHERE p.no_afiliacion = p_no_afiliacion;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_paciente_por_dpi(
  IN p_dpi text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.*, es.descripcion AS estado_descripcion,
           d.nombre AS departamento_nombre, a.descripcion AS acceso_descripcion,
           j.descripcion AS jornada_descripcion,
           eg.id_causa_egreso AS id_causa, ce.descripcion AS causaegreso_descripcion
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_estados_paciente es ON p.id_estado = es.id_estado
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    LEFT JOIN LATERAL (
      SELECT * FROM public.tbl_egresos e WHERE e.no_afiliacion = p.no_afiliacion
      ORDER BY e.fecha_creacion DESC NULLS LAST LIMIT 1
    ) eg ON true
    LEFT JOIN public.tbl_causa_egreso ce ON eg.id_causa_egreso = ce.id_causa
    WHERE p.dpi = p_dpi;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_resolver_no_afiliacion_por_dpi(
  IN p_dpi text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT no_afiliacion FROM public.tbl_pacientes WHERE dpi = p_dpi;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_paciente_url_foto(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT url_foto FROM public.tbl_pacientes WHERE no_afiliacion = p_no_afiliacion;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_referencias_por_afiliacion(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT r.*, m.nombre_medico
    FROM public.tbl_referencias r
    LEFT JOIN public.tbl_medicos m ON r.id_medico = m.id_medico
    WHERE r.no_afiliacion = p_no_afiliacion
    ORDER BY r.fecha_referencia DESC NULLS LAST;
END;
$$;

-- [INFERIDO] Faltaba por completo en la reconstruccion original (nunca se
-- creo) - la pestana "Historial" de ConsultaPacientes.jsx fallaba en
-- silencio (try/catch mudo en fetchHistorial). Columnas confirmadas
-- leyendo el JSX: numero_gestion, estado, no_formulario, fecha,
-- observaciones, periodo, causa_egreso, descripcion. Se arma como un UNION
-- de las 3 fuentes que representan "gestiones" del paciente (formularios,
-- egresos, reingresos); numero_gestion queda NULL porque el JSX ya tiene
-- fallback a un contador de fila.
CREATE OR REPLACE PROCEDURE public.sp_historial_paciente(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT NULL::bigint AS numero_gestion, 'Formulario'::text AS estado,
           hf.numero_formulario AS no_formulario, hf.fecha_creacion AS fecha,
           NULL::text AS observaciones,
           (COALESCE(hf.inicio_prest_servicios::text, '') || ' - ' || COALESCE(hf.fin_prest_servicios::text, '')) AS periodo,
           NULL::text AS causa_egreso, NULL::text AS descripcion
    FROM public.tbl_historial_formularios hf
    WHERE hf.no_afiliacion = p_no_afiliacion
    UNION ALL
    SELECT NULL::bigint, 'Egreso'::text, NULL::text, e.fecha_creacion,
           e.observaciones, NULL::text, ce.descripcion, e.descripcion
    FROM public.tbl_egresos e
    LEFT JOIN public.tbl_causa_egreso ce ON e.id_causa_egreso = ce.id_causa
    WHERE e.no_afiliacion = p_no_afiliacion
    UNION ALL
    SELECT NULL::bigint, 'Reingreso'::text, r.numero_formulario, r.fecha_creacion,
           r.observaciones, NULL::text, NULL::text, NULL::text
    FROM public.tbl_reingresos r
    WHERE r.no_afiliacion = p_no_afiliacion
    ORDER BY fecha DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_nutricion_por_afiliacion(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT * FROM public.tbl_informe_nutricion
    WHERE no_afiliacion = p_no_afiliacion ORDER BY fecha_creacion DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_psicologia_por_afiliacion(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT * FROM public.tbl_informes_psicologia
    WHERE no_afiliacion = p_no_afiliacion ORDER BY fecha_creacion DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_formularios_por_afiliacion(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT * FROM public.tbl_historial_formularios
    WHERE no_afiliacion = p_no_afiliacion ORDER BY fecha_creacion DESC NULLS LAST;
END;
$$;

-- [REAL] ConsultaPacientes.jsx (pestana Faltistas) lee f.clinica (nombre,
-- no id) y f.fechafalta (sin guion bajo) - confirmado leyendo el JSX.
CREATE OR REPLACE PROCEDURE public.sp_faltistas_por_afiliacion(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT ft.no_afiliacion, c.descripcion AS clinica, ft.fecha_falta AS fechafalta, ft.motivo_falta
    FROM public.tbl_faltistas ft
    LEFT JOIN public.tbl_clinica c ON ft.id_clinica = c.id_clinica
    WHERE ft.no_afiliacion = p_no_afiliacion
    ORDER BY ft.fecha_falta DESC NULLS LAST;
END;
$$;

-- [REAL] ConsultaPacientes.jsx (pestana Turnos) lee t.nombre_clinica, no
-- clinica_descripcion - confirmado leyendo el JSX.
CREATE OR REPLACE PROCEDURE public.sp_consulta_turnos_por_afiliacion(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT t.*, es.descripcion AS estado_descripcion, c.descripcion AS nombre_clinica
    FROM public.tbl_turnos t
    LEFT JOIN public.tbl_estados_turno es ON t.id_estado_turno = es.id_estado_turno
    LEFT JOIN public.tbl_clinica c ON t.id_clinica = c.id_clinica
    WHERE t.no_afiliacion = p_no_afiliacion AND t.fecha_turno = CURRENT_DATE;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_egreso_crear(
  IN p_no_afiliacion text, IN p_id_causa_egreso bigint, IN p_descripcion text,
  IN p_fecha_egreso date, IN p_observaciones text, IN p_usuario_creacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.tbl_egresos (no_afiliacion, id_causa_egreso, descripcion, fecha_egreso, observaciones, usuario_creacion, fecha_creacion)
  VALUES (p_no_afiliacion, p_id_causa_egreso, p_descripcion, p_fecha_egreso, p_observaciones, p_usuario_creacion, now());

  OPEN ref FOR SELECT * FROM public.tbl_egresos
    WHERE no_afiliacion = p_no_afiliacion AND id_causa_egreso = p_id_causa_egreso;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_historial_formulario_crear(
  IN p_no_afiliacion text, IN p_numero_formulario text, IN p_sesiones_autorizadas_mes integer,
  IN p_sesiones_realizadas_mes integer, IN p_sesiones_no_realizadas_mes integer,
  IN p_usuario_creacion text, IN p_inicio_prest_servicios date, IN p_fin_prest_servicios date,
  INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.tbl_historial_formularios (
    no_afiliacion, numero_formulario, sesiones_autorizadas_mes, sesiones_realizadas_mes,
    sesiones_no_realizadas_mes, inicio_prest_servicios, fin_prest_servicios,
    usuario_creacion, fecha_creacion
  ) VALUES (
    p_no_afiliacion, p_numero_formulario, p_sesiones_autorizadas_mes, p_sesiones_realizadas_mes,
    p_sesiones_no_realizadas_mes, p_inicio_prest_servicios, p_fin_prest_servicios,
    p_usuario_creacion, now()
  );

  OPEN ref FOR SELECT * FROM public.tbl_historial_formularios
    WHERE no_afiliacion = p_no_afiliacion AND numero_formulario = p_numero_formulario;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_reingreso_crear(
  IN p_no_afiliacion text, IN p_numero_formulario text, IN p_fecha_reingreso date,
  IN p_observaciones text, IN p_usuario_creacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.tbl_reingresos (no_afiliacion, numero_formulario, fecha_reingreso, observaciones, usuario_creacion, fecha_creacion)
  VALUES (p_no_afiliacion, p_numero_formulario, p_fecha_reingreso, p_observaciones, p_usuario_creacion, now());

  OPEN ref FOR SELECT * FROM public.tbl_reingresos
    WHERE no_afiliacion = p_no_afiliacion AND numero_formulario = p_numero_formulario;
END;
$$;

-- --- Registro de pacientes nuevos (BackRegistroPacientes.api.js) ---

CREATE OR REPLACE PROCEDURE public.sp_pacientes_existe_dpi(
  IN p_dpi text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT EXISTS(SELECT 1 FROM public.tbl_pacientes WHERE dpi = p_dpi) AS existe;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_pacientes_existe_noafiliacion(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT EXISTS(SELECT 1 FROM public.tbl_pacientes WHERE no_afiliacion = p_no_afiliacion) AS existe;
END;
$$;

-- [REAL] 26 parametros confirmados por BackRegistroPacientes.api.js. El
-- parametro 22 (usuario_creacion opcional) se ignora a favor de
-- current_setting('app.current_user') fijado por runWithUser(), y del
-- parametro 25 (userName) que es el que realmente trae el nombre de usuario.
CREATE OR REPLACE PROCEDURE public.sp_paciente_insertar(
  IN p_noaf text, IN p_dpi char(13), IN p_nopacienteproveedor text,
  IN p_primernombre text, IN p_segundonombre text, IN p_otrosnombres text,
  IN p_primerapellido text, IN p_segundoapellido text, IN p_apellidocasada text,
  IN p_edad integer, IN p_fnac date, IN p_sexo text, IN p_direccion text,
  IN p_fecha_ingreso date, IN p_id_departamento text, IN p_id_estado bigint,
  IN p_id_acceso bigint, IN p_numero_formulario text, IN p_id_jornada bigint,
  IN p_sesiones_autorizadas_mes integer, IN p_saved_file_name text,
  IN p_usuario_creacion_legacy text, IN p_inicio_periodo date, IN p_fin_periodo date,
  IN p_user_name text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.tbl_pacientes (
    no_afiliacion, dpi, no_paciente_proveedor, primer_nombre, segundo_nombre, otros_nombres,
    primer_apellido, segundo_apellido, apellido_casada, edad, fecha_nacimiento, sexo, direccion,
    fecha_ingreso, id_departamento, id_estado, id_acceso, numero_formulario_activo, id_jornada,
    sesiones_autorizadas_mes, inicio_prest_servicios, fin_prest_servicios, url_foto,
    fecha_registro, usuario_creacion, fecha_creacion
  ) VALUES (
    p_noaf, p_dpi, p_nopacienteproveedor, p_primernombre, p_segundonombre, p_otrosnombres,
    p_primerapellido, p_segundoapellido, p_apellidocasada, p_edad, p_fnac, p_sexo, p_direccion,
    p_fecha_ingreso, p_id_departamento, COALESCE(p_id_estado, 1), p_id_acceso, p_numero_formulario, p_id_jornada,
    p_sesiones_autorizadas_mes, p_inicio_periodo, p_fin_periodo, p_saved_file_name,
    now(), COALESCE(p_user_name, p_usuario_creacion_legacy, 'web'), now()
  );

  OPEN ref FOR SELECT no_afiliacion FROM public.tbl_pacientes WHERE no_afiliacion = p_noaf;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_paciente_carnet_datos(
  IN p_noaf text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT primer_nombre, segundo_nombre, otros_nombres, primer_apellido, segundo_apellido,
           apellido_casada, direccion, fecha_nacimiento, fecha_ingreso, no_afiliacion, dpi,
           sexo, url_foto AS urlfoto
    FROM public.tbl_pacientes WHERE no_afiliacion = p_noaf;
END;
$$;

-- ============================================================================
-- SECCION 8: LABORATORIOS (BackRegistroLaboratorios.js, BackConsultaLaboratorios.js)
-- ============================================================================

CREATE OR REPLACE PROCEDURE public.sp_laboratorios_por_afiliacion(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT * FROM public.tbl_laboratorios
    WHERE no_afiliacion = p_no_afiliacion ORDER BY fecha_laboratorio DESC;
END;
$$;

-- [REAL] Alias de salida SIN guion bajo (evidencia: patron `campo ?? campoAlt`
-- en el backend prioriza la forma sin guion bajo). parametros: json agregado
-- de tbl_parametros_laboratorio.
CREATE OR REPLACE PROCEDURE public.sp_laboratorios_historial_por_afiliacion(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT l.no_afiliacion AS noafiliacion,
           p.primer_nombre AS primernombre, p.segundo_nombre AS segundonombre,
           p.primer_apellido AS primerapellido, p.segundo_apellido AS segundoapellido,
           p.sexo,
           l.idlaboratorio, l.fecha_laboratorio AS fecha,
           per.descripcion AS periodicidad,
           l.examen_realizado, l.virologia, l.hiv, l.usuario_creacion,
           (SELECT jsonb_agg(jsonb_build_object('parametro', pl.parametro, 'valor', pl.valor))
              FROM public.tbl_parametros_laboratorio pl WHERE pl.idlaboratorio = l.idlaboratorio) AS parametros
    FROM public.tbl_laboratorios l
    JOIN public.tbl_pacientes p ON l.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_periodicidadlaboratorio per ON l.idperlaboratorio = per.idperlaboratorio
    WHERE l.no_afiliacion = p_no_afiliacion
    ORDER BY l.fecha_laboratorio DESC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_laboratorios_historial_filtrado(
  IN p_desde date, IN p_hasta date, IN p_noafiliacion text, IN p_idlaboratorio bigint,
  IN p_sexo text, IN p_periodicidad text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT l.no_afiliacion AS noafiliacion,
           p.primer_nombre AS primernombre, p.segundo_nombre AS segundonombre,
           p.primer_apellido AS primerapellido, p.segundo_apellido AS segundoapellido,
           p.sexo,
           l.idlaboratorio, l.fecha_laboratorio AS fecha,
           per.descripcion AS periodicidad,
           l.examen_realizado, l.virologia, l.hiv, l.usuario_creacion,
           (SELECT jsonb_agg(jsonb_build_object('parametro', pl.parametro, 'valor', pl.valor))
              FROM public.tbl_parametros_laboratorio pl WHERE pl.idlaboratorio = l.idlaboratorio) AS parametros
    FROM public.tbl_laboratorios l
    JOIN public.tbl_pacientes p ON l.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_periodicidadlaboratorio per ON l.idperlaboratorio = per.idperlaboratorio
    WHERE (p_desde IS NULL OR l.fecha_laboratorio >= p_desde)
      AND (p_hasta IS NULL OR l.fecha_laboratorio <= p_hasta)
      AND (p_noafiliacion IS NULL OR l.no_afiliacion = p_noafiliacion)
      AND (p_idlaboratorio IS NULL OR l.idlaboratorio = p_idlaboratorio)
      AND (p_sexo IS NULL OR p.sexo = p_sexo)
      AND (p_periodicidad IS NULL OR per.descripcion = p_periodicidad)
    ORDER BY l.fecha_laboratorio DESC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_laboratorios_parametros_ultimo(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT pl.* FROM public.tbl_parametros_laboratorio pl
    WHERE pl.idlaboratorio = (
      SELECT l.idlaboratorio FROM public.tbl_laboratorios l
      WHERE l.no_afiliacion = p_no_afiliacion
      ORDER BY l.fecha_laboratorio DESC LIMIT 1
    );
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_laboratorios_insertar(
  IN p_no_afiliacion text, IN p_idperlaboratorio bigint, IN p_fecha_laboratorio date,
  IN p_infeccion_acceso text, IN p_complicacion_acceso text, IN p_observacion text,
  IN p_examen_realizado boolean, IN p_causa_no_realizado text, IN p_virologia text,
  IN p_antigeno_hepatitis_c boolean, IN p_antigeno_superficie boolean, IN p_hiv text,
  IN p_fecha_registro timestamp, IN p_parametros jsonb, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
DECLARE
  v_id bigint;
  v_count integer := 0;
  r jsonb;
BEGIN
  INSERT INTO public.tbl_laboratorios (
    no_afiliacion, idperlaboratorio, fecha_laboratorio, infeccion_acceso, complicacion_acceso,
    observacion, examen_realizado, causa_no_realizado, virologia, antigeno_hepatitis_c,
    antigeno_superficie, hiv, fecha_registro
  ) VALUES (
    p_no_afiliacion, p_idperlaboratorio, p_fecha_laboratorio, p_infeccion_acceso, p_complicacion_acceso,
    p_observacion, p_examen_realizado, p_causa_no_realizado, p_virologia, p_antigeno_hepatitis_c,
    p_antigeno_superficie, p_hiv, COALESCE(p_fecha_registro, now())
  ) RETURNING idlaboratorio INTO v_id;

  IF p_parametros IS NOT NULL THEN
    FOR r IN SELECT * FROM jsonb_array_elements(p_parametros)
    LOOP
      INSERT INTO public.tbl_parametros_laboratorio (idlaboratorio, parametro, valor)
        VALUES (v_id, r->>'parametro', r->>'valor');
      v_count := v_count + 1;
    END LOOP;
  END IF;

  OPEN ref FOR SELECT v_id AS idlaboratorio, v_count AS parametros_insertados;
END;
$$;

-- ============================================================================
-- SECCION 9: REFERENCIAS (BackConsultaReferencias.js, BackRegistroReferencias.js)
-- ============================================================================

CREATE OR REPLACE PROCEDURE public.sp_consultar_referencias_filtrado(
  IN p_desde date, IN p_hasta date, IN p_idmedico bigint, IN p_noafiliacion text,
  IN p_idreferencia text, IN p_sexo text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT r.id_referencia AS idreferencia, r.no_afiliacion AS noafiliacion,
           p.primer_nombre AS primernombre, p.primer_apellido AS primerapellido, p.sexo,
           r.fecha_referencia AS fechareferencia, r.motivo_traslado AS motivotraslado,
           r.especialidad_referencia AS especialidadreferencia,
           r.id_medico AS idmedico, m.nombre_medico AS nombremedico
    FROM public.tbl_referencias r
    JOIN public.tbl_pacientes p ON r.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_medicos m ON r.id_medico = m.id_medico
    WHERE (p_desde IS NULL OR r.fecha_referencia >= p_desde)
      AND (p_hasta IS NULL OR r.fecha_referencia <= p_hasta)
      AND (p_idmedico IS NULL OR r.id_medico = p_idmedico)
      AND (p_noafiliacion IS NULL OR r.no_afiliacion = p_noafiliacion)
      AND (p_idreferencia IS NULL OR r.id_referencia = p_idreferencia)
      AND (p_sexo IS NULL OR p.sexo = p_sexo)
    ORDER BY r.fecha_referencia DESC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_registrar_referencia(
  IN p_noafiliacion text, IN p_fechareferencia date, IN p_motivotraslado text,
  IN p_idmedico bigint, IN p_especialidadreferencia text, IN p_usuario_nombre text,
  INOUT ref refcursor
) LANGUAGE plpgsql AS $$
DECLARE
  v_id text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tbl_pacientes WHERE no_afiliacion = p_noafiliacion) THEN
    RAISE EXCEPTION 'Paciente no encontrado';
  END IF;
  IF p_idmedico IS NULL OR NOT EXISTS (SELECT 1 FROM public.tbl_medicos WHERE id_medico = p_idmedico) THEN
    RAISE EXCEPTION 'id_medico invalido';
  END IF;

  v_id := 'REF-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 6);

  INSERT INTO public.tbl_referencias (
    id_referencia, no_afiliacion, id_medico, fecha_referencia, motivo_traslado,
    especialidad_referencia, usuario_creacion, fecha_creacion
  ) VALUES (
    v_id, p_noafiliacion, p_idmedico, p_fechareferencia, p_motivotraslado,
    p_especialidadreferencia, p_usuario_nombre, now()
  );

  OPEN ref FOR SELECT * FROM public.tbl_referencias WHERE id_referencia = v_id;
END;
$$;

-- ============================================================================
-- SECCION 10: EGRESOS Y REINGRESOS (mutaciones)
-- ============================================================================

CREATE OR REPLACE PROCEDURE public.sp_pacientes_para_egreso(
  IN p_dpi text, IN p_noafiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.*, es.descripcion AS estado_descripcion
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_estados_paciente es ON p.id_estado = es.id_estado
    WHERE (p_dpi IS NOT NULL AND p.dpi = p_dpi) OR (p_noafiliacion IS NOT NULL AND p.no_afiliacion = p_noafiliacion);
END;
$$;

-- [INFERIDO] Sin cursor de salida (evidencia: el backend hace un SELECT
-- manual despues). Actualiza datos del paciente y registra/actualiza el
-- periodo activo en tbl_historial_formularios (uso compartido por los 3
-- endpoints que llaman a este mismo SP: egreso "else", reingreso desde
-- Egresos, y ReingresoPacientes).
CREATE OR REPLACE PROCEDURE public.sp_paciente_reingreso_actualizar(
  IN p_no_afiliacion text, IN p_primer_nombre text, IN p_segundo_nombre text,
  IN p_primer_apellido text, IN p_segundo_apellido text, IN p_numero_formulario text,
  IN p_sesiones_autorizadas_mes integer, IN p_fecha_inicio_periodo date, IN p_fecha_fin_periodo date,
  IN p_observaciones text, IN p_usuario text
) LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.tbl_pacientes SET
    primer_nombre = COALESCE(p_primer_nombre, primer_nombre),
    segundo_nombre = COALESCE(p_segundo_nombre, segundo_nombre),
    primer_apellido = COALESCE(p_primer_apellido, primer_apellido),
    segundo_apellido = COALESCE(p_segundo_apellido, segundo_apellido),
    numero_formulario_activo = COALESCE(p_numero_formulario, numero_formulario_activo),
    sesiones_autorizadas_mes = COALESCE(p_sesiones_autorizadas_mes, sesiones_autorizadas_mes),
    inicio_prest_servicios = COALESCE(p_fecha_inicio_periodo, inicio_prest_servicios),
    fin_prest_servicios = COALESCE(p_fecha_fin_periodo, fin_prest_servicios),
    usuario_actualizacion = p_usuario,
    fecha_actualizacion = now()
  WHERE no_afiliacion = p_no_afiliacion;

  IF p_numero_formulario IS NOT NULL THEN
    INSERT INTO public.tbl_historial_formularios (
      no_afiliacion, numero_formulario, sesiones_autorizadas_mes,
      inicio_prest_servicios, fin_prest_servicios, observaciones, usuario_creacion, fecha_creacion
    ) VALUES (
      p_no_afiliacion, p_numero_formulario, p_sesiones_autorizadas_mes,
      p_fecha_inicio_periodo, p_fecha_fin_periodo, p_observaciones, p_usuario, now()
    ) ON CONFLICT (no_afiliacion, numero_formulario) DO UPDATE SET
      sesiones_autorizadas_mes = EXCLUDED.sesiones_autorizadas_mes,
      inicio_prest_servicios = EXCLUDED.inicio_prest_servicios,
      fin_prest_servicios = EXCLUDED.fin_prest_servicios,
      observaciones = EXCLUDED.observaciones,
      usuario_actualizacion = p_usuario,
      fecha_actualizacion = now();
  END IF;
END;
$$;

-- [INFERIDO] Sin cursor de salida. Actualiza estado a Egresado (3) y, segun
-- que datos vengan poblados, registra caso concluido y/o fallecimiento.
CREATE OR REPLACE PROCEDURE public.sp_paciente_egreso(
  IN p_no_afiliacion text, IN p_idcausa bigint, IN p_causaegreso text, IN p_fechaegreso date,
  IN p_nocasoconcluido text, IN p_observaciones text, IN p_comorbilidades text,
  IN p_fechafallecimiento date, IN p_lugarfallecimiento text, IN p_causafallecimiento text,
  IN p_usuario text
) LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.tbl_pacientes SET id_estado = 3, usuario_actualizacion = p_usuario, fecha_actualizacion = now()
  WHERE no_afiliacion = p_no_afiliacion;

  INSERT INTO public.tbl_egresos (no_afiliacion, id_causa_egreso, descripcion, fecha_egreso, observaciones, usuario_creacion, fecha_creacion)
  VALUES (p_no_afiliacion, p_idcausa, p_causaegreso, p_fechaegreso, p_observaciones, p_usuario, now())
  ON CONFLICT (no_afiliacion, id_causa_egreso) DO UPDATE SET
    descripcion = EXCLUDED.descripcion, fecha_egreso = EXCLUDED.fecha_egreso,
    observaciones = EXCLUDED.observaciones, usuario_actualizacion = p_usuario, fecha_actualizacion = now();

  IF p_nocasoconcluido IS NOT NULL THEN
    INSERT INTO public.tbl_casos_concluidos (no_afiliacion, no_caso_concluido, usuario_creacion, fecha_creacion)
    VALUES (p_no_afiliacion, p_nocasoconcluido, p_usuario, now())
    ON CONFLICT (no_afiliacion, no_caso_concluido) DO NOTHING;
  END IF;

  IF p_fechafallecimiento IS NOT NULL OR p_causafallecimiento IS NOT NULL THEN
    INSERT INTO public.tbl_fallecimientos (no_afiliacion, comorbilidades, fechafallecido, lugarfallecimiento, causafallecimiento, observaciones, usuario_creacion, fecha_creacion)
    VALUES (p_no_afiliacion, p_comorbilidades, p_fechafallecimiento, p_lugarfallecimiento, p_causafallecimiento, p_observaciones, p_usuario, now())
    ON CONFLICT (no_afiliacion) DO UPDATE SET
      comorbilidades = EXCLUDED.comorbilidades, fechafallecido = EXCLUDED.fechafallecido,
      lugarfallecimiento = EXCLUDED.lugarfallecimiento, causafallecimiento = EXCLUDED.causafallecimiento,
      observaciones = EXCLUDED.observaciones, usuario_actualizacion = p_usuario, fecha_actualizacion = now();
  END IF;
END;
$$;

-- [INFERIDO] 3 cursores INOUT declarados (cur_paciente, cur_egreso, cur_tipo);
-- el backend solo consume los 2 primeros. Usa un bloqueo explicito sobre el
-- paciente para producir el error 55P03 (lock_not_available) que el backend
-- mapea a HTTP 409 cuando el paciente esta siendo editado simultaneamente.
CREATE OR REPLACE PROCEDURE public.sp_paciente_registrar_egreso(
  IN p_no_afiliacion text, IN p_id_causa_egreso bigint, IN p_descripcion text,
  IN p_fecha_egreso date, IN p_observaciones text, IN p_comorbilidades text,
  IN p_fechafallecimiento date, IN p_lugarfallecimiento text, IN p_causafallecimiento text,
  IN p_usuario text, INOUT cur_paciente refcursor, INOUT cur_egreso refcursor, INOUT cur_tipo refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM public.tbl_pacientes WHERE no_afiliacion = p_no_afiliacion FOR UPDATE NOWAIT;

  INSERT INTO public.tbl_egresos (no_afiliacion, id_causa_egreso, descripcion, fecha_egreso, observaciones, usuario_creacion, fecha_creacion)
  VALUES (p_no_afiliacion, p_id_causa_egreso, p_descripcion, p_fecha_egreso, p_observaciones, p_usuario, now())
  ON CONFLICT (no_afiliacion, id_causa_egreso) DO UPDATE SET
    descripcion = EXCLUDED.descripcion, fecha_egreso = EXCLUDED.fecha_egreso,
    observaciones = EXCLUDED.observaciones, usuario_actualizacion = p_usuario, fecha_actualizacion = now();

  IF p_fechafallecimiento IS NOT NULL OR p_causafallecimiento IS NOT NULL THEN
    INSERT INTO public.tbl_fallecimientos (no_afiliacion, comorbilidades, fechafallecido, lugarfallecimiento, causafallecimiento, usuario_creacion, fecha_creacion)
    VALUES (p_no_afiliacion, p_comorbilidades, p_fechafallecimiento, p_lugarfallecimiento, p_causafallecimiento, p_usuario, now())
    ON CONFLICT (no_afiliacion) DO UPDATE SET
      comorbilidades = EXCLUDED.comorbilidades, fechafallecido = EXCLUDED.fechafallecido,
      lugarfallecimiento = EXCLUDED.lugarfallecimiento, causafallecimiento = EXCLUDED.causafallecimiento,
      usuario_actualizacion = p_usuario, fecha_actualizacion = now();
  END IF;

  UPDATE public.tbl_pacientes SET id_estado = 3, usuario_actualizacion = p_usuario, fecha_actualizacion = now()
  WHERE no_afiliacion = p_no_afiliacion;

  OPEN cur_paciente FOR SELECT * FROM public.tbl_pacientes WHERE no_afiliacion = p_no_afiliacion;
  OPEN cur_egreso FOR SELECT * FROM public.tbl_egresos
    WHERE no_afiliacion = p_no_afiliacion AND id_causa_egreso = p_id_causa_egreso;
  OPEN cur_tipo FOR SELECT NULL::text AS tipo WHERE false;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_pacientes_para_reingreso(
  IN p_dpi text, IN p_noafiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.* FROM public.tbl_pacientes p
    WHERE p.id_estado = 3
      AND EXISTS (SELECT 1 FROM public.tbl_egresos e WHERE e.no_afiliacion = p.no_afiliacion)
      AND (
        (p_dpi IS NULL AND p_noafiliacion IS NULL)
        OR (p_dpi IS NOT NULL AND p.dpi = p_dpi)
        OR (p_noafiliacion IS NOT NULL AND p.no_afiliacion = p_noafiliacion)
      );
END;
$$;

-- [INFERIDO] Sin parametro de actor explicito (se ejecuta dentro de
-- runWithUser -> usa current_setting('app.current_user') para auditoria).
CREATE OR REPLACE PROCEDURE public.sp_paciente_reingreso_insertar(
  IN p_no_afiliacion text, IN p_numero_formulario text, IN p_sesiones_mes integer,
  IN p_inicio_prest date, IN p_fin_prest date, IN p_fecha_reingreso date,
  IN p_observaciones text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
DECLARE
  v_actor text := COALESCE(current_setting('app.current_user', true), 'sistema');
BEGIN
  UPDATE public.tbl_pacientes SET
    id_estado = 1,
    numero_formulario_activo = p_numero_formulario,
    sesiones_autorizadas_mes = COALESCE(p_sesiones_mes, sesiones_autorizadas_mes),
    inicio_prest_servicios = COALESCE(p_inicio_prest, inicio_prest_servicios),
    fin_prest_servicios = COALESCE(p_fin_prest, fin_prest_servicios),
    usuario_actualizacion = v_actor,
    fecha_actualizacion = now()
  WHERE no_afiliacion = p_no_afiliacion;

  INSERT INTO public.tbl_reingresos (
    no_afiliacion, numero_formulario, sesiones_autorizadas_mes, inicio_prest_servicios,
    fin_prest_servicios, fecha_reingreso, observaciones, usuario_creacion, fecha_creacion
  ) VALUES (
    p_no_afiliacion, p_numero_formulario, p_sesiones_mes, p_inicio_prest,
    p_fin_prest, p_fecha_reingreso, p_observaciones, v_actor, now()
  ) ON CONFLICT (no_afiliacion, numero_formulario) DO UPDATE SET
    fecha_reingreso = EXCLUDED.fecha_reingreso, observaciones = EXCLUDED.observaciones,
    usuario_actualizacion = v_actor, fecha_actualizacion = now();

  OPEN ref FOR SELECT * FROM public.tbl_pacientes WHERE no_afiliacion = p_no_afiliacion;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_reingreso_insertar(
  IN p_no_afiliacion text, IN p_numero_formulario text, IN p_fecha_reingreso date,
  IN p_observaciones text, IN p_usuario text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.tbl_reingresos (no_afiliacion, numero_formulario, fecha_reingreso, observaciones, usuario_creacion, fecha_creacion)
  VALUES (p_no_afiliacion, p_numero_formulario, p_fecha_reingreso, p_observaciones, p_usuario, now())
  ON CONFLICT (no_afiliacion, numero_formulario) DO UPDATE SET
    fecha_reingreso = EXCLUDED.fecha_reingreso, observaciones = EXCLUDED.observaciones,
    usuario_actualizacion = p_usuario, fecha_actualizacion = now();

  OPEN ref FOR SELECT * FROM public.tbl_reingresos
    WHERE no_afiliacion = p_no_afiliacion AND numero_formulario = p_numero_formulario;
END;
$$;

-- ============================================================================
-- SECCION 11: NUTRICION Y PSICOLOGIA
-- ============================================================================

-- [INFERIDO] Calcula IMC en el propio SP (peso_kg / (altura_cm/100)^2).
-- Devuelve una sola columna "result" (jsonb) porque asi la lee el backend.
CREATE OR REPLACE PROCEDURE public.sp_guardar_informe_nutricion(
  IN p_no_afiliacion text, IN p_motivo_consulta text, IN p_altura_cm numeric,
  IN p_peso_kg numeric, IN p_observaciones text, IN p_usuario_nombre text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
DECLARE
  v_id text;
  v_imc numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tbl_pacientes WHERE no_afiliacion = p_no_afiliacion) THEN
    RAISE EXCEPTION 'Paciente no encontrado';
  END IF;

  IF p_altura_cm IS NOT NULL AND p_altura_cm > 0 AND p_peso_kg IS NOT NULL THEN
    v_imc := round(p_peso_kg / power(p_altura_cm / 100.0, 2), 2);
  END IF;

  v_id := 'NUT-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 6);

  INSERT INTO public.tbl_informe_nutricion (
    id_informe, no_afiliacion, motivo_consulta, altura_cm, peso_kg, imc, observaciones,
    usuario_creacion, fecha_creacion
  ) VALUES (
    v_id, p_no_afiliacion, p_motivo_consulta, p_altura_cm, p_peso_kg, v_imc, p_observaciones,
    p_usuario_nombre, now()
  );

  OPEN ref FOR SELECT to_jsonb(t) AS result FROM public.tbl_informe_nutricion t WHERE id_informe = v_id;
END;
$$;

-- [INFERIDO] Devuelve una columna "result" (jsonb) con {informe, kdqol},
-- tal como lo lee el backend.
CREATE OR REPLACE PROCEDURE public.sp_guardar_evaluacion_psicologia(
  IN p_no_afiliacion text, IN p_motivo_consulta text, IN p_tipo_consulta text,
  IN p_tipo_atencion text, IN p_pronostico_paciente text, IN p_aplicacion_kdqol boolean,
  IN p_fisico_mental integer, IN p_enfermedad_renal integer, IN p_sintomas_problemas integer,
  IN p_efectos_enfermedad integer, IN p_vida_diaria integer, IN p_observaciones text,
  IN p_usuario_nombre text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
DECLARE
  v_id text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tbl_pacientes WHERE no_afiliacion = p_no_afiliacion) THEN
    RAISE EXCEPTION 'Paciente no encontrado';
  END IF;

  v_id := 'PSI-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 6);

  INSERT INTO public.tbl_informes_psicologia (
    id_informe, no_afiliacion, motivo_consulta, tipo_consulta, tipo_atencion, pronostico_paciente,
    aplicacion_kdqol, fisico_mental, enfermedad_renal, sintomas_problemas, efectos_enfermedad,
    vida_diaria, observaciones, usuario_creacion, fecha_creacion
  ) VALUES (
    v_id, p_no_afiliacion, p_motivo_consulta, p_tipo_consulta, p_tipo_atencion, p_pronostico_paciente,
    p_aplicacion_kdqol, p_fisico_mental, p_enfermedad_renal, p_sintomas_problemas, p_efectos_enfermedad,
    p_vida_diaria, p_observaciones, p_usuario_nombre, now()
  );

  OPEN ref FOR
    SELECT jsonb_build_object(
      'informe', to_jsonb(t),
      'kdqol', jsonb_build_object(
        'fisico', t.fisico_mental, 'mental', t.enfermedad_renal, 'sintomas', t.sintomas_problemas,
        'carga', t.efectos_enfermedad, 'efectos', t.vida_diaria
      )
    ) AS result
    FROM public.tbl_informes_psicologia t WHERE id_informe = v_id;
END;
$$;

-- ============================================================================
-- SECCION 12: FORMULARIOS (BackRegistroFormularios.js)
-- ============================================================================

-- [REAL] Estructura del JSON confirmada leyendo RegistroFormularios.jsx
-- (handleRegistroFormularioSubmit): { noafiliacion, numeroformulario,
-- fechainicioperiodo, fechafinperiodo, sesionesautorizadasmes } - SIN
-- guion bajo y SIN id_jornada (nunca se envia, por eso queda opcional).
CREATE OR REPLACE PROCEDURE public.sp_registro_formularios(
  IN p_pacientes json, IN p_usuario text
) LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  v_existe integer;
BEGIN
  IF p_usuario IS NULL OR p_usuario = '' THEN
    RAISE EXCEPTION 'Debe proporcionar el usuario que realiza la actualizacion.';
  END IF;

  FOR r IN
    SELECT * FROM json_to_recordset(p_pacientes) AS (
      noafiliacion text,
      numeroformulario text,
      fechainicioperiodo date,
      fechafinperiodo date,
      sesionesautorizadasmes integer,
      idjornada bigint
    )
  LOOP
    SELECT COUNT(*) INTO v_existe FROM public.tbl_pacientes WHERE no_afiliacion = r.noafiliacion;
    IF v_existe = 0 THEN
      RAISE EXCEPTION 'No existe paciente con no_afiliacion=%', r.noafiliacion;
    END IF;

    UPDATE public.tbl_pacientes SET
      numero_formulario_activo = r.numeroformulario,
      inicio_prest_servicios = r.fechainicioperiodo,
      fin_prest_servicios = r.fechafinperiodo,
      sesiones_autorizadas_mes = r.sesionesautorizadasmes,
      id_jornada = COALESCE(r.idjornada, id_jornada),
      id_estado = 1,
      usuario_actualizacion = p_usuario,
      fecha_actualizacion = now()
    WHERE no_afiliacion = r.noafiliacion;

    INSERT INTO public.tbl_historial_formularios (
      no_afiliacion, numero_formulario, sesiones_autorizadas_mes,
      inicio_prest_servicios, fin_prest_servicios, usuario_creacion, fecha_creacion
    ) VALUES (
      r.noafiliacion, r.numeroformulario, r.sesionesautorizadasmes,
      r.fechainicioperiodo, r.fechafinperiodo, p_usuario, now()
    ) ON CONFLICT (no_afiliacion, numero_formulario) DO UPDATE SET
      sesiones_autorizadas_mes = EXCLUDED.sesiones_autorizadas_mes,
      inicio_prest_servicios = EXCLUDED.inicio_prest_servicios,
      fin_prest_servicios = EXCLUDED.fin_prest_servicios,
      usuario_actualizacion = p_usuario, fecha_actualizacion = now();
  END LOOP;
END;
$$;

-- [REAL] RegistroFormularios.jsx lee las columnas de esta fila SIN guion
-- bajo (paciente.noafiliacion, paciente.primernombre, paciente.sexo,
-- paciente.idjornada) - confirmado leyendo el componente. p.* solo no
-- alcanza porque tbl_pacientes usa guion bajo en sus columnas reales.
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

-- ============================================================================
-- SECCION 13: TURNOS (BackGestionTurno.js) - ids de estado confirmados por
-- comentarios del backend: 1=Asignado, 4=Llamado, 7=Faltante. 5=Finalizado
-- y 8=Abandonado son [INFERIDO] (ver seccion de seed data).
-- ============================================================================

CREATE OR REPLACE PROCEDURE public.sp_mostrar_paciente_detalle(
  IN p_noafiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.*, d.nombre AS departamento_nombre, j.descripcion AS jornada_descripcion,
           a.descripcion AS acceso_descripcion, es.descripcion AS estado_descripcion
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_estados_paciente es ON p.id_estado = es.id_estado
    WHERE p.no_afiliacion = p_noafiliacion;
END;
$$;

-- [REAL] GestionTurno.jsx (Creacion de Turnos) lee turno.nombre_clinica
-- (nombre, no id) y turno.id_turno_cod - confirmado leyendo el JSX.
-- id_turno_cod no tiene una fuente real distinta del propio id_turno (el
-- sistema original nunca devolvia un codigo separado, ver sp_crear_turno_t
-- mas abajo), asi que se usa el mismo id_turno como aproximacion.
CREATE OR REPLACE PROCEDURE public.sp_mostrar_turnos_t(
  IN p_noafiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT t.*, t.id_turno AS id_turno_cod, c.descripcion AS nombre_clinica
    FROM public.tbl_turnos t
    LEFT JOIN public.tbl_clinica c ON t.id_clinica = c.id_clinica
    WHERE t.no_afiliacion = p_noafiliacion
    ORDER BY t.fecha_turno DESC;
END;
$$;

-- [REAL] AsignarTurno.jsx lee t.nombre_clinica y t.id_turno_cod, mismo
-- patron que sp_mostrar_turnos_t.
CREATE OR REPLACE PROCEDURE public.sp_mostrar_turnos_faltantes_t(
  IN p_noafiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT t.*, t.id_turno AS id_turno_cod, c.descripcion AS nombre_clinica
    FROM public.tbl_turnos t
    LEFT JOIN public.tbl_clinica c ON t.id_clinica = c.id_clinica
    WHERE t.no_afiliacion = p_noafiliacion AND t.id_estado_turno = 7
    ORDER BY t.fecha_turno DESC;
END;
$$;

-- [INFERIDO] id_turno es un identificador de texto generado por el propio SP
-- (evidencia: PK text, no serial). El 4to parametro (null en el JS) se
-- ignora - el backend nunca lee un id/codigo de vuelta (bug ya presente en
-- el sistema original, documentado en el inventario).
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
  VALUES (v_id_turno, p_noafiliacion, v_id_clinica, p_fecha_turno, 1, now());
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_registrar_faltista_t(
  IN p_noafiliacion text, IN p_fecha_falta date, IN p_motivo_falta text, IN p_nombre_clinica text
) LANGUAGE plpgsql AS $$
DECLARE
  v_id_clinica bigint;
BEGIN
  SELECT id_clinica INTO v_id_clinica FROM public.tbl_clinica WHERE descripcion = p_nombre_clinica;
  INSERT INTO public.tbl_faltistas (no_afiliacion, id_clinica, fecha_falta, motivo_falta, fecha_creacion)
  VALUES (p_noafiliacion, v_id_clinica, p_fecha_falta, p_motivo_falta, now());
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_mostrar_turnos_todos(
  IN p_numeroafiliacion text, IN p_fecha date, IN p_clinica text, IN p_estado text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT t.*, p.primer_nombre, p.primer_apellido, c.descripcion AS clinica_descripcion,
           es.descripcion AS estado_descripcion
    FROM public.tbl_turnos t
    JOIN public.tbl_pacientes p ON t.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_clinica c ON t.id_clinica = c.id_clinica
    LEFT JOIN public.tbl_estados_turno es ON t.id_estado_turno = es.id_estado_turno
    WHERE (p_numeroafiliacion IS NULL OR t.no_afiliacion = p_numeroafiliacion)
      AND (p_fecha IS NULL OR t.fecha_turno = p_fecha)
      AND (p_clinica IS NULL OR c.descripcion = p_clinica)
      AND (p_estado IS NULL OR es.descripcion = p_estado)
    ORDER BY t.fecha_turno DESC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_actualizar_turno_simple(
  IN p_turno_id text, IN p_fecha_turno date, IN p_clinica text
) LANGUAGE plpgsql AS $$
DECLARE
  v_id_clinica bigint;
BEGIN
  SELECT id_clinica INTO v_id_clinica FROM public.tbl_clinica WHERE descripcion = p_clinica;
  UPDATE public.tbl_turnos SET fecha_turno = p_fecha_turno, id_clinica = COALESCE(v_id_clinica, id_clinica)
  WHERE id_turno = p_turno_id;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_marcar_turno_faltante(IN p_idturno text)
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.tbl_turnos SET id_estado_turno = 7 WHERE id_turno = p_idturno;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_eliminar_turno(IN p_idturno text)
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.tbl_turnos WHERE id_turno = p_idturno;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontro el turno %', p_idturno;
  END IF;
END;
$$;

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
    ORDER BY t.fecha_turno ASC, t.fecha_asignacion ASC LIMIT 1;
END;
$$;

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
    ORDER BY t.fecha_asignacion DESC LIMIT 1;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_asignar_turno(IN p_turno_id text)
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.tbl_turnos SET id_estado_turno = 1, fecha_asignacion = now() WHERE id_turno = p_turno_id;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_actualizar_estado_llamado(
  IN p_idturno text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.tbl_turnos SET id_estado_turno = 4 WHERE id_turno = p_idturno;
  OPEN ref FOR SELECT * FROM public.tbl_turnos WHERE id_turno = p_idturno;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_abandonar_turno(
  IN p_idturno text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.tbl_turnos SET id_estado_turno = 8 WHERE id_turno = p_idturno;
  OPEN ref FOR SELECT * FROM public.tbl_turnos WHERE id_turno = p_idturno;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_finalizar_turno(
  IN p_idturno text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.tbl_turnos SET id_estado_turno = 5, fecha_finalizacion = now() WHERE id_turno = p_idturno;
  OPEN ref FOR SELECT * FROM public.tbl_turnos WHERE id_turno = p_idturno;
END;
$$;

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
    ORDER BY t.fecha_turno ASC LIMIT 5;
END;
$$;

-- ============================================================================
-- SECCION 14: REPORTES (todos [INFERIDO] - joins razonables con los filtros
-- opcionales que el backend confirma para cada uno; nombres de columna de
-- salida elegidos SIN guion bajo, igual que la mayoria de los reportes segun
-- el inventario, salvo sp_faltistas_filtrado que usa alias CON guion bajo).
-- ============================================================================

CREATE OR REPLACE PROCEDURE public.sp_fallecidos_filtrado(
  IN p_fechainicio date, IN p_fechafin date, IN p_jornada text, IN p_accesovascular text,
  IN p_sexo text, IN p_departamento text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.no_afiliacion AS noafiliacion,
           (p.primer_nombre || ' ' || COALESCE(p.segundo_nombre,'') || ' ' || p.primer_apellido || ' ' || COALESCE(p.segundo_apellido,'')) AS nombre_completo,
           p.sexo, j.descripcion AS jornada, a.descripcion AS accesovascular, d.nombre AS departamento,
           p.fecha_ingreso AS fechaingreso,
           f.fechafallecido, f.comorbilidades, f.lugarfallecimiento, f.causafallecimiento, f.observaciones
    FROM public.tbl_fallecimientos f
    JOIN public.tbl_pacientes p ON f.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    WHERE (p_fechainicio IS NULL OR f.fechafallecido::date >= p_fechainicio)
      AND (p_fechafin IS NULL OR f.fechafallecido::date <= p_fechafin)
      AND (p_jornada IS NULL OR j.descripcion = p_jornada)
      AND (p_accesovascular IS NULL OR a.descripcion = p_accesovascular)
      AND (p_sexo IS NULL OR p.sexo = p_sexo)
      AND (p_departamento IS NULL OR d.nombre = p_departamento)
    ORDER BY f.fechafallecido DESC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_egreso_filtrado(
  IN p_fechainicio date, IN p_fechafin date, IN p_causa text, IN p_jornada text,
  IN p_accesovascular text, IN p_sexo text, IN p_departamento text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT e.no_afiliacion AS noafiliacion, e.id_causa_egreso, ce.descripcion AS causa_descripcion,
           e.descripcion, e.fecha_egreso AS fechaegreso, e.observaciones
    FROM public.tbl_egresos e
    JOIN public.tbl_pacientes p ON e.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_causa_egreso ce ON e.id_causa_egreso = ce.id_causa
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    WHERE (p_fechainicio IS NULL OR e.fecha_egreso >= p_fechainicio)
      AND (p_fechafin IS NULL OR e.fecha_egreso <= p_fechafin)
      AND (p_causa IS NULL OR ce.descripcion = p_causa)
      AND (p_jornada IS NULL OR j.descripcion = p_jornada)
      AND (p_accesovascular IS NULL OR a.descripcion = p_accesovascular)
      AND (p_sexo IS NULL OR p.sexo = p_sexo)
      AND (p_departamento IS NULL OR d.nombre = p_departamento)
    ORDER BY e.fecha_egreso DESC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_nuevo_ingreso_filtrado(
  IN p_fechainicio date, IN p_fechafin date, IN p_numeroformulario text, IN p_jornada text,
  IN p_accesovascular text, IN p_sexo text, IN p_departamento text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.primer_nombre AS primernombre, p.segundo_nombre AS segundonombre,
           p.otros_nombres AS otrosnombres, p.primer_apellido AS primerapellido,
           p.segundo_apellido AS segundoapellido, p.apellido_casada AS apellidocasada,
           p.fecha_nacimiento AS fechanacimiento, p.sexo, p.direccion,
           d.nombre AS departamento, p.fecha_ingreso AS fechaingreso,
           j.descripcion AS jornada, a.descripcion AS accesovascular,
           p.numero_formulario_activo AS numeroformulario,
           p.inicio_prest_servicios AS fechainicioperiodo, p.fin_prest_servicios AS fechafinperiodo,
           p.dpi, p.no_paciente_proveedor AS nopacienteproveedor, p.no_afiliacion AS noafiliacion,
           f.fechafallecido
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_fallecimientos f ON f.no_afiliacion = p.no_afiliacion
    WHERE p.id_estado = 2
      AND (p_fechainicio IS NULL OR p.fecha_ingreso >= p_fechainicio)
      AND (p_fechafin IS NULL OR p.fecha_ingreso <= p_fechafin)
      AND (p_numeroformulario IS NULL OR p.numero_formulario_activo = p_numeroformulario)
      AND (p_jornada IS NULL OR j.descripcion = p_jornada)
      AND (p_accesovascular IS NULL OR a.descripcion = p_accesovascular)
      AND (p_sexo IS NULL OR p.sexo = p_sexo)
      AND (p_departamento IS NULL OR d.nombre = p_departamento)
    ORDER BY p.fecha_ingreso DESC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_pacientes_reporte_filtrado(
  IN p_fechainicio date, IN p_fechafin date, IN p_estado text, IN p_numeroformulario text,
  IN p_jornada text, IN p_accesovascular text, IN p_sexo text, IN p_departamento text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.no_afiliacion AS noafiliacion, p.dpi, p.primer_nombre AS primernombre,
           p.segundo_nombre AS segundonombre, p.otros_nombres AS otrosnombres,
           p.primer_apellido AS primerapellido, p.segundo_apellido AS segundoapellido,
           p.apellido_casada AS apellidocasada, p.fecha_nacimiento AS fechanacimiento, p.sexo,
           p.direccion, d.nombre AS departamento, p.fecha_ingreso AS fechaingreso,
           es.descripcion AS estado, j.descripcion AS jornada, a.descripcion AS accesovascular,
           p.numero_formulario_activo AS numeroformulario,
           p.inicio_prest_servicios AS fechainicioperiodo, p.fin_prest_servicios AS fechafinperiodo,
           f.fechafallecido
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    LEFT JOIN public.tbl_estados_paciente es ON p.id_estado = es.id_estado
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_fallecimientos f ON f.no_afiliacion = p.no_afiliacion
    WHERE (p_fechainicio IS NULL OR p.fecha_ingreso >= p_fechainicio)
      AND (p_fechafin IS NULL OR p.fecha_ingreso <= p_fechafin)
      AND (p_estado IS NULL OR es.descripcion = p_estado)
      AND (p_numeroformulario IS NULL OR p.numero_formulario_activo = p_numeroformulario)
      AND (p_jornada IS NULL OR j.descripcion = p_jornada)
      AND (p_accesovascular IS NULL OR a.descripcion = p_accesovascular)
      AND (p_sexo IS NULL OR p.sexo = p_sexo)
      AND (p_departamento IS NULL OR d.nombre = p_departamento)
    ORDER BY p.fecha_ingreso DESC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_faltistas_filtrado(
  IN p_fechainicio date, IN p_fechafin date, IN p_noafiliacion text, IN p_sexo text,
  IN p_clinica text, IN p_jornada text, IN p_accesovascular text, IN p_departamento text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT ft.no_afiliacion, p.primer_nombre, p.segundo_nombre, p.otros_nombres,
           p.primer_apellido, p.segundo_apellido, p.apellido_casada, p.sexo,
           c.descripcion AS clinica, j.descripcion AS jornada, a.descripcion AS accesovascular,
           d.nombre AS departamento, ft.fecha_falta AS fechafalta
    FROM public.tbl_faltistas ft
    JOIN public.tbl_pacientes p ON ft.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_clinica c ON ft.id_clinica = c.id_clinica
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    WHERE (p_fechainicio IS NULL OR ft.fecha_falta >= p_fechainicio)
      AND (p_fechafin IS NULL OR ft.fecha_falta <= p_fechafin)
      AND (p_noafiliacion IS NULL OR ft.no_afiliacion = p_noafiliacion)
      AND (p_sexo IS NULL OR p.sexo = p_sexo)
      AND (p_clinica IS NULL OR c.descripcion = p_clinica)
      AND (p_jornada IS NULL OR j.descripcion = p_jornada)
      AND (p_accesovascular IS NULL OR a.descripcion = p_accesovascular)
      AND (p_departamento IS NULL OR d.nombre = p_departamento)
    ORDER BY ft.fecha_falta DESC;
END;
$$;

-- ============================================================================
-- SECCION 15: ESTADISTICAS (BackEstadisticasResumen.js)
-- La mayoria son agrupaciones mecanicas (GROUP BY sobre una dimension clara
-- por el nombre del endpoint) y se implementan como [INFERIDO]. Las 2
-- realmente ambiguas (el dashboard combinado y los promedios KDQOL, donde el
-- propio inventario detecto que los nombres de columna no calzan 1:1) se
-- dejan como [PENDIENTE] con la firma correcta, sin inventar la agregacion.
-- ============================================================================

CREATE OR REPLACE PROCEDURE public.sp_pacientes_total(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR SELECT COUNT(*) AS total FROM public.tbl_pacientes;
END;
$$;

-- [REAL] Logica confirmada por comentario explicito en el backend: "Dentro
-- del programa: Reingreso(4), Activo(1), Nuevo ingreso(2) / Fuera: Egresado(3)".
CREATE OR REPLACE PROCEDURE public.sp_pacientes_programa_resumen(INOUT ref refcursor)
LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT
      COUNT(*) FILTER (WHERE id_estado IN (1,2,4)) AS dentro,
      COUNT(*) FILTER (WHERE id_estado = 3) AS fuera
    FROM public.tbl_pacientes;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_pacientes_por_departamento_filtros(
  IN p_acceso text, IN p_estado text, IN p_jornada text, IN p_sexo char(1), INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT d.nombre AS departamento, COUNT(*) AS total
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_departamento d ON p.id_departamento = d.id_departamento
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_estados_paciente es ON p.id_estado = es.id_estado
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    WHERE (p_acceso IS NULL OR a.descripcion = p_acceso)
      AND (p_estado IS NULL OR es.descripcion = p_estado)
      AND (p_jornada IS NULL OR j.descripcion = p_jornada)
      AND (p_sexo IS NULL OR left(lower(p.sexo),1) = lower(p_sexo))
    GROUP BY d.nombre ORDER BY d.nombre;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_pacientes_por_jornada(
  IN p_acceso text, IN p_estado text, IN p_jornada text, IN p_sexo char(1), INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT j.descripcion AS jornada, COUNT(*) AS total
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_estados_paciente es ON p.id_estado = es.id_estado
    WHERE (p_acceso IS NULL OR a.descripcion = p_acceso)
      AND (p_estado IS NULL OR es.descripcion = p_estado)
      AND (p_jornada IS NULL OR j.descripcion = p_jornada)
      AND (p_sexo IS NULL OR left(lower(p.sexo),1) = lower(p_sexo))
    GROUP BY j.descripcion ORDER BY j.descripcion;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_pacientes_por_sexo(
  IN p_acceso text, IN p_estado text, IN p_jornada text, IN p_sexo char(1), INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.sexo, COUNT(*) AS total
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_estados_paciente es ON p.id_estado = es.id_estado
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    WHERE (p_acceso IS NULL OR a.descripcion = p_acceso)
      AND (p_estado IS NULL OR es.descripcion = p_estado)
      AND (p_jornada IS NULL OR j.descripcion = p_jornada)
      AND (p_sexo IS NULL OR left(lower(p.sexo),1) = lower(p_sexo))
    GROUP BY p.sexo ORDER BY p.sexo;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_pacientes_por_acceso(
  IN p_acceso text, IN p_estado text, IN p_jornada text, IN p_sexo char(1), INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT a.descripcion AS acceso, COUNT(*) AS total
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_estados_paciente es ON p.id_estado = es.id_estado
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    WHERE (p_acceso IS NULL OR a.descripcion = p_acceso)
      AND (p_estado IS NULL OR es.descripcion = p_estado)
      AND (p_jornada IS NULL OR j.descripcion = p_jornada)
      AND (p_sexo IS NULL OR left(lower(p.sexo),1) = lower(p_sexo))
    GROUP BY a.descripcion ORDER BY a.descripcion;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_pacientes_por_estado(
  IN p_acceso text, IN p_estado text, IN p_jornada text, IN p_sexo char(1), INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT es.descripcion AS estado, COUNT(*) AS total
    FROM public.tbl_pacientes p
    LEFT JOIN public.tbl_estados_paciente es ON p.id_estado = es.id_estado
    LEFT JOIN public.tbl_acceso_vascular a ON p.id_acceso = a.id_acceso
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    WHERE (p_acceso IS NULL OR a.descripcion = p_acceso)
      AND (p_estado IS NULL OR es.descripcion = p_estado)
      AND (p_jornada IS NULL OR j.descripcion = p_jornada)
      AND (p_sexo IS NULL OR left(lower(p.sexo),1) = lower(p_sexo))
    GROUP BY es.descripcion ORDER BY es.descripcion;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_nutricion_por_tipo(
  IN p_desde date, IN p_hasta date, IN p_sexo text, IN p_motivo text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT n.motivo_consulta AS tipo, COUNT(*) AS total
    FROM public.tbl_informe_nutricion n
    JOIN public.tbl_pacientes p ON n.no_afiliacion = p.no_afiliacion
    WHERE (p_desde IS NULL OR n.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR n.fecha_creacion::date <= p_hasta)
      AND (p_sexo IS NULL OR p.sexo = p_sexo)
      AND (p_motivo IS NULL OR n.motivo_consulta = p_motivo)
    GROUP BY n.motivo_consulta;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_nutricion_por_sexo(
  IN p_desde date, IN p_hasta date, IN p_motivo text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.sexo, COUNT(*) AS total
    FROM public.tbl_informe_nutricion n
    JOIN public.tbl_pacientes p ON n.no_afiliacion = p.no_afiliacion
    WHERE (p_desde IS NULL OR n.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR n.fecha_creacion::date <= p_hasta)
      AND (p_motivo IS NULL OR n.motivo_consulta = p_motivo)
    GROUP BY p.sexo;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_nutricion_por_jornada(
  IN p_desde date, IN p_hasta date, IN p_sexo text, IN p_motivo text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT j.descripcion AS jornada, COUNT(*) AS total
    FROM public.tbl_informe_nutricion n
    JOIN public.tbl_pacientes p ON n.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    WHERE (p_desde IS NULL OR n.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR n.fecha_creacion::date <= p_hasta)
      AND (p_sexo IS NULL OR p.sexo = p_sexo)
      AND (p_motivo IS NULL OR n.motivo_consulta = p_motivo)
    GROUP BY j.descripcion;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_nutricion_por_motivo(
  IN p_desde date, IN p_hasta date, IN p_sexo text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT n.motivo_consulta AS motivo, COUNT(*) AS total
    FROM public.tbl_informe_nutricion n
    JOIN public.tbl_pacientes p ON n.no_afiliacion = p.no_afiliacion
    WHERE (p_desde IS NULL OR n.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR n.fecha_creacion::date <= p_hasta)
      AND (p_sexo IS NULL OR p.sexo = p_sexo)
    GROUP BY n.motivo_consulta;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_nutricion_detalle(
  IN p_desde date, IN p_hasta date, IN p_estado text, IN p_sexo text, IN p_motivo text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT n.*, p.primer_nombre, p.primer_apellido, p.sexo, es.descripcion AS estado_descripcion
    FROM public.tbl_informe_nutricion n
    JOIN public.tbl_pacientes p ON n.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_estados_paciente es ON p.id_estado = es.id_estado
    WHERE (p_desde IS NULL OR n.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR n.fecha_creacion::date <= p_hasta)
      AND (p_estado IS NULL OR es.descripcion = p_estado)
      AND (p_sexo IS NULL OR p.sexo = p_sexo)
      AND (p_motivo IS NULL OR n.motivo_consulta = p_motivo)
    ORDER BY n.fecha_creacion DESC;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_psicologia_por_tipo(
  IN p_desde date, IN p_hasta date, IN p_sexo char(1), INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT ip.tipo_consulta AS tipo, COUNT(*) AS total
    FROM public.tbl_informes_psicologia ip
    JOIN public.tbl_pacientes p ON ip.no_afiliacion = p.no_afiliacion
    WHERE (p_desde IS NULL OR ip.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR ip.fecha_creacion::date <= p_hasta)
      AND (p_sexo IS NULL OR left(lower(p.sexo),1) = lower(p_sexo))
    GROUP BY ip.tipo_consulta;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_psicologia_por_atencion(
  IN p_desde date, IN p_hasta date, IN p_sexo char(1), INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT ip.tipo_atencion AS atencion, COUNT(*) AS total
    FROM public.tbl_informes_psicologia ip
    JOIN public.tbl_pacientes p ON ip.no_afiliacion = p.no_afiliacion
    WHERE (p_desde IS NULL OR ip.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR ip.fecha_creacion::date <= p_hasta)
      AND (p_sexo IS NULL OR left(lower(p.sexo),1) = lower(p_sexo))
    GROUP BY ip.tipo_atencion;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_psicologia_por_pronostico(
  IN p_desde date, IN p_hasta date, IN p_sexo char(1), INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT ip.pronostico_paciente AS pronostico, COUNT(*) AS total
    FROM public.tbl_informes_psicologia ip
    JOIN public.tbl_pacientes p ON ip.no_afiliacion = p.no_afiliacion
    WHERE (p_desde IS NULL OR ip.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR ip.fecha_creacion::date <= p_hasta)
      AND (p_sexo IS NULL OR left(lower(p.sexo),1) = lower(p_sexo))
    GROUP BY ip.pronostico_paciente;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_psico_informes_por_sexo(
  IN p_desde date, IN p_hasta date, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.sexo, COUNT(*) AS total
    FROM public.tbl_informes_psicologia ip
    JOIN public.tbl_pacientes p ON ip.no_afiliacion = p.no_afiliacion
    WHERE (p_desde IS NULL OR ip.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR ip.fecha_creacion::date <= p_hasta)
    GROUP BY p.sexo;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_psico_informes_por_jornada(
  IN p_desde date, IN p_hasta date, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT j.descripcion AS jornada, COUNT(*) AS total
    FROM public.tbl_informes_psicologia ip
    JOIN public.tbl_pacientes p ON ip.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    WHERE (p_desde IS NULL OR ip.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR ip.fecha_creacion::date <= p_hasta)
    GROUP BY j.descripcion;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_psicologia_kdqol_por_jornada(
  IN p_desde date, IN p_hasta date, IN p_sexo char(1), INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT j.descripcion AS jornada, COUNT(*) AS total
    FROM public.tbl_informes_psicologia ip
    JOIN public.tbl_pacientes p ON ip.no_afiliacion = p.no_afiliacion
    LEFT JOIN public.tbl_jornadas j ON p.id_jornada = j.id_jornada
    WHERE ip.aplicacion_kdqol = true
      AND (p_desde IS NULL OR ip.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR ip.fecha_creacion::date <= p_hasta)
      AND (p_sexo IS NULL OR left(lower(p.sexo),1) = lower(p_sexo))
    GROUP BY j.descripcion;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_psicologia_kdqol_por_sexo(
  IN p_desde date, IN p_hasta date, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT p.sexo, COUNT(*) AS total
    FROM public.tbl_informes_psicologia ip
    JOIN public.tbl_pacientes p ON ip.no_afiliacion = p.no_afiliacion
    WHERE ip.aplicacion_kdqol = true
      AND (p_desde IS NULL OR ip.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR ip.fecha_creacion::date <= p_hasta)
    GROUP BY p.sexo;
END;
$$;

CREATE OR REPLACE PROCEDURE public.sp_psicologia_kdqol_total(
  IN p_desde date, IN p_hasta date, IN p_sexo char(1), INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT COUNT(*) AS total
    FROM public.tbl_informes_psicologia ip
    JOIN public.tbl_pacientes p ON ip.no_afiliacion = p.no_afiliacion
    WHERE ip.aplicacion_kdqol = true
      AND (p_desde IS NULL OR ip.fecha_creacion::date >= p_desde)
      AND (p_hasta IS NULL OR ip.fecha_creacion::date <= p_hasta)
      AND (p_sexo IS NULL OR left(lower(p.sexo),1) = lower(p_sexo));
END;
$$;

-- [PENDIENTE] TODO(reconstruido): el inventario detecto que las columnas
-- leidas (fisico, mental, sintomas, carga, efectos) NO calzan 1:1 con las
-- columnas de insercion (fisico_mental, enfermedad_renal, sintomas_problemas,
-- efectos_enfermedad, vida_diaria) - el mapeo real de que puntaje KDQOL
-- corresponde a que dimension se perdio. Este stub devuelve 0 en las 5
-- dimensiones para que el dashboard no truene; hay que decidir el mapeo
-- correcto (posiblemente consultando la literatura del cuestionario KDQOL-36
-- o los formularios en src/components/Psicologia.jsx) antes de usarlo.
CREATE OR REPLACE PROCEDURE public.sp_psicologia_kdqol_promedios(
  IN p_desde date, IN p_hasta date, IN p_sexo char(1), INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT 0::numeric AS fisico, 0::numeric AS mental, 0::numeric AS sintomas,
           0::numeric AS carga, 0::numeric AS efectos
    WHERE false;
END;
$$;

-- [PENDIENTE] TODO(reconstruido): dashboard que combina 11 sub-reportes en
-- una sola llamada. Cada cursor se abre con una consulta minima y segura
-- (columnas correctas, sin filas o en cero) para que el endpoint
-- /api/estadisticas/resumen no truene, pero las agregaciones reales
-- (ingresos/egresos por mes, ocupacion del dia, promedio de IMC a 90 dias,
-- etc.) no se reconstruyeron - se perdieron con el servidor original.
CREATE OR REPLACE PROCEDURE public.sp_estadisticas_resumen(
  IN p_desde30 date, IN p_hastahoy date,
  INOUT cur_pac_act refcursor, INOUT cur_ing_mes refcursor, INOUT cur_egr_mes refcursor,
  INOUT cur_faltas refcursor, INOUT cur_turnos refcursor, INOUT cur_ocup_hoy refcursor,
  INOUT cur_rei_30d refcursor, INOUT cur_psico_30d refcursor, INOUT cur_nutri_90d refcursor,
  INOUT cur_causas_eg refcursor, INOUT cur_est_nutri refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN cur_pac_act FOR SELECT COUNT(*) AS c FROM public.tbl_pacientes WHERE id_estado IN (1,2,4);
  OPEN cur_ing_mes FOR SELECT to_char(fecha_ingreso,'YYYY-MM') AS mes, COUNT(*) AS ingresos
    FROM public.tbl_pacientes WHERE fecha_ingreso BETWEEN p_desde30 AND p_hastahoy GROUP BY 1 ORDER BY 1;
  OPEN cur_egr_mes FOR SELECT to_char(fecha_egreso,'YYYY-MM') AS mes, COUNT(*) AS egresos
    FROM public.tbl_egresos WHERE fecha_egreso BETWEEN p_desde30 AND p_hastahoy GROUP BY 1 ORDER BY 1;
  OPEN cur_faltas FOR SELECT COUNT(*) AS total_faltas FROM public.tbl_faltistas
    WHERE fecha_falta BETWEEN p_desde30 AND p_hastahoy;
  OPEN cur_turnos FOR SELECT COUNT(*) AS total_turnos FROM public.tbl_turnos
    WHERE fecha_turno BETWEEN p_desde30 AND p_hastahoy;
  OPEN cur_ocup_hoy FOR SELECT
    COUNT(*) FILTER (WHERE id_estado_turno = 1) AS asignados_hoy,
    COUNT(*) FILTER (WHERE id_estado_turno = 5) AS finalizados_hoy
    FROM public.tbl_turnos WHERE fecha_turno = CURRENT_DATE;
  OPEN cur_rei_30d FOR SELECT COUNT(*) AS reingresos_30d FROM public.tbl_reingresos
    WHERE fecha_reingreso BETWEEN p_desde30 AND p_hastahoy;
  OPEN cur_psico_30d FOR SELECT COUNT(*) AS informes,
    COUNT(*) FILTER (WHERE aplicacion_kdqol = true) AS con_kdqol
    FROM public.tbl_informes_psicologia WHERE fecha_creacion::date BETWEEN p_desde30 AND p_hastahoy;
  OPEN cur_nutri_90d FOR SELECT round(AVG(imc), 2) AS imc_promedio FROM public.tbl_informe_nutricion
    WHERE fecha_creacion::date BETWEEN p_desde30 AND p_hastahoy;
  OPEN cur_causas_eg FOR SELECT ce.descripcion AS causa, COUNT(*) AS total
    FROM public.tbl_egresos e JOIN public.tbl_causa_egreso ce ON e.id_causa_egreso = ce.id_causa
    WHERE e.fecha_egreso BETWEEN p_desde30 AND p_hastahoy GROUP BY ce.descripcion;
  OPEN cur_est_nutri FOR SELECT NULL::text AS estado, 0::bigint AS total WHERE false;
END;
$$;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- Resumen de lo NO cubierto / pendiente de decision humana:
--   1. sp_estadisticas_resumen y sp_psicologia_kdqol_promedios (arriba,
--      buscar "TODO(reconstruido)").
--   2. backend/BackLogin.js sigue teniendo su propia copia de verifyJWT
--      (fuera del alcance de este script de BD).
--   3. BackNU.js es codigo muerto (marcado "NO SE USA" en el propio archivo)
--      con un esquema de nombres viejo (sin guion bajo, tablas distintas:
--      tbl_estadospaciente, tbl_accesovascular, etc.) - NO se reconstruyo
--      porque no corresponde al esquema activo.
--   4. Los ids de tbl_estados_turno 5 (Finalizado) y 8 (Abandonado) son
--      SUPUESTOS - solo 1, 4 y 7 estan confirmados por el codigo.
--   5. Este script no fue ejecutado contra un PostgreSQL real (no hay
--      acceso a una instancia en este entorno) - revisar errores de sintaxis
--      al correrlo por primera vez, especialmente en los CREATE PROCEDURE
--      con muchos parametros.
-- ============================================================================
