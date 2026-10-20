import { INICIALES } from "@/config/contenido";
import { RASTROS } from "@/config/rastros";
import { sql } from "@/server/db";
import { agregarFila, configHoja, filaLead } from "@/server/hoja-calculo";
import { huellaNombre, huellaTelefono } from "@/server/nombre-huella";
import { nombreCampanaMeta } from "@/server/plataformas";
import { celularPeru, FORMULARIOS } from "@/shared/lib/formulario";

/* Formularios de registro (hero y chat flotante) → hoja de cálculo de leads
   (src/server/hoja-calculo.ts). La respuesta se agrega como fila en la hoja y
   SOLO cuando Google confirma la fila el navegador envía la conversión a los
   píxeles (clientePotencial en src/shared/lib/pixeles.ts), con este mismo id
   como id del evento, y después abre WhatsApp (docs/0023).

   Contrato
   ────────
   POST /api/formulario
   Cuerpo  { "id": "<uuid del envío>", "origen", "nombre", "celular", "inicial",
             "visitante", "fuente", "campana", "campana_id", "movil" }
           · origen ∈ FORMULARIOS (src/shared/lib/formulario.ts); si falta, "formulario-hero"
           · inicial ∈ INICIALES (src/config/contenido.ts) o INICIALES_ANTERIORES. Desde
             0023 es la única pregunta: un "compra" que llegue se ignora y TIEMPO DE
             COMPRA queda vacía.
           · campana = utm_campaign y campana_id = utm_id de la visita. A la columna
             «NOMBRE DE CAMPAÑA» va el nombre de la campaña (o su id, si no se conoce): Meta
             manda el id en utm_campaign y el nombre se pide a su API; TikTok manda el nombre
             en utm_campaign y el id en utm_id (macros __CAMPAIGN_NAME__ y __CAMPAIGN_ID__).
   200     { "ok": true, "id": "<id>" }        ← la fila quedó en la hoja (o ya estaba: mismo id)
   400 datos inválidos · 502 Google no confirmó la fila · 503 hoja sin configurar
   El panel lo cuenta como lead en `eventos` (tipo 'lead'), sin nombre ni celular en claro. */

const FUENTES = new Set(["meta", "tiktok", "google", "otro", "directo"]);
/** Opciones de 0017. Las pestañas abiertas antes de publicar 0023 todavía las
 *  mandan: se aceptan para no perder esos registros. Se puede quitar unos días
 *  después de publicar. */
const INICIALES_ANTERIORES = ["S/ 5,000 a S/ 10,000", "Más de S/ 10,000", "Pago al contado"] as const;
const INICIALES_VALIDAS = [...INICIALES, ...INICIALES_ANTERIORES];
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit/i;
const ID = /^[A-Za-z0-9_-]{8,64}$/;
/** Los ids de campaña de Meta y de TikTok son numéricos (18 y 16 dígitos). */
const ID_CAMPANA = /^\d{6,25}$/;

const texto = (v: unknown, max = 80) => (typeof v === "string" && v.trim() ? v.trim().replace(/\s+/g, " ").slice(0, max) : null);
const deLista = <T extends string>(lista: readonly T[], v: unknown) => lista.find((x) => x === v) ?? null;

export async function POST(req: Request) {
  if (BOTS.test(req.headers.get("user-agent") ?? "")) return Response.json({ ok: false }, { status: 403 });

  let cuerpo: Record<string, unknown>;
  try {
    const crudo = await req.text();
    if (crudo.length > 2000) return Response.json({ ok: false }, { status: 413 });
    cuerpo = JSON.parse(crudo);
    if (!cuerpo || typeof cuerpo !== "object") throw new Error("cuerpo no es un objeto");
  } catch {
    return Response.json({ ok: false, error: "json inválido" }, { status: 400 });
  }

  const id = typeof cuerpo.id === "string" && ID.test(cuerpo.id) ? cuerpo.id : null;
  const nombre = texto(cuerpo.nombre);
  const celular = celularPeru(cuerpo.celular);
  const inicial = deLista(INICIALES_VALIDAS, cuerpo.inicial);
  const origen = cuerpo.origen === undefined ? "formulario-hero" : deLista(FORMULARIOS, cuerpo.origen);
  if (!id || !origen || !nombre || nombre.length < 2 || !celular || !inicial)
    return Response.json({ ok: false, error: "datos inválidos" }, { status: 400 });

  const fuente = FUENTES.has(String(cuerpo.fuente)) ? String(cuerpo.fuente) : "directo";
  const campana = texto(cuerpo.campana);
  const campanaId = [texto(cuerpo.campana_id), campana].find((v) => v && ID_CAMPANA.test(v)) ?? null;
  const nombreUrl = campana && !ID_CAMPANA.test(campana) ? campana : null;

  const hoja = configHoja(fuente);
  if (!hoja) {
    console.error("[formulario] faltan GOOGLE_SHEETS_ID, GOOGLE_SHEETS_CLIENT_EMAIL o GOOGLE_SHEETS_PRIVATE_KEY");
    return Response.json({ ok: false, error: "hoja no configurada" }, { status: 503 });
  }

  // Se pide mientras se revisa si el envío es repetido; nunca falla (null si Meta no responde).
  const nombrePendiente =
    nombreUrl === null && fuente === "meta" && campanaId ? nombreCampanaMeta(campanaId) : Promise.resolve(nombreUrl);

  // Reintento del mismo envío (se perdió la respuesta): la fila ya está en la hoja.
  if (sql) {
    try {
      const [previo] = await sql`SELECT 1 FROM eventos WHERE intencion_id = ${id} LIMIT 1`;
      if (previo) return Response.json({ ok: true, id });
    } catch (e) {
      console.error("[formulario] no se pudo revisar si el envío era repetido", e);
    }
  }

  try {
    await agregarFila(
      hoja,
      filaLead({
        id,
        fecha: new Date(),
        nombre,
        celular,
        inicial,
        fuente,
        campana: (await nombrePendiente) ?? campanaId,
        origen: `Landing · ${RASTROS[origen].nombre}`,
      }),
    );
  } catch (e) {
    console.error("[formulario] no se pudo agregar la fila a la hoja", e);
    return Response.json({ ok: false, error: "no se pudo registrar" }, { status: 502 });
  }

  // Registro propio para el panel. Si falla, el lead ya está en la hoja: no se le dice al visitante que falló.
  if (sql) {
    try {
      await sql`
        INSERT INTO eventos (tipo, visitante, fuente, campana, origen, movil, datos, nombre_huella, telefono_huella, intencion_id)
        VALUES ('lead', ${texto(cuerpo.visitante, 64) ?? "desconocido"}, ${fuente}, ${campana}, ${origen}, ${cuerpo.movil === true},
                ${sql.json({ inicial })}, ${huellaNombre(nombre)}, ${huellaTelefono(celular)}, ${id})
        ON CONFLICT DO NOTHING`;
    } catch (e) {
      console.error("[formulario] la fila está en la hoja pero no se guardó en eventos", e);
    }
  }

  return Response.json({ ok: true, id });
}
