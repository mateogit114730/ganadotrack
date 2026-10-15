-- Identificador de envío para sincronizar sin duplicar las cargas hechas sin conexión (RF14).
-- La columna admite nulos (registros previos), por lo que el índice único no afecta a los datos existentes.
ALTER TABLE "registro_alimentacion" ADD COLUMN "operacion_id" VARCHAR(36);

CREATE UNIQUE INDEX "registro_alimentacion_operacion_id_insumo_id_key"
  ON "registro_alimentacion"("operacion_id", "insumo_id");
