// Descarga de archivos generados por la API (reportes PDF y Excel).
import { api } from '../api/cliente.js';

/** Nombre del archivo indicado por el servidor en Content-Disposition. */
function nombreDesdeEncabezado(encabezado, porDefecto) {
  const coincidencia = /filename="?([^";]+)"?/i.exec(encabezado ?? '');
  return coincidencia ? coincidencia[1] : porDefecto;
}

/**
 * Pide el archivo con el token de la sesión y lo guarda en el dispositivo.
 * Si la API responde con error, el cuerpo (que llega como Blob) se convierte a JSON
 * para que mensajeError() muestre el mensaje real.
 */
export async function descargar(url, { params, nombre = 'archivo' } = {}) {
  try {
    const respuesta = await api.get(url, { params, responseType: 'blob' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(respuesta.data);
    enlace.download = nombreDesdeEncabezado(respuesta.headers['content-disposition'], nombre);
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 10_000);
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await err.response.data.text());
      } catch {
        // Cuerpo no JSON: se deja como está.
      }
    }
    throw err;
  }
}
