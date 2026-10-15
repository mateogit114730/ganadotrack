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

  // Si hay un token guardado, se recupera el usuario de la sesión.
  useEffect(() => {
    if (!sesion.token()) return;
    api
      .get('/auth/me')
      .then(({ data }) => setUsuario(data))
      .catch(() => sesion.borrar())
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
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  const logout = useCallback(() => {
    sesion.borrar();
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, login, logout, actualizarUsuario: setUsuario }),
    [usuario, cargando, login, logout],
  );
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
