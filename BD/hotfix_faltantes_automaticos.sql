-- Turnos en estado Creada cuya fecha ya paso (no se asignaron ese dia) -> Faltante,
-- y se registra la falta con el motivo automatico. Es idempotente: solo toca turnos Creada.
-- El motivo se arma con chr() para no depender de la codificacion del cliente:
-- 'No se present' + chr(243) + ' (Mensaje autom' + chr(225) + 'tico)'
CREATE OR REPLACE PROCEDURE public.sp_marcar_faltantes_automaticos(INOUT p_total integer DEFAULT 0)
LANGUAGE plpgsql AS $$
DECLARE
  v_creada bigint;
  v_faltante bigint;
  v_motivo text := 'No se present' || chr(243) || ' (Mensaje autom' || chr(225) || 'tico)';
BEGIN
  SELECT id_estado_turno INTO v_creada FROM public.tbl_estados_turno WHERE descripcion = 'Creada';
  SELECT id_estado_turno INTO v_faltante FROM public.tbl_estados_turno WHERE descripcion = 'Faltante';

  WITH vencidos AS (
    UPDATE public.tbl_turnos
       SET id_estado_turno = v_faltante,
           usuario_actualizacion = 'sistema',
           fecha_actualizacion = now()
     WHERE id_estado_turno = v_creada
       AND fecha_turno < CURRENT_DATE
    RETURNING no_afiliacion, id_clinica, fecha_turno
  ), faltas AS (
    INSERT INTO public.tbl_faltistas (no_afiliacion, id_clinica, fecha_falta, motivo_falta, usuario_creacion, fecha_creacion)
    SELECT no_afiliacion, id_clinica, fecha_turno, v_motivo, 'sistema', now()
      FROM vencidos
     WHERE no_afiliacion IS NOT NULL AND id_clinica IS NOT NULL
    ON CONFLICT DO NOTHING
  )
  SELECT count(*) INTO p_total FROM vencidos;
END;
$$;
