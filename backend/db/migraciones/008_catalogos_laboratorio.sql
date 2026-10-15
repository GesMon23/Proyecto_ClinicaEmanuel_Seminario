-- Periodicidades de laboratorio. El formulario de Laboratorios envía 1 = Mensual, 2 = Trimestral, 3 = Semestral
-- (src/components/laboratorioParametros/parametros.js), pero ninguna migración creaba el catálogo: en una base nueva
-- guardar un laboratorio fallaba por la llave foránea. Se insertan en ese orden para que reciban esos ids.

INSERT INTO public.tbl_periodicidadlaboratorio (descripcion, estado, usuario_creacion, fecha_creacion)
SELECT v.descripcion, true, 'SISTEMA', now()
FROM (VALUES (1, 'Mensual'), (2, 'Trimestral'), (3, 'Semestral')) AS v(orden, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM public.tbl_periodicidadlaboratorio p WHERE lower(p.descripcion) = lower(v.descripcion))
ORDER BY v.orden;
