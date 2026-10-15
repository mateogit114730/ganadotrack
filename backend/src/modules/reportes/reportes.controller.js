import * as servicio from './reportes.service.js';
import * as documentos from './documentos.js';
import { obtenerLote } from '../lotes/lotes.service.js';
import { formatoISO, hoy } from '../../utils/fechas.js';

export async function costosLote(req, res) {
  res.json(await servicio.costosLote(req.datosParams.id));
}

export async function dashboard(req, res) {
  res.json(await servicio.dashboard());
}

export async function alertas(req, res) {
  res.json(await servicio.alertas(req.usuario.rol));
}

// ---- Reportes descargables ----

/** Nombre de archivo seguro: sin acentos ni caracteres especiales. */
const nombreArchivo = (texto) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

function enviarArchivo(res, buffer, nombre, tipo) {
  res.setHeader('Content-Type', tipo);
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
  res.send(buffer);
}

const PDF = 'application/pdf';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function informeLote(req, res) {
  const lote = await obtenerLote(req.datosParams.id);
  const buffer = await documentos.informeLote(lote.id);
  enviarArchivo(res, buffer, `informe-${nombreArchivo(lote.nombre)}.pdf`, PDF);
}

export async function reporteMensual(req, res) {
  const mes = req.datosQuery.mes ?? formatoISO(hoy()).slice(0, 7);
  enviarArchivo(res, await documentos.reporteMensual(mes), `reporte-mensual-${mes}.pdf`, PDF);
}

export async function planillaExcel(req, res) {
  const buffer = await documentos.planillaExcel(req.datosQuery);
  enviarArchivo(res, buffer, `ganadotrack-planilla-${formatoISO(hoy())}.xlsx`, XLSX);
}
