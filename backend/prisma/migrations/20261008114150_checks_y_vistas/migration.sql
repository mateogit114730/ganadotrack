-- Migración escrita a mano: reglas de integridad que Prisma no expresa en schema.prisma.
-- 1) Restricciones CHECK  2) Vista de resumen por lote  3) Trigger que bloquea registros en lotes cerrados.

-- ============================================================
-- 1. Restricciones CHECK
-- ============================================================
ALTER TABLE "lote"
  ADD CONSTRAINT "chk_lote_cantidad" CHECK ("cantidad_inicial" > 0),
  ADD CONSTRAINT "chk_lote_peso_ingreso" CHECK ("peso_ingreso" > 0),
  ADD CONSTRAINT "chk_lote_peso_objetivo" CHECK ("peso_objetivo" > "peso_ingreso"),
  ADD CONSTRAINT "chk_lote_gdp_objetivo" CHECK ("gdp_objetivo" > 0),
  ADD CONSTRAINT "chk_lote_precio_venta" CHECK ("precio_venta_kg" IS NULL OR "precio_venta_kg" > 0),
  ADD CONSTRAINT "chk_lote_fecha_cierre" CHECK ("fecha_cierre" IS NULL OR "fecha_cierre" >= "fecha_ingreso"),
  ADD CONSTRAINT "chk_lote_cierre_completo" CHECK ("estado" <> 'CERRADO' OR "fecha_cierre" IS NOT NULL);

ALTER TABLE "insumo"
  ADD CONSTRAINT "chk_insumo_stock" CHECK ("stock_kg" >= 0),
  ADD CONSTRAINT "chk_insumo_stock_minimo" CHECK ("stock_minimo_kg" >= 0),
  ADD CONSTRAINT "chk_insumo_precio" CHECK ("precio_kg" >= 0);

ALTER TABLE "compra_insumo"
  ADD CONSTRAINT "chk_compra_cantidad" CHECK ("cantidad_kg" > 0),
  ADD CONSTRAINT "chk_compra_precio" CHECK ("precio_total" >= 0);

ALTER TABLE "registro_alimentacion"
  ADD CONSTRAINT "chk_alimentacion_kg" CHECK ("kg" > 0),
  ADD CONSTRAINT "chk_alimentacion_costo" CHECK ("costo" >= 0);

ALTER TABLE "pesada"
  ADD CONSTRAINT "chk_pesada_peso" CHECK ("peso_promedio" > 0);

ALTER TABLE "evento_sanitario"
  ADD CONSTRAINT "chk_evento_costo" CHECK ("costo" >= 0),
  ADD CONSTRAINT "chk_evento_duracion" CHECK ("duracion_dias" IS NULL OR "duracion_dias" > 0),
  ADD CONSTRAINT "chk_evento_realizado" CHECK ("estado" <> 'REALIZADO' OR "fecha_realizada" IS NOT NULL);

ALTER TABLE "baja"
  ADD CONSTRAINT "chk_baja_cantidad" CHECK ("cantidad" > 0);

-- ============================================================
-- 2. Vista v_resumen_lote
--    Concentra los acumulados que usan el dashboard y el módulo de costos (RF06, RF07).
-- ============================================================
CREATE VIEW "v_resumen_lote" AS
SELECT
  l."id"                                                          AS lote_id,
  l."nombre",
  l."estado",
  l."fecha_ingreso",
  l."cantidad_inicial",
  l."cantidad_inicial" - COALESCE(b.total_bajas, 0)               AS cabezas_actuales,
  COALESCE(p."peso_promedio", l."peso_ingreso")                   AS peso_actual,
  p."fecha"                                                       AS fecha_ultima_pesada,
  p."gdp"                                                         AS ultima_gdp,
  COALESCE(a.costo_alimentacion, 0)                               AS costo_alimentacion,
  COALESCE(s.costo_sanitario, 0)                                  AS costo_sanitario,
  COALESCE(a.costo_alimentacion, 0) + COALESCE(s.costo_sanitario, 0) AS costo_total
FROM "lote" l
LEFT JOIN (
  SELECT "lote_id", SUM("cantidad") AS total_bajas
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

-- ============================================================
-- 3. Trigger: no se permiten registros nuevos en un lote CERRADO.
--    La API ya lo valida; el trigger es una segunda barrera a nivel de base de datos.
-- ============================================================
CREATE FUNCTION "fn_validar_lote_activo"() RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "lote" WHERE "id" = NEW."lote_id" AND "estado" = 'CERRADO') THEN
    RAISE EXCEPTION 'El lote % está cerrado y no admite nuevos registros', NEW."lote_id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_alimentacion_lote_activo" BEFORE INSERT ON "registro_alimentacion"
  FOR EACH ROW EXECUTE FUNCTION "fn_validar_lote_activo"();
CREATE TRIGGER "trg_pesada_lote_activo" BEFORE INSERT ON "pesada"
  FOR EACH ROW EXECUTE FUNCTION "fn_validar_lote_activo"();
CREATE TRIGGER "trg_baja_lote_activo" BEFORE INSERT ON "baja"
  FOR EACH ROW EXECUTE FUNCTION "fn_validar_lote_activo"();
