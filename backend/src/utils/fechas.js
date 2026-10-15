// Utilidades de fechas. Las fechas de negocio (ingreso, pesada, evento) son días calendario
// sin hora: se representan como Date a las 00:00 UTC, igual que las columnas DATE de PostgreSQL.

const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Convierte 'AAAA-MM-DD' (o un Date) en un Date a las 00:00 UTC. */
export function aFecha(valor) {
  if (valor instanceof Date) return new Date(Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate()));
  return new Date(`${valor}T00:00:00.000Z`);
}

/** Fecha de hoy según la hora de Argentina. */
export function hoy() {
  const texto = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(new Date());
  return aFecha(texto);
}

/** Días calendario entre dos fechas (hasta − desde). */
export function diasEntre(desde, hasta) {
  return Math.round((aFecha(hasta) - aFecha(desde)) / MS_POR_DIA);
}

export function sumarDias(fecha, dias) {
  return new Date(aFecha(fecha).getTime() + dias * MS_POR_DIA);
}

/** Date → 'AAAA-MM-DD'. */
export function formatoISO(fecha) {
  return fecha ? aFecha(fecha).toISOString().slice(0, 10) : null;
}
