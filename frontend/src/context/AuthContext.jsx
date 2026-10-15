import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, sesion } from '../api/cliente.js';

const AuthContext = createContext(null);

// Pantalla de inicio de cada rol después de iniciar sesión.
export const INICIO_POR_ROL = {
  ADMIN: '/dashboard',
  ENCARGADO: '/alimentacion',
  VETERINARIO: '/sanidad',
};

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(Boolean(sesion.token()));

  // Si hay un token guardado, se recupera el usuario de la sesión. Sin conexión se usa
  // la copia guardada, para que el encargado pueda cargar la alimentación igual (RF14).
  useEffect(() => {
    if (!sesion.token()) return;
    api
      .get('/auth/me')
      .then(({ data }) => {
        sesion.guardarUsuario(data);
        setUsuario(data);
      })
      .catch((err) => {
        const guardado = sesion.usuario();
        if (!err.response && guardado) setUsuario(guardado);
        else sesion.borrar();
      })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    const alExpirar = () => setUsuario(null);
    window.addEventListener('sesion-expirada', alExpirar);
    return () => window.removeEventListener('sesion-expirada', alExpirar);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    sesion.guardar(data.token);
    sesion.guardarUsuario(data.usuario);
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  const logout = useCallback(() => {
    sesion.borrar();
    setUsuario(null);
  }, []);

  const actualizarUsuario = useCallback((datos) => {
    sesion.guardarUsuario(datos);
    setUsuario(datos);
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, login, logout, actualizarUsuario }),
    [usuario, cargando, login, logout, actualizarUsuario],
  );
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
