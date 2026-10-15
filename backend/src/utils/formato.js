// Formatos de presentación (es-AR) usados en los reportes PDF.
import { formatoISO } from './fechas.js';

const vacio = (v) => v === null || v === undefined;
const numero = (decimales) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

export const fmtNumero = (v, decimales = 0) => (vacio(v) ? '-' : numero(decimales).format(Number(v)));
export const fmtKg = (v, decimales = 0) => (vacio(v) ? '-' : `${fmtNumero(v, decimales)} kg`);
export const fmtMoneda = (v, decimales = 0) => (vacio(v) ? '-' : `$ ${fmtNumero(v, decimales)}`);
export const fmtGdp = (v) => (vacio(v) ? '-' : `${fmtNumero(v, 3)} kg/día`);

/** Date o 'AAAA-MM-DD' → 'DD/MM/AAAA'. */
export function fmtFecha(fecha) {
  if (vacio(fecha)) return '-';
  const [a, m, d] = formatoISO(fecha).split('-');
  return `${d}/${m}/${a}`;
}

export const ETIQUETAS = {
  tipoEvento: { VACUNA: 'Vacuna', ANTIPARASITARIO: 'Antiparasitario', GARRAPATA: 'Garrapata', OTRO: 'Otro' },
  causaBaja: { ENFERMEDAD: 'Enfermedad', ACCIDENTE: 'Accidente', SEQUIA: 'Sequía', OTRA: 'Otra' },
  estadoLote: { ACTIVO: 'Activo', CERRADO: 'Cerrado' },
};
