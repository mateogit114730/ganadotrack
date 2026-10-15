-- La suma de bajas (SUM de int) devuelve bigint en PostgreSQL, que no se serializa a JSON.
-- Se recrea la vista con cabezas_actuales como int.
DROP VIEW "v_resumen_lote";

CREATE VIEW "v_resumen_lote" AS
SELECT
  l."id"                                                          AS lote_id,
  l."nombre",
  l."estado",
  l."fecha_ingreso",
  l."cantidad_inicial",
  (l."cantidad_inicial" - COALESCE(b.total_bajas, 0))::int        AS cabezas_actuales,
  COALESCE(p."peso_promedio", l."peso_ingreso")                   AS peso_actual,
  p."fecha"                                                       AS fecha_ultima_pesada,
  p."gdp"                                                         AS ultima_gdp,
  COALESCE(a.costo_alimentacion, 0)                               AS costo_alimentacion,
  COALESCE(s.costo_sanitario, 0)                                  AS costo_sanitario,
  COALESCE(a.costo_alimentacion, 0) + COALESCE(s.costo_sanitario, 0) AS costo_total
FROM "lote" l
LEFT JOIN (
  SELECT "lote_id", SUM("cantidad")::int AS total_bajas
  FROM "baja" GROUP BY "lote_id"
) b ON b."lote_id" = l."id"
LEFT JOIN (
  SELECT "lote_id", SUM("costo") AS costo_alimentacion
  FROM "registro_alimentacion" GROUP BY "lote_id"
) a ON a."lote_id" = l."id"
LEFT JOIN (
  SELECT "lote_id", SUM("costo") AS costo_sanitario
  FROM "evento_sanitario" WHERE "estado" = 'REALIZADO' GROUP BY "lote_id"
) s ON s."lote_id" = l."id"
LEFT JOIN LATERAL (
  SELECT "peso_promedio", "fecha", "gdp"
  FROM "pesada" WHERE "lote_id" = l."id"
  ORDER BY "fecha" DESC LIMIT 1
) p ON TRUE;
