// Hooks del modo sin conexión e instalación de la app (RF14).
import { useCallback, useEffect, useState } from 'react';
import { leerCola, sincronizar, suscribir } from './colaAlimentacion.js';

/** true si el navegador tiene conexión. */
export function useEnLinea() {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine);
  useEffect(() => {
    const alCambiar = () => setEnLinea(navigator.onLine);
    window.addEventListener('online', alCambiar);
    window.addEventListener('offline', alCambiar);
    return () => {
      window.removeEventListener('online', alCambiar);
      window.removeEventListener('offline', alCambiar);
    };
  }, []);
  return enLinea;
}

/**
 * Estado de la cola offline. Sincroniza al montar y cada vez que vuelve la conexión.
 * alSincronizar se llama cuando se envió al menos una carga (para recargar los datos).
 */
export function useColaOffline(alSincronizar) {
  const [cola, setCola] = useState([]);
  const [sincronizando, setSincronizando] = useState(false);

  const enviar = useCallback(async () => {
    if (!navigator.onLine) return;
    setSincronizando(true);
    try {
      const { enviadas } = await sincronizar();
      if (enviadas > 0) alSincronizar?.(enviadas);
    } finally {
      setSincronizando(false);
    }
  }, [alSincronizar]);

  useEffect(() => {
    let vigente = true;
    leerCola().then((c) => vigente && setCola(c));
    const desuscribir = suscribir((c) => vigente && setCola(c));
    // La primera sincronización se difiere para no actualizar el estado dentro del efecto.
    const inicial = setTimeout(enviar, 0);
    window.addEventListener('online', enviar);
    return () => {
      vigente = false;
      clearTimeout(inicial);
      desuscribir();
      window.removeEventListener('online', enviar);
    };
  }, [enviar]);

  return { cola, sincronizando, sincronizar: enviar };
}

// El navegador ofrece instalar la app una sola vez por carga: se guarda el evento.
let eventoInstalacion = null;
const oyentesInstalacion = new Set();
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  eventoInstalacion = e;
  oyentesInstalacion.forEach((fn) => fn(true));
});
window.addEventListener('appinstalled', () => {
  eventoInstalacion = null;
  oyentesInstalacion.forEach((fn) => fn(false));
});

/** { disponible, instalar } para mostrar el botón "Instalar app". */
export function useInstalacion() {
  const [disponible, setDisponible] = useState(() => Boolean(eventoInstalacion));
  useEffect(() => {
    oyentesInstalacion.add(setDisponible);
    return () => oyentesInstalacion.delete(setDisponible);
  }, []);
  const instalar = useCallback(async () => {
    if (!eventoInstalacion) return;
    eventoInstalacion.prompt();
    await eventoInstalacion.userChoice;
    eventoInstalacion = null;
    setDisponible(false);
  }, []);
  return { disponible, instalar };
}
