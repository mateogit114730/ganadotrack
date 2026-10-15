-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'ENCARGADO', 'VETERINARIO');

-- CreateEnum
CREATE TYPE "EstadoLote" AS ENUM ('ACTIVO', 'CERRADO');

-- CreateEnum
CREATE TYPE "TipoInsumo" AS ENUM ('SUPLEMENTO', 'SILAJE');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('VACUNA', 'ANTIPARASITARIO', 'GARRAPATA', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoEvento" AS ENUM ('PENDIENTE', 'REALIZADO');

-- CreateEnum
CREATE TYPE "CausaBaja" AS ENUM ('ENFERMEDAD', 'ACCIDENTE', 'SEQUIA', 'OTRA');

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(100) NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lote" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "fecha_ingreso" DATE NOT NULL,
    "cantidad_inicial" INTEGER NOT NULL,
    "peso_ingreso" DECIMAL(7,2) NOT NULL,
    "peso_objetivo" DECIMAL(7,2) NOT NULL,
    "gdp_objetivo" DECIMAL(5,3) NOT NULL,
    "precio_venta_kg" DECIMAL(12,2),
    "estado" "EstadoLote" NOT NULL DEFAULT 'ACTIVO',
    "fecha_cierre" DATE,
    "peso_final" DECIMAL(7,2),
    "observaciones" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insumo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "tipo" "TipoInsumo" NOT NULL,
    "stock_kg" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stock_minimo_kg" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "precio_kg" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compra_insumo" (
    "id" SERIAL NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "cantidad_kg" DECIMAL(12,2) NOT NULL,
    "precio_total" DECIMAL(14,2) NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compra_insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_alimentacion" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "kg" DECIMAL(10,2) NOT NULL,
    "precio_kg" DECIMAL(12,2) NOT NULL,
    "costo" DECIMAL(14,2) NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_alimentacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pesada" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "peso_promedio" DECIMAL(7,2) NOT NULL,
    "gdp" DECIMAL(6,3) NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pesada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento_sanitario" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "producto" VARCHAR(100),
    "fecha_programada" DATE NOT NULL,
    "estado" "EstadoEvento" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_realizada" DATE,
    "dosis" VARCHAR(60),
    "costo" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "duracion_dias" INTEGER,
    "observaciones" VARCHAR(500),
    "usuario_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_sanitario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baja" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "causa" "CausaBaja" NOT NULL,
    "observaciones" VARCHAR(500),
    "usuario_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "baja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametro" (
    "clave" VARCHAR(50) NOT NULL,
    "valor" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(200),

    CONSTRAINT "parametro_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "lote_nombre_key" ON "lote"("nombre");

-- CreateIndex
CREATE INDEX "lote_estado_idx" ON "lote"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "insumo_nombre_key" ON "insumo"("nombre");

-- CreateIndex
CREATE INDEX "compra_insumo_insumo_id_fecha_idx" ON "compra_insumo"("insumo_id", "fecha");

-- CreateIndex
CREATE INDEX "registro_alimentacion_lote_id_fecha_idx" ON "registro_alimentacion"("lote_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "registro_alimentacion_lote_id_insumo_id_fecha_key" ON "registro_alimentacion"("lote_id", "insumo_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "pesada_lote_id_fecha_key" ON "pesada"("lote_id", "fecha");

-- CreateIndex
CREATE INDEX "evento_sanitario_estado_fecha_programada_idx" ON "evento_sanitario"("estado", "fecha_programada");

-- CreateIndex
CREATE INDEX "evento_sanitario_lote_id_idx" ON "evento_sanitario"("lote_id");

-- CreateIndex
CREATE INDEX "baja_lote_id_idx" ON "baja"("lote_id");

-- AddForeignKey
ALTER TABLE "compra_insumo" ADD CONSTRAINT "compra_insumo_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_insumo" ADD CONSTRAINT "compra_insumo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_alimentacion" ADD CONSTRAINT "registro_alimentacion_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_alimentacion" ADD CONSTRAINT "registro_alimentacion_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_alimentacion" ADD CONSTRAINT "registro_alimentacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesada" ADD CONSTRAINT "pesada_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesada" ADD CONSTRAINT "pesada_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_sanitario" ADD CONSTRAINT "evento_sanitario_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_sanitario" ADD CONSTRAINT "evento_sanitario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baja" ADD CONSTRAINT "baja_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baja" ADD CONSTRAINT "baja_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
