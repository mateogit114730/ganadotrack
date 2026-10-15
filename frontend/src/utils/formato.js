// Formatos de presentación (es-AR). Las fechas de negocio llegan como 'AAAA-MM-DDT00:00:00Z'
// y se muestran en UTC para que no se corran un día por la zona horaria.

const numero = (decimales) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

export const fmtNumero = (v, decimales = 0) => (v === null || v === undefined ? '—' : numero(decimales).format(v));

export const fmtMoneda = (v) =>
  v === null || v === undefined
    ? '—'
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

export const fmtMonedaDecimales = (v) =>
  v === null || v === undefined
    ? '—'
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(v);

export const fmtKg = (v, decimales = 0) => (v === null || v === undefined ? '—' : `${fmtNumero(v, decimales)} kg`);

/** El silaje se guarda en kg y se muestra en toneladas. */
export const fmtToneladas = (kg) => (kg === null || kg === undefined ? '—' : `${fmtNumero(kg / 1000, 1)} t`);

export const fmtGdp = (v) => (v === null || v === undefined ? '—' : `${fmtNumero(v, 3)} kg/día`);

export const fmtFecha = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/** Fecha de hoy en formato AAAA-MM-DD (hora local), para los campos de fecha. */
export const hoyISO = () => new Date().toLocaleDateString('en-CA');

export const ETIQUETAS = {
  rol: { ADMIN: 'Administrador', ENCARGADO: 'Encargado', VETERINARIO: 'Veterinario' },
  tipoEvento: { VACUNA: 'Vacuna', ANTIPARASITARIO: 'Antiparasitario', GARRAPATA: 'Tratamiento de garrapata', OTRO: 'Otro' },
  causaBaja: { ENFERMEDAD: 'Enfermedad', ACCIDENTE: 'Accidente', SEQUIA: 'Sequía', OTRA: 'Otra' },
  tipoInsumo: { SUPLEMENTO: 'Suplemento', SILAJE: 'Silaje' },
};
