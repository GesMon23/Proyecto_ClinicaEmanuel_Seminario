-- Últimos parámetros de laboratorio de un paciente: antes devolvía solo los del laboratorio más reciente y sin fecha.
-- Si ese laboratorio fue "no realizado" (sin parámetros) se perdían todos los valores anteriores, y la columna
-- "Fecha Lab." del detalle y la fecha de cada valor en el formulario salían vacías.
-- Ahora: el valor más reciente de cada parámetro, con la fecha del laboratorio de donde viene.

CREATE OR REPLACE PROCEDURE public.sp_laboratorios_parametros_ultimo(
  IN p_no_afiliacion text, INOUT ref refcursor
) LANGUAGE plpgsql AS $$
BEGIN
  OPEN ref FOR
    SELECT * FROM (
      SELECT DISTINCT ON (lower(pl.parametro)) pl.*, l.fecha_laboratorio
      FROM public.tbl_parametros_laboratorio pl
      JOIN public.tbl_laboratorios l ON l.idlaboratorio = pl.idlaboratorio
      WHERE l.no_afiliacion = p_no_afiliacion AND pl.valor IS NOT NULL AND pl.valor <> ''
      ORDER BY lower(pl.parametro), l.fecha_laboratorio DESC, l.idlaboratorio DESC, pl.idparametro DESC
    ) ultimos
    ORDER BY ultimos.idparametro;
END;
$$;
