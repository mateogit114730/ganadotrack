import * as servicio from './reportes.service.js';

export async function costosLote(req, res) {
  res.json(await servicio.costosLote(req.datosParams.id));
}

export async function dashboard(req, res) {
  res.json(await servicio.dashboard());
}

export async function alertas(req, res) {
  res.json(await servicio.alertas(req.usuario.rol));
}
