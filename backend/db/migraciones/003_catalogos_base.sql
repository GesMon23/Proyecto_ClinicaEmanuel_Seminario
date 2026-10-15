-- Catálogos que la aplicación necesita para funcionar y que 001 no crea: clínicas, jornadas,
-- departamentos de Guatemala y accesos vasculares (copiados de la base de desarrollo).
-- Se insertan por nombre: en una base nueva quedan con los ids 1..n en este orden, y en una base
-- que ya los tenga no se duplican.

INSERT INTO public.tbl_clinica (descripcion, estado, usuario_creacion, fecha_creacion)
SELECT v.descripcion, true, 'SISTEMA', now()
FROM (VALUES (1, 'HEMODIÁLISIS'), (2, 'NUTRICIÓN'), (3, 'PSICOLOGÍA')) AS v(orden, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM public.tbl_clinica c WHERE upper(c.descripcion) = v.descripcion)
ORDER BY v.orden;

INSERT INTO public.tbl_jornadas (descripcion, dias, estado, usuario_creacion, fecha_creacion)
SELECT v.descripcion, v.dias, true, 'SISTEMA', now()
FROM (VALUES
  (1, '1.L-M-V', 'LUNES, MIÉRCOLES, VIERNES'),
  (2, '2.L-M-V', 'LUNES, MIÉRCOLES, VIERNES'),
  (3, '1.M-J-S', 'MARTES, JUEVES, SÁBADO'),
  (4, '2.M-J-S', 'MARTES, JUEVES, SÁBADO')
) AS v(orden, descripcion, dias)
WHERE NOT EXISTS (SELECT 1 FROM public.tbl_jornadas j WHERE upper(j.descripcion) = v.descripcion)
ORDER BY v.orden;

INSERT INTO public.tbl_acceso_vascular (descripcion, estado, usuario_creacion, fecha_creacion)
SELECT v.descripcion, true, 'SISTEMA', now()
FROM (VALUES (1, 'CATÉTER TEMPORAL'), (2, 'CATÉTER PERMANENTE (PERMACAT)'), (3, 'FISTULA ARTERIOVENOSA')) AS v(orden, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM public.tbl_acceso_vascular a WHERE upper(a.descripcion) = v.descripcion)
ORDER BY v.orden;

INSERT INTO public.tbl_departamento (id_departamento, nombre) VALUES
  ('01', 'GUATEMALA'), ('02', 'EL PROGRESO'), ('03', 'SACATEPÉQUEZ'), ('04', 'CHIMALTENANGO'),
  ('05', 'ESCUINTLA'), ('06', 'SANTA ROSA'), ('07', 'SOLOLÁ'), ('08', 'TOTONICAPÁN'),
  ('09', 'QUETZALTENANGO'), ('10', 'SUCHITEPÉQUEZ'), ('11', 'RETALHULEU'), ('12', 'SAN MARCOS'),
  ('13', 'HUEHUETENANGO'), ('14', 'QUICHÉ'), ('15', 'BAJA VERAPAZ'), ('16', 'ALTA VERAPAZ'),
  ('17', 'PETÉN'), ('18', 'IZABAL'), ('19', 'ZACAPA'), ('20', 'CHIQUIMULA'),
  ('21', 'JALAPA'), ('22', 'JUTIAPA')
ON CONFLICT (id_departamento) DO NOTHING;
