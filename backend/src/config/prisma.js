import { PrismaClient, Prisma } from '@prisma/client';

// Los campos DECIMAL llegan como objetos Prisma.Decimal; en las respuestas JSON
// se envían como número (por defecto se enviarían como texto).
Prisma.Decimal.prototype.toJSON = function toJSON() {
  return this.toNumber();
};

export const prisma = new PrismaClient();
export { Prisma };
