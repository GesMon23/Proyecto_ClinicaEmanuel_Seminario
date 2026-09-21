-- 1) Catálogos base
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
  descripcion text,
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
  descripcion text,
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

CREATE TABLE IF NOT EXISTS public.tbl_estados_turno (
  id_estado_turno bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  descripcion text,
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
  nombre text NOT NULL,
  descripcion text,
  estado boolean DEFAULT true,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

-- 2) Entidades con FKs a catálogos
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
  fecha_registro timestamp,
  url_foto text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

-- 3) Laboratorios y parámetros (orden correcto)
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

-- 4) Tablas que dependen de pacientes (y otros catálogos)
CREATE TABLE IF NOT EXISTS public.tbl_historial_formularios (
  no_afiliacion text REFERENCES public.tbl_pacientes (no_afiliacion),
  numero_formulario text,
  sesiones_autorizadas_mes integer,
  sesiones_realizadas_mes integer,
  sesiones_no_realizadas_mes integer,
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

CREATE TABLE IF NOT EXISTS public.tbl_reingresos (
  no_afiliacion text REFERENCES public.tbl_pacientes (no_afiliacion),
  numero_formulario text,
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

CREATE TABLE IF NOT EXISTS public.tbl_referencias (
  id_referencia text PRIMARY KEY,
  no_afiliacion text REFERENCES public.tbl_pacientes (no_afiliacion),
  fecha_referencia date,
  motivo_traslado text,
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

CREATE TABLE IF NOT EXISTS public.tbl_informes_psicologia (
  id_informe text PRIMARY KEY,
  no_afiliacion text REFERENCES public.tbl_pacientes (no_afiliacion),
  motivo_consulta text,
  tipo_consulta text,
  observaciones text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

CREATE TABLE IF NOT EXISTS public.tbl_informe_nutricion (
  id_informe text PRIMARY KEY,
  no_afiliacion text REFERENCES public.tbl_pacientes (no_afiliacion),
  motivo_consulta text,
  estado_nutricional text,
  observaciones text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

-- 5) Relaciones de empleados/usuarios/roles
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
