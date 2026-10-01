import "server-only";
import { asegurarEsquema, sql } from "@/server/db";

/* Consultas del panel sobre la tabla `eventos`. Los días se cortan en hora de
   Perú (America/Lima), no en UTC, para que "hoy" sea el hoy del cliente. */

const ZONA = "America/Lima";

export const RANGOS = [
  { dias: 1, etiqueta: "Hoy" },
  { dias: 7, etiqueta: "7 días" },
  { dias: 30, etiqueta: "30 días" },
  { dias: 90, etiqueta: "90 días" },
] as const;

/** `recibidos`: clics y formularios cuyo mensaje de WhatsApp llegó de verdad (lo confirma el CRM).
 *  `ventas`: prospectos que cerraron compra confirmados por el CRM. */
export type Totales = { visitas: number; visitantes: number; contactos: number; leads: number; recibidos: number; ventas: number; movil: number };
export type Dia = { dia: string; visitas: number; contactos: number; leads: number };
export type FilaFuente = { fuente: string; visitas: number; visitantes: number; contactos: number; leads: number; recibidos: number; ventas: number };
export type FilaCampana = FilaFuente & { campana: string };
/** Cuántos eventos generó cada elemento del catálogo src/config/rastros.ts. */
export type FilaOrigen = { origen: string; tipo: "contacto" | "lead"; total: number; recibidos: number };
export type Lead = { creado: string; fuente: string; campana: string | null; origen: string | null; datos: Record<string, string> | null };

export type Metricas = {
  totales: Totales;
  anteriores: Totales;
  dias: Dia[];
  fuentes: FilaFuente[];
  campanas: FilaCampana[];
  origenes: FilaOrigen[];
  leads: Lead[];
};

export type ParametroRango = number | { desde: string; hasta: string };

export type ResultadoMetricas = { estado: "ok"; datos: Metricas } | { estado: "sin-bd" } | { estado: "error"; mensaje: string };

