import * as servicio from './auth.service.js';

export async function login(req, res) {
  res.json(await servicio.login(req.body));
}

export async function me(req, res) {
  res.json(await servicio.usuarioActual(req.usuario.id));
}

export async function actualizarPerfil(req, res) {
  res.json(await servicio.actualizarPerfil(req.usuario.id, req.body));
}

export async function cambiarPassword(req, res) {
  res.json(await servicio.cambiarPassword(req.usuario.id, req.body));
}
