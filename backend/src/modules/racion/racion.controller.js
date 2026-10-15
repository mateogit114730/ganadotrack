import * as servicio from './racion.service.js';

export async function listarActivos(req, res) {
  res.json(await servicio.listarActivos());
}

export async function obtener(req, res) {
  res.json(await servicio.obtener(req.datosParams.loteId));
}

export async function guardar(req, res) {
  res.json(await servicio.guardar(req.datosParams.loteId, req.body, req.usuario.id));
}
