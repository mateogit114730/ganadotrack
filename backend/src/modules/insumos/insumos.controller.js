import * as servicio from './insumos.service.js';

export async function listar(req, res) {
  res.json(await servicio.listar());
}

export async function actualizar(req, res) {
  res.json(await servicio.actualizar(req.datosParams.id, req.body));
}

export async function registrarCompra(req, res) {
  res.status(201).json(await servicio.registrarCompra(req.datosParams.id, req.body, req.usuario.id));
}

export async function listarCompras(req, res) {
  res.json(await servicio.listarCompras(req.datosParams.id));
}

export async function editarCompra(req, res) {
  const { id, compraId } = req.datosParams;
  res.json(await servicio.editarCompra(id, compraId, req.body));
}
