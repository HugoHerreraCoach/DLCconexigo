import { esRastro } from "@/config/rastros";
import { sql } from "@/server/db";
import { huellaNombre, huellaTelefono } from "@/server/nombre-huella";
import { esPlantilla } from "@/shared/lib/plantillas";

/* Recibe los eventos de intención de src/shared/lib/registro.ts.
   Todo se valida contra listas cerradas y se recorta: el endpoint es público.
   REGLA DE SEGURIDAD:
   El endpoint público SOLO acepta intenciones ("visita", "contacto", "formulario_preparado", "lead").
   Cualquier intento de inyectar estados de confirmación ("confirmado", "recibido_en", "mensaje_id")
   es estrictamente rechazado (400). Jamás genera una conversión por sí mismo. */

const TIPOS = new Set(["visita", "contacto", "formulario_preparado", "lead"]);
const FUENTES = new Set(["meta", "tiktok", "google", "otro", "directo"]);
const CLAVES_DATOS = ["motivo", "inicial", "ubicacion", "paso"] as const;
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit/i;

const texto = (v: unknown, max = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function POST(req: Request) {
  if (BOTS.test(req.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });

  let cuerpo: Record<string, unknown>;
  try {
    const crudo = await req.text();
    if (crudo.length > 2000) return new Response(null, { status: 413 });
    cuerpo = JSON.parse(crudo);
  } catch {
    return new Response(null, { status: 400 });
  }

  // F1.7: Rechazo estricto si el payload público intenta simular confirmación o venta
  if (
    cuerpo.confirmado !== undefined ||
    cuerpo.recibido_en !== undefined ||
    cuerpo.mensaje_id !== undefined ||
    cuerpo.venta_en !== undefined ||
    cuerpo.venta !== undefined
  ) {
    return new Response(JSON.stringify({ error: "campo no permitido en registro público" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tipo = texto(cuerpo.tipo);
  const visitante = texto(cuerpo.visitante, 64);
  if (!tipo || !TIPOS.has(tipo) || !visitante) return new Response(null, { status: 400 });

  if (!sql) return new Response(null, { status: 204 });


  const fuente = FUENTES.has(String(cuerpo.fuente)) ? String(cuerpo.fuente) : "directo";
  // Qué elemento generó el evento: solo ids del catálogo (src/config/rastros.ts).
  const origen = tipo === "visita" ? null : esRastro(cuerpo.origen) ? cuerpo.origen : "sin-identificar";

  let datos: Record<string, string> | null = null;
  if ((tipo === "formulario_preparado" || tipo === "lead") && cuerpo.datos && typeof cuerpo.datos === "object") {
    const d = cuerpo.datos as Record<string, unknown>;
    datos = Object.fromEntries(CLAVES_DATOS.map((k) => [k, texto(d[k]) ?? ""]));
  }

  // Identificador de intención y deduplicación
  const intencionId = texto(cuerpo.intencion_id, 64);

  // Huellas HMAC para atribución segura sin almacenar PII en texto plano
  const plantilla = tipo !== "visita" && esPlantilla(cuerpo.plantilla) ? cuerpo.plantilla : null;
  const nombreHuella = tipo !== "visita" ? huellaNombre(cuerpo.nombre) : null;
  const telefonoHuella = tipo !== "visita" ? huellaTelefono(cuerpo.telefono) : null;

  try {
    // F1.4: Idempotencia en cliente / reintentos
    if (intencionId) {
      const [existente] = await sql`SELECT id FROM eventos WHERE intencion_id = ${intencionId} LIMIT 1`;
      if (existente) return new Response(null, { status: 204 });
    }

    await sql`
      INSERT INTO eventos (tipo, visitante, fuente, campana, origen, movil, datos, plantilla, nombre_huella, telefono_huella, intencion_id)
      VALUES (${tipo}, ${visitante}, ${fuente}, ${texto(cuerpo.campana)}, ${origen},
              ${cuerpo.movil === true}, ${datos ? sql.json(datos) : null}, ${plantilla}, ${nombreHuella}, ${telefonoHuella}, ${intencionId})`;
  } catch (e) {
    console.error("[eventos] no se pudo guardar", e);
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 204 });
}

