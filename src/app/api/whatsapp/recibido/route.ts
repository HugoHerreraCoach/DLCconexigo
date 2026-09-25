import { createHmac, timingSafeEqual } from "node:crypto";
import { esRastro, RASTROS } from "@/config/rastros";
import { asegurarEsquema, sql } from "@/server/db";
import { PATRON_REFERENCIA } from "@/shared/lib/whatsapp";

/* Aviso del CRM ConexiGO: "llegó a WhatsApp un mensaje con Ref: FA-XXXXX".
   Marca ese clic como recibido y devuelve su atribución, para que el CRM se la
   muestre al asesor en la ficha del lead.

   Contrato
   ────────
   POST /api/whatsapp/recibido
   Cabecera  X-Conexigo-Firma: sha256=<HMAC-SHA256 hex del cuerpo crudo con CONEXIGO_WEBHOOK_SECRET>
   Cuerpo    { "codigo": "FA-7K3QX", "recibido_en": "2026-09-25T15:00:00Z" }   (recibido_en opcional)
   200       { "ok": true, "encontrado": true, "atribucion": {
                 "tipo": "contacto" | "lead", "origen": "formulario-hero",
                 "origen_nombre": "Formulario de solicitud de información de terreno",
                 "fuente": "meta", "campana": "web-finca-algarrobo" | null,
                 "clic_en": "2026-09-25T14:58:10.000Z" } }
             { "ok": true, "encontrado": false }   ← código válido pero no es de esta landing
   400 cuerpo inválido · 401 firma incorrecta · 503 sin secreto o sin base

   Es idempotente: si Meta reintenta y el CRM avisa dos veces, se conserva la
   primera hora de llegada. */

type Fila = { tipo: "contacto" | "lead"; origen: string | null; fuente: string; campana: string | null; creado: Date };

function firmaValida(crudo: string, cabecera: string | null, secreto: string) {
  const esperada = Buffer.from(`sha256=${createHmac("sha256", secreto).update(crudo).digest("hex")}`);
  const recibida = Buffer.from(cabecera ?? "");
  return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
}

export async function POST(req: Request) {
  const secreto = process.env.CONEXIGO_WEBHOOK_SECRET;
  if (!secreto || !sql) return Response.json({ ok: false, error: "no configurado" }, { status: 503 });

  const crudo = await req.text();
  if (crudo.length > 2000) return Response.json({ ok: false }, { status: 413 });
  if (!firmaValida(crudo, req.headers.get("x-conexigo-firma"), secreto)) return Response.json({ ok: false }, { status: 401 });

  let cuerpo: { codigo?: unknown; recibido_en?: unknown };
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return Response.json({ ok: false, error: "json inválido" }, { status: 400 });
  }
  const codigo = typeof cuerpo.codigo === "string" ? cuerpo.codigo.toUpperCase() : "";
  if (!PATRON_REFERENCIA.test(codigo)) return Response.json({ ok: false, error: "código inválido" }, { status: 400 });

  const fecha = typeof cuerpo.recibido_en === "string" ? new Date(cuerpo.recibido_en) : new Date();
  const recibido = Number.isNaN(fecha.getTime()) ? new Date() : fecha;

  try {
    await asegurarEsquema(sql);
    const [fila] = await sql<Fila[]>`
      UPDATE eventos SET recibido_en = coalesce(recibido_en, ${recibido})
      WHERE codigo = ${codigo}
      RETURNING tipo, origen, fuente, campana, creado`;
    if (!fila) return Response.json({ ok: true, encontrado: false });

    return Response.json({
      ok: true,
      encontrado: true,
      atribucion: {
        tipo: fila.tipo,
        origen: fila.origen,
        origen_nombre: esRastro(fila.origen) ? RASTROS[fila.origen].nombre : fila.origen,
        fuente: fila.fuente,
        campana: fila.campana,
        clic_en: fila.creado,
      },
    });
  } catch (e) {
    console.error("[whatsapp/recibido] no se pudo marcar", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
