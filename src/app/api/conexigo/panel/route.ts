import { RASTROS } from "@/config/rastros";
import { SITIO } from "@/config/sitio";
import { firmaValida } from "@/server/firma-conexigo";
import { RANGOS, obtenerMetricas } from "@/server/metricas";
import { campanasMeta, estadisticasTikTok } from "@/server/plataformas";

/* Datos del panel (/panel) para el CRM ConexiGO, que los muestra en
   Marketing → Pixel. Son exactamente los mismos que ve /panel: registro propio,
   campañas de Meta y píxel de TikTok, más el catálogo de rastros para poner
   nombre a cada botón o formulario.

   Contrato
   ────────
   POST /api/conexigo/panel
   Cabecera  X-Conexigo-Firma: sha256=<HMAC-SHA256 hex del cuerpo crudo con CONEXIGO_WEBHOOK_SECRET>
   Cuerpo    { "dias": 7, "ts": 1790000000 }
             · dias: 1 | 7 | 30 | 90 (los mismos períodos del panel; días en hora de Lima)
             · ts: segundos Unix; se rechaza si difiere más de 5 min del reloj de la landing
   200       { "ok": true, "dias": 7,
               "sitio":   { "proyecto": "Finca Algarrobo", "url": "…" },
               "metricas": ResultadoMetricas   (src/server/metricas.ts: { estado: "ok", datos } | { estado: "sin-bd" } | { estado: "error", mensaje }),
               "meta":     ResultadoCampanasMeta (src/server/plataformas.ts),
               "tiktok":   Plataforma            (src/server/plataformas.ts),
               "rastros":  { [id]: { nombre, tipo, seccion } } }
   400 cuerpo inválido · 401 firma o ts incorrectos · 503 sin secreto

   Solo lectura. Los formularios traen motivo/inicial/ubicación/paso, nunca nombre
   ni celular (la landing no los guarda). */

const TOLERANCIA_S = 300;

export async function POST(req: Request) {
  const secreto = process.env.CONEXIGO_WEBHOOK_SECRET;
  if (!secreto) return Response.json({ ok: false, error: "no configurado" }, { status: 503 });

  const crudo = await req.text();
  if (crudo.length > 500) return Response.json({ ok: false }, { status: 413 });
  if (!firmaValida(crudo, req.headers.get("x-conexigo-firma"), secreto)) return Response.json({ ok: false }, { status: 401 });

  let cuerpo: { dias?: unknown; ts?: unknown };
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return Response.json({ ok: false, error: "json inválido" }, { status: 400 });
  }
  if (typeof cuerpo.ts !== "number" || Math.abs(Date.now() / 1000 - cuerpo.ts) > TOLERANCIA_S)
    return Response.json({ ok: false, error: "ts fuera de tiempo" }, { status: 401 });

  const dias = RANGOS.find((r) => r.dias === cuerpo.dias)?.dias;
  if (!dias) return Response.json({ ok: false, error: `dias debe ser ${RANGOS.map((r) => r.dias).join(", ")}` }, { status: 400 });

  // Las tres fuentes en paralelo, como /panel: cada una ya maneja sus errores.
  const [metricas, meta, tiktok] = await Promise.all([obtenerMetricas(dias), campanasMeta(dias), estadisticasTikTok(dias)]);

  return Response.json({
    ok: true,
    dias,
    sitio: { proyecto: SITIO.proyecto, url: SITIO.url },
    metricas,
    meta,
    tiktok,
    rastros: RASTROS,
  });
}
