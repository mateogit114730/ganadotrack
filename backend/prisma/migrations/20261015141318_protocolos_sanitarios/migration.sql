-- CreateTable
CREATE TABLE "protocolo_sanitario" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(500),
    "por_defecto" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protocolo_sanitario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocolo_item" (
    "id" SERIAL NOT NULL,
    "protocolo_id" INTEGER NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "producto" VARCHAR(100),
    "dia_desde_ingreso" INTEGER NOT NULL,
    "repetir_cada_dias" INTEGER,
    "aplicaciones" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "protocolo_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "protocolo_sanitario_nombre_key" ON "protocolo_sanitario"("nombre");

-- CreateIndex
CREATE INDEX "protocolo_item_protocolo_id_idx" ON "protocolo_item"("protocolo_id");

-- AddForeignKey
ALTER TABLE "protocolo_item" ADD CONSTRAINT "protocolo_item_protocolo_id_fkey" FOREIGN KEY ("protocolo_id") REFERENCES "protocolo_sanitario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reglas de integridad (escritas a mano)
ALTER TABLE "protocolo_item"
  ADD CONSTRAINT "chk_item_dia" CHECK ("dia_desde_ingreso" >= 0 AND "dia_desde_ingreso" <= 365),
  ADD CONSTRAINT "chk_item_repeticion" CHECK ("repetir_cada_dias" IS NULL OR "repetir_cada_dias" > 0),
  ADD CONSTRAINT "chk_item_aplicaciones" CHECK ("aplicaciones" BETWEEN 1 AND 52),
  ADD CONSTRAINT "chk_item_repeticion_coherente" CHECK ("aplicaciones" = 1 OR "repetir_cada_dias" IS NOT NULL);

-- Un único protocolo marcado "por defecto" (índice único parcial).
CREATE UNIQUE INDEX "protocolo_unico_por_defecto" ON "protocolo_sanitario" ("por_defecto") WHERE "por_defecto";
