import * as servicio from './alimentacion.service.js';

export async function opciones(req, res) {
  res.json(await servicio.opciones());
}

export async function registrar(req, res) {
  const resultado = await servicio.registrar(req.body, req.usuario.id);
  res.status(resultado.repetido ? 200 : 201).json(resultado);
}

export async function listar(req, res) {
  res.json(await servicio.listar(req.datosQuery));
}

export async function eliminar(req, res) {
  res.json(await servicio.eliminar(req.datosParams.id));
}