export async function obtenerMetricas(rango: ParametroRango): Promise<ResultadoMetricas> {
  if (!sql) return { estado: "sin-bd" };
  const db = sql;
  // Fragmento nuevo en cada uso: un fragmento de postgres.js es una consulta y no se reutiliza.
  const conteos = () => db`
    count(*) FILTER (WHERE tipo = 'visita')::int                  AS visitas,
    count(DISTINCT visitante) FILTER (WHERE tipo = 'visita')::int AS visitantes,
    count(*) FILTER (WHERE tipo = 'contacto')::int                AS contactos,
    count(*) FILTER (WHERE tipo = 'lead')::int                    AS leads,
    count(*) FILTER (WHERE recibido_en IS NOT NULL)::int          AS recibidos,
    count(*) FILTER (WHERE venta_en IS NOT NULL OR tipo = 'venta')::int AS ventas`;
  try {
    await asegurarEsquema(db);

    const esObj = typeof rango === "object";
    const desdeStr = esObj ? rango.desde : null;
    const hastaStr = esObj ? rango.hasta : null;
    const dias = typeof rango === "number" ? rango : 7;

    // Inicio del rango y del período anterior.
    // Se filtran los datos de prueba anteriores al inicio oficial (30-09-2026).
    const [{ desde, hasta, antes }] = esObj
      ? await db<{ desde: Date; hasta: Date; antes: Date }[]>`
          SELECT greatest((${desdeStr}::date)::timestamp AT TIME ZONE ${ZONA}, '2026-09-30 00:00:00-05'::timestamptz) AS desde,
                 ((${hastaStr}::date + interval '1 day'))::timestamp AT TIME ZONE ${ZONA} AS hasta,
                 ((${desdeStr}::date - interval '1 day' * (greatest((${hastaStr}::date - ${desdeStr}::date), 0) + 1)))::timestamp AT TIME ZONE ${ZONA} AS antes`
      : await db<{ desde: Date; hasta: Date; antes: Date }[]>`
          SELECT greatest((date_trunc('day', now() AT TIME ZONE ${ZONA}) - make_interval(days => ${dias - 1})) AT TIME ZONE ${ZONA}, '2026-09-30 00:00:00-05'::timestamptz) AS desde,
                 (date_trunc('day', now() AT TIME ZONE ${ZONA}) + interval '1 day') AT TIME ZONE ${ZONA} AS hasta,
                 (date_trunc('day', now() AT TIME ZONE ${ZONA}) - make_interval(days => ${2 * dias - 1})) AT TIME ZONE ${ZONA} AS antes`;

    // Consultas acotadas entre desde y hasta
    const totales = await db<Totales[]>`SELECT ${conteos()}, count(*) FILTER (WHERE tipo = 'visita' AND movil)::int AS movil
                    FROM eventos WHERE creado >= ${desde} AND creado < ${hasta}`;
    const anteriores = await db<Totales[]>`SELECT ${conteos()}, count(*) FILTER (WHERE tipo = 'visita' AND movil)::int AS movil
                    FROM eventos WHERE creado >= ${antes} AND creado < ${desde}`;
    const porDia = await db<Dia[]>`
        WITH d AS (
          SELECT generate_series(date_trunc('day', ${desde}),
                                 date_trunc('day', ${hasta} - interval '1 second'), interval '1 day') AS dia
        )
        SELECT to_char(d.dia, 'YYYY-MM-DD') AS dia,
               count(e.id) FILTER (WHERE e.tipo = 'visita')::int   AS visitas,
               count(e.id) FILTER (WHERE e.tipo = 'contacto')::int AS contactos,
               count(e.id) FILTER (WHERE e.tipo = 'lead')::int     AS leads
        FROM d LEFT JOIN eventos e
          ON date_trunc('day', e.creado AT TIME ZONE ${ZONA}) = d.dia AND e.creado >= ${desde} AND e.creado < ${hasta}
        GROUP BY d.dia ORDER BY d.dia`;
    const fuentes = await db<FilaFuente[]>`SELECT fuente, ${conteos()} FROM eventos WHERE creado >= ${desde} AND creado < ${hasta}
                       GROUP BY fuente ORDER BY visitas DESC, leads DESC`;
    const campanas = await db<FilaCampana[]>`SELECT campana, fuente, ${conteos()} FROM eventos
                        WHERE creado >= ${desde} AND creado < ${hasta} AND campana IS NOT NULL
                        GROUP BY campana, fuente ORDER BY leads DESC, contactos DESC, visitas DESC LIMIT 20`;
    const origenes = await db<FilaOrigen[]>`SELECT coalesce(origen, 'sin-identificar') AS origen, tipo, count(*)::int AS total,
                              count(*) FILTER (WHERE recibido_en IS NOT NULL)::int AS recibidos
                       FROM eventos WHERE creado >= ${desde} AND creado < ${hasta} AND tipo IN ('contacto', 'lead')
                       GROUP BY 1, 2 ORDER BY total DESC`;
    const leads = await db<Lead[]>`SELECT to_char(creado AT TIME ZONE ${ZONA}, 'YYYY-MM-DD HH24:MI') AS creado, fuente, campana, origen, datos
                 FROM eventos WHERE creado >= ${desde} AND creado < ${hasta} AND tipo = 'lead'
                 ORDER BY eventos.creado DESC LIMIT 25`;

    return {
      estado: "ok",
      datos: {
        totales: totales[0],
        anteriores: anteriores[0],
        dias: [...porDia],
        fuentes: [...fuentes],
        campanas: [...campanas],
        origenes: [...origenes],
        leads: [...leads],
      },
    };
  } catch (e) {
    console.error("[panel] error al consultar métricas", e);
    return { estado: "error", mensaje: e instanceof Error ? e.message : String(e) };
  }
}
