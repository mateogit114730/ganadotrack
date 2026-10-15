import * as servicio from './protocolos.service.js';

export async function listar(req, res) {
  res.json(await servicio.listar());
}

export async function crear(req, res) {
  res.status(201).json(await servicio.crear(req.body));
}

export async function actualizar(req, res) {
  res.json(await servicio.actualizar(req.datosParams.id, req.body));
}

export async function eliminar(req, res) {
  res.json(await servicio.eliminar(req.datosParams.id));
}

export async function aplicarALote(req, res) {
  res.status(201).json(await servicio.aplicarALote(req.datosParams.loteId, req.body));
}
