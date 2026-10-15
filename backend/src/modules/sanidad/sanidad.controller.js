import * as servicio from './sanidad.service.js';

export async function lotesActivos(req, res) {
  res.json(await servicio.lotesActivos());
}

export async function listarEventos(req, res) {
  res.json(await servicio.listarEventos(req.datosQuery));
}

export async function programar(req, res) {
  res.status(201).json(await servicio.programar(req.body));
}

export async function realizar(req, res) {
  res.json(await servicio.realizar(req.datosParams.id, req.body, req.usuario.id));
}

export async function registrarNoProgramado(req, res) {
  res.status(201).json(await servicio.registrarNoProgramado(req.body, req.usuario.id));
}

export async function eliminarPendiente(req, res) {
  res.json(await servicio.eliminarPendiente(req.datosParams.id));
}

export async function registrarBaja(req, res) {
  res.status(201).json(await servicio.registrarBaja(req.body, req.usuario.id));
}

export async function listarBajas(req, res) {
  res.json(await servicio.listarBajas(req.datosQuery));
}

export async function editarPendiente(req, res) {
  res.json(await servicio.editarPendiente(req.datosParams.id, req.body));
}

export async function eliminarBaja(req, res) {
  res.json(await servicio.eliminarBaja(req.datosParams.id));
}
