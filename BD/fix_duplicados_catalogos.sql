-- Limpia los catalogos duplicados por recargar esquema_reconstruido.sql sin
-- restricciones UNIQUE, y agrega esas restricciones para que no vuelva a pasar.

BEGIN;

DELETE FROM tbl_usuario_rol
WHERE id_usuario = (SELECT id_usuario FROM tbl_usuarios WHERE nombre_usuario = 'gemonzov');

DELETE FROM tbl_roles a USING tbl_roles b
WHERE a.id_rol > b.id_rol AND a.nombre = b.nombre;

DELETE FROM tbl_estados_turno a USING tbl_estados_turno b
WHERE a.id_estado_turno > b.id_estado_turno AND a.descripcion = b.descripcion;

DELETE FROM tbl_estados_paciente a USING tbl_estados_paciente b
WHERE a.id_estado > b.id_estado AND a.descripcion = b.descripcion;

DELETE FROM tbl_causa_egreso a USING tbl_causa_egreso b
WHERE a.id_causa > b.id_causa AND a.descripcion = b.descripcion;

ALTER TABLE tbl_roles ADD CONSTRAINT tbl_roles_nombre_key UNIQUE (nombre);
ALTER TABLE tbl_estados_turno ADD CONSTRAINT tbl_estados_turno_descripcion_key UNIQUE (descripcion);
ALTER TABLE tbl_estados_paciente ADD CONSTRAINT tbl_estados_paciente_descripcion_key UNIQUE (descripcion);
ALTER TABLE tbl_causa_egreso ADD CONSTRAINT tbl_causa_egreso_descripcion_key UNIQUE (descripcion);

INSERT INTO tbl_usuario_rol (id_usuario, id_rol)
SELECT (SELECT id_usuario FROM tbl_usuarios WHERE nombre_usuario = 'gemonzov'), id_rol
FROM tbl_roles;

COMMIT;
