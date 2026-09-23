import { asegurarEsquema, sql } from "@/server/db";

/* Recibe los eventos de src/shared/lib/registro.ts. Todo se valida contra
   listas cerradas y se recorta: el endpoint es público. */

const TIPOS = new Set(["visita", "contacto", "lead"]);
const FUENTES = new Set(["meta", "tiktok", "google", "otro", "directo"]);
const CLAVES_DATOS = ["motivo", "inicial", "ubicacion", "paso"] as const;
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit/i;

const texto = (v: unknown, max = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function POST(req: Request) {
  if (!sql) return new Response(null, { status: 204 });
  if (BOTS.test(req.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });

  let cuerpo: Record<string, unknown>;
  try {
    const crudo = await req.text();
    if (crudo.length > 2000) return new Response(null, { status: 413 });
    cuerpo = JSON.parse(crudo);
  } catch {
    return new Response(null, { status: 400 });
  }

  const tipo = texto(cuerpo.tipo);
  const visitante = texto(cuerpo.visitante, 64);
  if (!tipo || !TIPOS.has(tipo) || !visitante) return new Response(null, { status: 400 });

  const fuente = FUENTES.has(String(cuerpo.fuente)) ? String(cuerpo.fuente) : "directo";

  let datos: Record<string, string> | null = null;
  if (tipo === "lead" && cuerpo.datos && typeof cuerpo.datos === "object") {
    const d = cuerpo.datos as Record<string, unknown>;
    datos = Object.fromEntries(CLAVES_DATOS.map((k) => [k, texto(d[k]) ?? ""]));
  }

  try {
    await asegurarEsquema(sql);
    await sql`
      INSERT INTO eventos (tipo, visitante, fuente, campana, origen, movil, datos)
      VALUES (${tipo}, ${visitante}, ${fuente}, ${texto(cuerpo.campana)}, ${texto(cuerpo.origen, 30)},
              ${cuerpo.movil === true}, ${datos ? sql.json(datos) : null})`;
  } catch (e) {
    console.error("[eventos] no se pudo guardar", e);
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 204 });
}
