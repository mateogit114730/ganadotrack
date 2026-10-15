import * as servicio from './pesadas.service.js';

export async function registrar(req, res) {
  res.status(201).json(await servicio.registrar(req.body, req.usuario.id));
}

export async function listar(req, res) {
  res.json(await servicio.listar(req.datosQuery));
}

export async function eliminarUltima(req, res) {
  res.json(await servicio.eliminarUltima(req.datosParams.id));
}
