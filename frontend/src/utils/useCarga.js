import { useCallback, useEffect, useRef, useState } from 'react';
import { mensajeError } from '../api/cliente.js';

/**
 * Ejecuta una consulta a la API y expone { datos, cargando, error, recargar }.
 * La consulta se repite cuando cambia alguna dependencia o al llamar a recargar().
 */
export function useCarga(consulta, dependencias = []) {
  const [version, setVersion] = useState(0);
  const [estado, setEstado] = useState({ clave: null, datos: null, error: null });
  const consultaActual = useRef(consulta);

  useEffect(() => {
    consultaActual.current = consulta;
  });

  const clave = `${JSON.stringify(dependencias)}#${version}`;

  useEffect(() => {
    let vigente = true; // evita actualizar el estado con una respuesta vieja
    consultaActual
      .current()
      .then((datos) => vigente && setEstado({ clave, datos, error: null }))
      .catch((err) => vigente && setEstado({ clave, datos: null, error: mensajeError(err) }));
    return () => {
      vigente = false;
    };
  }, [clave]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  return { datos: estado.datos, error: estado.error, cargando: estado.clave !== clave, recargar };
}
