// Error de negocio con código HTTP. Lo captura el middleware errorHandler.
export class AppError extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

export const noEncontrado = (entidad) => new AppError(404, `${entidad} no encontrado`);
export const conflicto = (mensaje) => new AppError(409, mensaje);
export const solicitudInvalida = (mensaje, detalles) => new AppError(400, mensaje, detalles);
