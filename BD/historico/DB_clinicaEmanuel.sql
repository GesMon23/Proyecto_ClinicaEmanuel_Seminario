
create table tbl_departamento (
  id_departamento char(2) primary key,
  nombre text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

create table tbl_estados_paciente (
  id_estado bigint primary key generated always as identity,
  descripcion text,
  estado boolean,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

create table tbl_acceso_vascular (
  id_acceso bigint primary key generated always as identity,
  descripcion text,
  estado boolean,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

create table tbl_causa_egreso (
  id_causa bigint primary key generated always as identity,
  descripcion text,
  estado boolean,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

create table tbl_clinica (
  id_clinica bigint primary key generated always as identity,
  descripcion text,
  estado boolean,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

create table tbl_jornadas (
  id_jornada bigint primary key generated always as identity,
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

create table tbl_medicos (
  id_medico bigint primary key generated always as identity,
  nombre_medico text,
  estado boolean,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

create table tbl_estados_turno (
  id_estado_turno bigint primary key generated always as identity,
  descripcion text,
  estado boolean,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

create table tbl_pacientes (
  no_afiliacion text primary key,
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
  id_departamento char(2) references tbl_departamento (id_departamento),
  id_estado bigint references tbl_estados_paciente (id_estado),
  id_acceso bigint references tbl_acceso_vascular (id_acceso),
  numero_formulario_activo text,
  id_jornada bigint references tbl_jornadas (id_jornada),
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

create table tbl_historial_formularios (
  no_afiliacion text references tbl_pacientes (no_afiliacion),
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
  primary key (no_afiliacion, numero_formulario)
);

create table tbl_egresos (
  no_afiliacion text references tbl_pacientes (no_afiliacion),
  id_causa_egreso bigint references tbl_causa_egreso (id_causa),
  descripcion text,
  fecha_egreso date,
  observaciones text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp,
  primary key (no_afiliacion, id_causa_egreso)
);


create table tbl_fallecimientos(
	no_afiliacion text references tbl_pacientes (no_afiliacion),
	comorbilidades text ,
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
	primary key (no_afiliacion)
);

create table tbl_casos_concluidos (
  no_afiliacion text references tbl_pacientes (no_afiliacion),
  no_caso_concluido text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp,
  primary key (no_afiliacion, no_caso_concluido)
);

create table tbl_reingresos (
  no_afiliacion text references tbl_pacientes (no_afiliacion),
  numero_formulario text,
  fecha_reingreso date,
  observaciones text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp,
  primary key (no_afiliacion, numero_formulario)
);

create table tbl_faltistas (
  no_afiliacion text references tbl_pacientes (no_afiliacion),
  id_clinica bigint references tbl_clinica (id_clinica),
  fecha_falta date,
  motivo_falta text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp,
  primary key (no_afiliacion, id_clinica, fecha_falta)
);

create table tbl_referencias (
  id_referencia text primary key,
  no_afiliacion text references tbl_pacientes (no_afiliacion),
  fecha_referencia date,
  motivo_traslado text,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);


create table tbl_periodicidadlaboratorio(
	idperlaboratorio bigint primary key generated always as identity,
	descripcion text,
	estado boolean,
	usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);


CREATE TABLE IF NOT EXISTS public.tbl_parametros_laboratorio
(
    idparametro bigint primary key generated always as identity,
    idlaboratorio bigint NOT NULL,
    parametro text COLLATE pg_catalog."default" NOT NULL,
    valor text COLLATE pg_catalog."default",
	usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp,
    CONSTRAINT tbl_parametros_laboratorio_idlaboratorio_fkey FOREIGN KEY (idlaboratorio)
        REFERENCES public.tbl_laboratorios (idlaboratorio) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tbl_parametros_laboratorio
    OWNER to postgres;



CREATE TABLE IF NOT EXISTS public.tbl_laboratorios
(
    idlaboratorio bigint primary key generated always as identity,
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
    hiv text COLLATE pg_catalog."default",
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
   
    CONSTRAINT tbl_laboratorios_idperlaboratorio_fkey FOREIGN KEY (idperlaboratorio)
        REFERENCES public.tbl_periodicidadlaboratorio (idperlaboratorio) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT tbl_laboratorios_noafiliacion_fkey FOREIGN KEY (no_afiliacion)
        REFERENCES public.tbl_pacientes (no_afiliacion) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tbl_laboratorios
    OWNER to postgres;


create table tbl_turnos (
  id_turno text primary key,
  no_afiliacion text references tbl_pacientes (no_afiliacion),
  id_clinica bigint references tbl_clinica (id_clinica),
  id_estado_turno bigint references tbl_estados_turno (id_estado_turno),
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

create table tbl_informes_psicologia (
  id_informe text primary key,
  no_afiliacion text references tbl_pacientes (no_afiliacion),
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

create table tbl_informe_nutricion (
  id_informe text primary key,
  no_afiliacion text references tbl_pacientes (no_afiliacion),
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

create table tbl_empleados (
  id_empleado bigint primary key generated always as identity,
  dpi char(13) unique not null,
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
  fecha_registro timestamp default current_timestamp,
  estado boolean default true,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

create table tbl_EmpleadosClinicas(
	id_empleado bigint references tbl_empleados (id_empleado), 	
	id_clinica bigint references tbl_clinica (id_clinica),
	usuario_creacion text,
	fecha_creacion timestamp,
	usuario_actualizacion text,
	fecha_actualizacion timestamp,
	usuario_eliminacion text,
	fecha_eliminacion timestamp,
  	primary key (id_empleado, id_clinica)
);

create table tbl_usuarios(
  id_usuario bigint primary key generated always as identity,
  nombre_usuario text unique not null,
  contrasenia text not null,
  id_empleado bigint references tbl_empleados (id_empleado),
  estado boolean default true,
  fecha_registro timestamp default current_timestamp,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

create table tbl_roles (
  id_rol bigint primary key generated always as identity,
  nombre text not null,
  descripcion text,
  estado boolean default true,
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp
);

create table tbl_usuario_rol (
  id_usuario bigint references tbl_usuarios (id_usuario),
  id_rol bigint references tbl_roles (id_rol),
  usuario_creacion text,
  fecha_creacion timestamp,
  usuario_actualizacion text,
  fecha_actualizacion timestamp,
  usuario_eliminacion text,
  fecha_eliminacion timestamp,
  primary key (id_usuario, id_rol)
);
END;
$$;