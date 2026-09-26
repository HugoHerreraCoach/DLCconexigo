import { esRastro, RASTROS } from "@/config/rastros";
import { asegurarEsquema, sql } from "@/server/db";
import { firmaValida } from "@/server/firma-conexigo";

/* Resumen para el reporte de atribución del CRM ConexiGO: solo esta landing
   sabe cuántos CLICS hubo (el CRM solo ve los mensajes que llegan). Devuelve
   clics y mensajes recibidos por fuente, campaña y elemento, para un rango de
   días en hora de Perú.

   Contrato
   ────────
   POST /api/whatsapp/resumen
   Cabecera  X-Conexigo-Firma: sha256=<HMAC-SHA256 hex del cuerpo crudo con CONEXIGO_WEBHOOK_SECRET>
   Cuerpo    { "desde": "2026-09-01", "hasta": "2026-09-26", "ts": 1790000000 }
             · desde/hasta: fechas (YYYY-MM-DD) en hora de Lima, ambas incluidas, máx. 366 días
             · ts: segundos Unix del momento de la llamada; se rechaza si difiere
               más de 5 minutos del reloj de la landing (evita repetir una llamada vieja)
   200       { "ok": true, "desde", "hasta", "zona": "America/Lima",
               "totales":   { "visitas", "clics", "formularios", "recibidos" },
               "por_fuente":  [{ "fuente", "visitas", "clics", "formularios", "recibidos" }],
               "por_campana": [{ "campana", "fuente", "clics", "formularios", "recibidos" }],
               "por_origen":  [{ "origen", "origen_nombre", "tipo", "clics", "recibidos" }] }
             · clics = clics a WhatsApp + formularios enviados (todo lo que abre WhatsApp)
             · formularios = solo formularios · recibidos = mensajes que el CRM confirmó
   400 cuerpo o fechas inválidas · 401 firma o ts incorrectos · 503 sin secreto o sin base */

const ZONA = "America/Lima";
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DIAS = 366;
const TOLERANCIA_S = 300;

type Conteos = { visitas: number; clics: number; formularios: number; recibidos: number };

export async function POST(req: Request) {
  const secreto = process.env.CONEXIGO_WEBHOOK_SECRET;
  if (!secreto || !sql) return Response.json({ ok: false, error: "no configurado" }, { status: 503 });

  const crudo = await req.text();
  if (crudo.length > 1000) return Response.json({ ok: false }, { status: 413 });
  if (!firmaValida(crudo, req.headers.get("x-conexigo-firma"), secreto)) return Response.json({ ok: false }, { status: 401 });

  let cuerpo: { desde?: unknown; hasta?: unknown; ts?: unknown };
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return Response.json({ ok: false, error: "json inválido" }, { status: 400 });
  }
  if (typeof cuerpo.ts !== "number" || Math.abs(Date.now() / 1000 - cuerpo.ts) > TOLERANCIA_S)
    return Response.json({ ok: false, error: "ts fuera de tiempo" }, { status: 401 });

  const { desde, hasta } = cuerpo;
  if (typeof desde !== "string" || typeof hasta !== "string" || !FECHA.test(desde) || !FECHA.test(hasta))
    return Response.json({ ok: false, error: "fechas inválidas (YYYY-MM-DD)" }, { status: 400 });
  const dias = (Date.parse(hasta) - Date.parse(desde)) / 86_400_000;
  if (!Number.isFinite(dias) || dias < 0 || dias > MAX_DIAS)
    return Response.json({ ok: false, error: `rango inválido (máx. ${MAX_DIAS} días)` }, { status: 400 });

  const db = sql;
  // Fragmentos nuevos en cada uso (un fragmento de postgres.js no se reutiliza).
  const rango = () => db`creado >= (${desde}::date)::timestamp AT TIME ZONE ${ZONA}
                     AND creado <  (${hasta}::date + 1)::timestamp AT TIME ZONE ${ZONA}`;
  const conteos = () => db`
    count(*) FILTER (WHERE tipo = 'visita')::int              AS visitas,
    count(*) FILTER (WHERE tipo IN ('contacto', 'lead'))::int AS clics,
    count(*) FILTER (WHERE tipo = 'lead')::int                AS formularios,
    count(*) FILTER (WHERE recibido_en IS NOT NULL)::int      AS recibidos`;

  try {
    await asegurarEsquema(db);
    // En secuencia, como el panel: no dependen de la tubería de la conexión.
    const [totales] = await db<Conteos[]>`SELECT ${conteos()} FROM eventos WHERE ${rango()}`;
    const porFuente = await db<(Conteos & { fuente: string })[]>`
      SELECT fuente, ${conteos()} FROM eventos WHERE ${rango()} GROUP BY fuente ORDER BY clics DESC, visitas DESC`;
    const porCampana = await db<(Conteos & { campana: string; fuente: string })[]>`
      SELECT campana, fuente, ${conteos()} FROM eventos WHERE ${rango()} AND campana IS NOT NULL
      GROUP BY campana, fuente ORDER BY clics DESC LIMIT 50`;
    const porOrigen = await db<{ origen: string; tipo: string; clics: number; recibidos: number }[]>`
      SELECT coalesce(origen, 'sin-identificar') AS origen, tipo, count(*)::int AS clics,
             count(*) FILTER (WHERE recibido_en IS NOT NULL)::int AS recibidos
      FROM eventos WHERE ${rango()} AND tipo IN ('contacto', 'lead')
      GROUP BY 1, 2 ORDER BY clics DESC`;

    return Response.json({
      ok: true,
      desde,
      hasta,
      zona: ZONA,
      totales,
      por_fuente: porFuente.map(({ visitas, clics, formularios, recibidos, fuente }) => ({ fuente, visitas, clics, formularios, recibidos })),
      por_campana: porCampana.map(({ campana, fuente, clics, formularios, recibidos }) => ({ campana, fuente, clics, formularios, recibidos })),
      por_origen: porOrigen.map((o) => ({
        origen: o.origen,
        origen_nombre: esRastro(o.origen) ? RASTROS[o.origen].nombre : o.origen,
        tipo: o.tipo,
        clics: o.clics,
        recibidos: o.recibidos,
      })),
    });
  } catch (e) {
    console.error("[whatsapp/resumen] no se pudo calcular", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
