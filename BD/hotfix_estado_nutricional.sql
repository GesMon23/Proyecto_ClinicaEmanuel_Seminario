-- Estado nutricional segun el IMC (clasificacion de la OMS).
-- sp_guardar_informe_nutricion calculaba el IMC pero nunca llenaba estado_nutricional, asi que
-- las consultas lo mostraban vacio y el dashboard agrupaba todo en "Sin clasificar".
-- Las categorias y sus limites son los mismos que src/utils/imc.js (CATEGORIAS_IMC).
-- Es idempotente: se puede correr mas de una vez.

CREATE OR REPLACE FUNCTION public.fn_clasificar_imc(p_imc numeric)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_imc IS NULL OR p_imc <= 0 THEN NULL
    WHEN p_imc < 18.5 THEN 'Bajo peso'
    WHEN p_imc < 25   THEN 'Saludable'
    WHEN p_imc < 30   THEN 'Sobrepeso'
    WHEN p_imc < 35   THEN 'Obesidad I'
    WHEN p_imc < 40   THEN 'Obesidad II'
    ELSE 'Obesidad III'
  END;
$$;

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
    id_informe, no_afiliacion, motivo_consulta, estado_nutricional, altura_cm, peso_kg, imc, observaciones,
    usuario_creacion, fecha_creacion
  ) VALUES (
    v_id, p_no_afiliacion, p_motivo_consulta, public.fn_clasificar_imc(v_imc), p_altura_cm, p_peso_kg, v_imc, p_observaciones,
    p_usuario_nombre, now()
  );

  OPEN ref FOR SELECT to_jsonb(t) AS result FROM public.tbl_informe_nutricion t WHERE id_informe = v_id;
END;
$$;

-- Informes guardados antes de este hotfix
UPDATE public.tbl_informe_nutricion
SET estado_nutricional = public.fn_clasificar_imc(imc)
WHERE imc IS NOT NULL AND COALESCE(estado_nutricional, '') = '';
