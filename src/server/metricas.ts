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

export type Totales = { visitas: number; visitantes: number; contactos: number; leads: number; movil: number };
export type Dia = { dia: string; visitas: number; contactos: number; leads: number };
export type FilaFuente = { fuente: string; visitas: number; visitantes: number; contactos: number; leads: number };
export type FilaCampana = FilaFuente & { campana: string };
/** Cuántos eventos generó cada elemento del catálogo src/config/rastros.ts. */
export type FilaOrigen = { origen: string; tipo: "contacto" | "lead"; total: number };
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

export type ResultadoMetricas = { estado: "ok"; datos: Metricas } | { estado: "sin-bd" } | { estado: "error"; mensaje: string };

export async function obtenerMetricas(dias: number): Promise<ResultadoMetricas> {
  if (!sql) return { estado: "sin-bd" };
  const db = sql;
  // Fragmento nuevo en cada uso: un fragmento de postgres.js es una consulta y no se reutiliza.
  const conteos = () => db`
    count(*) FILTER (WHERE tipo = 'visita')::int                  AS visitas,
    count(DISTINCT visitante) FILTER (WHERE tipo = 'visita')::int AS visitantes,
    count(*) FILTER (WHERE tipo = 'contacto')::int                AS contactos,
    count(*) FILTER (WHERE tipo = 'lead')::int                    AS leads`;
  try {
    await asegurarEsquema(db);

    // Inicio del rango (medianoche de Lima de hace dias-1 días) y del período anterior, para comparar.
    const [{ desde, antes }] = await db<{ desde: Date; antes: Date }[]>`
      SELECT (date_trunc('day', now() AT TIME ZONE ${ZONA}) - make_interval(days => ${dias - 1})) AT TIME ZONE ${ZONA} AS desde,
             (date_trunc('day', now() AT TIME ZONE ${ZONA}) - make_interval(days => ${2 * dias - 1})) AT TIME ZONE ${ZONA} AS antes`;

    // En secuencia y no con Promise.all: son consultas pequeñas y así no dependen
    // de que el servidor acepte varias en tubería por la misma conexión.
    const totales = await db<Totales[]>`SELECT ${conteos()}, count(*) FILTER (WHERE tipo = 'visita' AND movil)::int AS movil
                    FROM eventos WHERE creado >= ${desde}`;
    const anteriores = await db<Totales[]>`SELECT ${conteos()}, count(*) FILTER (WHERE tipo = 'visita' AND movil)::int AS movil
                    FROM eventos WHERE creado >= ${antes} AND creado < ${desde}`;
    const porDia = await db<Dia[]>`
        WITH d AS (
          SELECT generate_series(date_trunc('day', ${desde}::timestamptz AT TIME ZONE ${ZONA}),
                                 date_trunc('day', now() AT TIME ZONE ${ZONA}), interval '1 day') AS dia
        )
        SELECT to_char(d.dia, 'YYYY-MM-DD') AS dia,
               count(e.id) FILTER (WHERE e.tipo = 'visita')::int   AS visitas,
               count(e.id) FILTER (WHERE e.tipo = 'contacto')::int AS contactos,
               count(e.id) FILTER (WHERE e.tipo = 'lead')::int     AS leads
        FROM d LEFT JOIN eventos e
          ON date_trunc('day', e.creado AT TIME ZONE ${ZONA}) = d.dia AND e.creado >= ${desde}
        GROUP BY d.dia ORDER BY d.dia`;
    const fuentes = await db<FilaFuente[]>`SELECT fuente, ${conteos()} FROM eventos WHERE creado >= ${desde}
                       GROUP BY fuente ORDER BY visitas DESC, leads DESC`;
    const campanas = await db<FilaCampana[]>`SELECT campana, fuente, ${conteos()} FROM eventos
                        WHERE creado >= ${desde} AND campana IS NOT NULL
                        GROUP BY campana, fuente ORDER BY leads DESC, contactos DESC, visitas DESC LIMIT 20`;
    const origenes = await db<FilaOrigen[]>`SELECT coalesce(origen, 'sin-identificar') AS origen, tipo, count(*)::int AS total
                       FROM eventos WHERE creado >= ${desde} AND tipo IN ('contacto', 'lead')
                       GROUP BY 1, 2 ORDER BY total DESC`;
    const leads = await db<Lead[]>`SELECT to_char(creado AT TIME ZONE ${ZONA}, 'YYYY-MM-DD HH24:MI') AS creado, fuente, campana, origen, datos
                 FROM eventos WHERE creado >= ${desde} AND tipo = 'lead'
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
