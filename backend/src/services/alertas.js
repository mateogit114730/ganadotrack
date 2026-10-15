// Generación automática de alertas (CU14). Las alertas no se guardan: se calculan en cada
// consulta a partir de los datos actuales, por lo que siempre reflejan el estado real.
//   - SANITARIA: evento pendiente que vence en ≤ N días (parámetro, por defecto 7) o ya vencido.
//   - STOCK: insumo con stock por debajo del mínimo configurado.
//   - STOCK_PROYECTADO: al ritmo de consumo previsto, el insumo alcanza para menos días que el mínimo.
//   - GDP: lote activo cuya última GDP es menor a la GDP objetivo.
//   - CLIMA: estrés térmico previsto, riesgo alto de garrapata en lotes sin tratamiento reciente
//     y riesgo de sequía (orientativas; si el servicio de clima no responde, se omiten).

import { prisma } from '../config/prisma.js';
import { hoy, diasEntre, formatoISO, sumarDias } from '../utils/fechas.js';
import { diasAvisoSanitario } from './parametros.js';
import { proyeccionInsumos } from './proyeccionStock.js';
import { obtenerClima } from './clima.js';

const DIAS_SIN_TRATAMIENTO_GARRAPATA = 21;

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

/** Alertas derivadas del clima. El veterinario recibe solo las sanitarias (estrés térmico y garrapata). */
async function alertasClima(fechaHoy, db, rol) {
  const clima = await obtenerClima(db);
  if (!clima.disponible) return [];
  const { estresTermico, garrapata, sequia } = clima.riesgos;
  const alertas = [];

  if (estresTermico.nivel === 'peligro' || estresTermico.nivel === 'emergencia') {
    alertas.push({
      id: 'CLIMA-ESTRES',
      tipo: 'CLIMA',
      severidad: estresTermico.nivel === 'emergencia' ? 'alta' : 'media',
      titulo: 'Riesgo de estrés térmico',
      mensaje: `Índice de temperatura y humedad en nivel de ${estresTermico.nivel} para el ${estresTermico.dia}: asegurar sombra y agua fresca, y evitar el manejo en las horas de calor`,
    });
  }

  if (garrapata.nivel === 'alto') {
    const lotes = await db.lote.findMany({
      where: { estado: 'ACTIVO' },
      select: {
        id: true,
        nombre: true,
        eventos: {
          where: { tipo: 'GARRAPATA', estado: 'REALIZADO', fechaRealizada: { gte: sumarDias(fechaHoy, -DIAS_SIN_TRATAMIENTO_GARRAPATA) } },
          select: { id: true },
        },
      },
    });
    for (const lote of lotes.filter((l) => l.eventos.length === 0)) {
      alertas.push({
        id: `CLIMA-GARRAPATA-${lote.id}`,
        tipo: 'CLIMA',
        severidad: 'media',
        titulo: 'Riesgo alto de garrapata',
        mensaje: `${lote.nombre}: sin tratamiento en los últimos ${DIAS_SIN_TRATAMIENTO_GARRAPATA} días (temperatura media ${garrapata.temperaturaMedia7} °C, humedad ${garrapata.humedadMedia7} %)`,
        loteId: lote.id,
      });
    }
  }

  if (rol !== 'VETERINARIO' && sequia.nivel === 'alto') {
    const [silos, proyeccion] = await Promise.all([db.insumo.findMany({ where: { tipo: 'SILAJE' } }), proyeccionInsumos(db)]);
    const cobertura = silos
      .map((s) => proyeccion.get(s.id).diasCobertura)
      .filter((d) => d !== null)
      .map((d) => ` El silaje alcanza para ${d} día(s).`)
      .join('');
    alertas.push({
      id: 'CLIMA-SEQUIA',
      tipo: 'CLIMA',
      severidad: 'media',
      titulo: 'Riesgo de sequía',
      mensaje: `Llovieron ${sequia.lluvia30} mm en 30 días y se pronostican ${sequia.lluviaPronostico7} mm para la semana.${cobertura} Conviene planificar compras de alimento.`,
    });
  }
  return alertas;
}

/**
 * Devuelve las alertas vigentes visibles para el rol.
 * El veterinario solo ve alertas sanitarias y de clima sanitario (RF08).
 */
export async function generarAlertas(rol, db = prisma) {
  const fechaHoy = hoy();
  const grupos =
    rol === 'VETERINARIO'
      ? await Promise.all([alertasSanitarias(fechaHoy, db), alertasClima(fechaHoy, db, rol)])
      : await Promise.all([
          alertasSanitarias(fechaHoy, db),
          alertasStock(db),
          alertasProyeccion(db),
          alertasGdp(db),
          alertasClima(fechaHoy, db, rol),
        ]);

  return grupos.flat().sort((a, b) => ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad]);
}
