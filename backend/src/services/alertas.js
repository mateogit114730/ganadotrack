// Generación automática de alertas (CU14). Las alertas no se guardan: se calculan en cada
// consulta a partir de los datos actuales, por lo que siempre reflejan el estado real.
//   - SANITARIA: evento pendiente que vence en ≤ N días (parámetro, por defecto 7) o ya vencido.
//   - STOCK: insumo con stock por debajo del mínimo configurado.
//   - STOCK_PROYECTADO: al ritmo de consumo previsto, el insumo alcanza para menos días que el mínimo.
//   - GDP: lote activo cuya última GDP es menor a la GDP objetivo.

import { prisma } from '../config/prisma.js';
import { hoy, diasEntre, formatoISO } from '../utils/fechas.js';
import { diasAvisoSanitario } from './parametros.js';
import { proyeccionInsumos } from './proyeccionStock.js';

const ORDEN_SEVERIDAD = { alta: 0, media: 1 };

/**
 * Clasifica un evento sanitario pendiente según su fecha programada.
 * @returns 'VENCIDO' si la fecha ya pasó, 'PROXIMO' si faltan ≤ diasAviso días, o null.
 */
export function clasificarEventoSanitario(fechaProgramada, fechaHoy, diasAviso) {
  const faltan = diasEntre(fechaHoy, fechaProgramada);
  if (faltan < 0) return 'VENCIDO';
  if (faltan <= diasAviso) return 'PROXIMO';
  return null;
}

async function alertasSanitarias(fechaHoy, db) {
  const diasAviso = await diasAvisoSanitario(db);
  const eventos = await db.eventoSanitario.findMany({
    where: { estado: 'PENDIENTE', lote: { estado: 'ACTIVO' } },
    include: { lote: { select: { id: true, nombre: true } } },
    orderBy: { fechaProgramada: 'asc' },
  });

  return eventos.flatMap((e) => {
    const clase = clasificarEventoSanitario(e.fechaProgramada, fechaHoy, diasAviso);
    if (!clase) return [];
    const faltan = diasEntre(fechaHoy, e.fechaProgramada);
    const cuando =
      clase === 'VENCIDO'
        ? `venció hace ${-faltan} día(s)`
        : faltan === 0
          ? 'es hoy'
          : `vence en ${faltan} día(s)`;
    return [
      {
        id: `SANITARIA-${e.id}`,
        tipo: 'SANITARIA',
        severidad: clase === 'VENCIDO' ? 'alta' : 'media',
        titulo: clase === 'VENCIDO' ? 'Evento sanitario vencido' : 'Próximo evento sanitario',
        mensaje: `${e.nombre} – ${e.lote.nombre}: ${cuando} (${formatoISO(e.fechaProgramada)})`,
        loteId: e.lote.id,
        eventoId: e.id,
        fecha: e.fechaProgramada,
      },
    ];
  });
}

async function alertasStock(db) {
  const insumos = await db.insumo.findMany({ orderBy: { nombre: 'asc' } });
  return insumos
    .filter((i) => Number(i.stockKg) < Number(i.stockMinimoKg))
    .map((i) => ({
      id: `STOCK-${i.id}`,
      tipo: 'STOCK',
      severidad: Number(i.stockKg) === 0 ? 'alta' : 'media',
      titulo: 'Stock bajo el mínimo',
      mensaje: `${i.nombre}: quedan ${Number(i.stockKg).toLocaleString('es-AR')} kg (mínimo ${Number(i.stockMinimoKg).toLocaleString('es-AR')} kg)`,
      insumoId: i.id,
    }));
}

async function alertasProyeccion(db) {
  const [insumos, proyeccion] = await Promise.all([db.insumo.findMany({ orderBy: { nombre: 'asc' } }), proyeccionInsumos(db)]);
  return insumos
    // Si ya está bajo el mínimo, la alerta de STOCK lo informa: no se duplica.
    .filter((i) => proyeccion.get(i.id).coberturaBaja && Number(i.stockKg) >= Number(i.stockMinimoKg))
    .map((i) => {
      const p = proyeccion.get(i.id);
      return {
        id: `STOCK_PROYECTADO-${i.id}`,
        tipo: 'STOCK_PROYECTADO',
        severidad: p.diasCobertura <= 3 ? 'alta' : 'media',
        titulo: 'El stock no alcanza',
        mensaje: `${i.nombre}: alcanza para ${p.diasCobertura} día(s) (hasta el ${formatoISO(p.fechaQuiebre)}). Compra sugerida: ${p.compraSugeridaKg.toLocaleString('es-AR')} kg`,
        insumoId: i.id,
      };
    });
}

async function alertasGdp(db) {
  const lotes = await db.lote.findMany({
    where: { estado: 'ACTIVO' },
    include: { pesadas: { orderBy: { fecha: 'desc' }, take: 1 } },
  });
  return lotes
    .filter((l) => l.pesadas.length > 0 && Number(l.pesadas[0].gdp) < Number(l.gdpObjetivo))
    .map((l) => ({
      id: `GDP-${l.id}`,
      tipo: 'GDP',
      severidad: 'media',
      titulo: 'GDP por debajo del objetivo',
      mensaje: `${l.nombre}: GDP ${Number(l.pesadas[0].gdp).toFixed(3)} kg/día (objetivo ${Number(l.gdpObjetivo).toFixed(3)})`,
      loteId: l.id,
      fecha: l.pesadas[0].fecha,
    }));
}

/**
 * Devuelve las alertas vigentes visibles para el rol.
 * El veterinario solo ve alertas sanitarias (RF08).
 */
export async function generarAlertas(rol, db = prisma) {
  const fechaHoy = hoy();
  const grupos =
    rol === 'VETERINARIO'
      ? [await alertasSanitarias(fechaHoy, db)]
      : await Promise.all([alertasSanitarias(fechaHoy, db), alertasStock(db), alertasProyeccion(db), alertasGdp(db)]);

  return grupos.flat().sort((a, b) => ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad]);
}
