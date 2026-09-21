select * from tbl_usuarios

select *  from tbl_roles

insert into tbl_roles (nombre, descripcion, estado) values ('RolTurnos','Manejo de los turnos de los pacientes', true),('RolConsulta','Visualizar información del paciente', true), ('RolGestionPaciente','Manejar la gestión administrativa del paciente', true)
, ('RolReferencia','Registrar y Consulta de referenciasa clinicas del IGSS ', true) , ('RolNutricion','Registro de información de nutricion de paciente', true)
, ('RolPsicologia','Registro de información de psicologia de paciente', true), ('RolLaboratorio','Registro y consulta de información de laboratorios de pacientes', true)
, ('RolReportes','Generacion de reportes de la gestión e informacion clinica del paciente', true), ('RolTurnos','Manejo de los turnos de los pacientes', true)

select * from tbl_usuario_rol
insert into tbl_usuario_rol(id_usuario, id_rol) values (1,1),(1,2),(1,3),(1,4),(1,5),(1,6) ,(1,7),(1,8)

insert into tbl_usuario_rol(id_usuario, id_rol) values (3,1),(3,2)
