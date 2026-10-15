import * as servicio from './lotes.service.js';

export async function listar(req, res) {
  res.json(await servicio.listar(req.datosQuery));
}

export async function detalle(req, res) {
  res.json(await servicio.detalle(req.datosParams.id));
}

export async function crear(req, res) {
  res.status(201).json(await servicio.crear(req.body));
}

export async function actualizar(req, res) {
  res.json(await servicio.actualizar(req.datosParams.id, req.body));
}

export async function cerrar(req, res) {
  res.json(await servicio.cerrar(req.datosParams.id, req.body));
}
