// Cliente HTTP de la API. Agrega el token a cada petición, guarda el token renovado
// que envía el servidor y cierra la sesión si el token venció.
import axios from 'axios';

const CLAVE_TOKEN = 'ganadotrack.token';

export const sesion = {
  token: () => localStorage.getItem(CLAVE_TOKEN),
  guardar: (token) => localStorage.setItem(CLAVE_TOKEN, token),
  borrar: () => localStorage.removeItem(CLAVE_TOKEN),
};

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' });

api.interceptors.request.use((config) => {
  const token = sesion.token();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (respuesta) => {
    const renovado = respuesta.headers['x-token-renovado'];
    if (renovado) sesion.guardar(renovado);
    return respuesta;
  },
  (error) => {
    const esLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !esLogin) {
      sesion.borrar();
      window.dispatchEvent(new Event('sesion-expirada'));
    }
    return Promise.reject(error);
  },
);

/** Texto legible de un error de la API, incluyendo el detalle de validación por campo. */
export function mensajeError(error) {
  const datos = error.response?.data;
  if (!error.response) return 'No se pudo conectar con el servidor. Verifique la conexión a internet.';
  if (datos?.detalles?.length) return `${datos.error}: ${datos.detalles.map((d) => d.mensaje).join('. ')}`;
  return datos?.error ?? 'Ocurrió un error inesperado';
}
