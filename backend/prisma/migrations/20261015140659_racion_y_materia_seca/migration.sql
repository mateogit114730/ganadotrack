-- AlterTable
ALTER TABLE "insumo" ADD COLUMN     "materia_seca_pct" DECIMAL(5,2) NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE "racion" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "kg_cabeza_dia" DECIMAL(8,3) NOT NULL,
    "vigente_desde" DATE NOT NULL,
    "usuario_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "racion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "racion_lote_id_insumo_id_vigente_desde_key" ON "racion"("lote_id", "insumo_id", "vigente_desde");

-- AddForeignKey
ALTER TABLE "racion" ADD CONSTRAINT "racion_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "racion" ADD CONSTRAINT "racion_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "racion" ADD CONSTRAINT "racion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Reglas de integridad (escritas a mano)
ALTER TABLE "racion"
  ADD CONSTRAINT "chk_racion_kg" CHECK ("kg_cabeza_dia" >= 0);
ALTER TABLE "insumo"
  ADD CONSTRAINT "chk_insumo_materia_seca" CHECK ("materia_seca_pct" > 0 AND "materia_seca_pct" <= 100);
