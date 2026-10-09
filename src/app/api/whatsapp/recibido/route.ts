import { esRastro, RASTROS } from "@/config/rastros";
import { sql } from "@/server/db";
import { firmaValida } from "@/server/firma-conexigo";
import { PATRON_REFERENCIA } from "@/shared/lib/whatsapp";

/* Aviso del CRM ConexiGO: llegó a WhatsApp un mensaje cuya primera línea es "L-27".
   Marca ese clic como recibido y devuelve su atribución, para que el CRM se la
   muestre al asesor en la ficha del lead.

   Contrato
   ────────
   POST /api/whatsapp/recibido
   Cabecera  X-Conexigo-Firma: sha256=<HMAC-SHA256 hex del cuerpo crudo con CONEXIGO_WEBHOOK_SECRET>
   Cuerpo    { "codigo": "L-27", "recibido_en": "2026-09-25T15:00:00Z" }   (recibido_en opcional)
   200       { "ok": true, "encontrado": true, "atribucion": {
                 "tipo": "contacto" | "lead", "origen": "formulario-hero",
                 "origen_nombre": "Formulario de solicitud de información de terreno",
                 "fuente": "meta", "campana": "web-finca-algarrobo" | null,
                 "clic_en": "2026-09-25T14:58:10.000Z" } }
             { "ok": true, "encontrado": false }   ← código válido pero no es de esta landing
   400 cuerpo inválido · 401 firma incorrecta · 503 sin secreto o sin base

   Es idempotente: si Meta reintenta y el CRM avisa dos veces, se conserva la
   primera hora de llegada. */

type Fila = {
  tipo: "contacto" | "lead" | "formulario_preparado";
  origen: string | null;
  fuente: string;
  campana: string | null;
  creado: Date;
};

export async function POST(req: Request) {
  const secreto = process.env.CONEXIGO_WEBHOOK_SECRET;
  if (!secreto || !sql) return Response.json({ ok: false, error: "no configurado" }, { status: 503 });

  const crudo = await req.text();
  if (crudo.length > 2000) return Response.json({ ok: false }, { status: 413 });
  if (!firmaValida(crudo, req.headers.get("x-conexigo-firma"), secreto)) return Response.json({ ok: false }, { status: 401 });

  let cuerpo: { codigo?: unknown; recibido_en?: unknown; venta?: unknown };
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return Response.json({ ok: false, error: "json inválido" }, { status: 400 });
  }
  const rawCodigo = typeof cuerpo.codigo === "string" ? cuerpo.codigo.trim().toUpperCase() : "";
  // Normaliza códigos como "L1" a "L-1" para que siempre coincida con la base de datos
  const codigo = rawCodigo.startsWith("L") && !rawCodigo.startsWith("L-")
    ? "L-" + rawCodigo.slice(1)
    : rawCodigo;
  if (!PATRON_REFERENCIA.test(codigo)) return Response.json({ ok: false, error: "código inválido" }, { status: 400 });

  const fecha = typeof cuerpo.recibido_en === "string" ? new Date(cuerpo.recibido_en) : new Date();
  const recibido = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  const esVenta = cuerpo.venta === true;

  try {
    // 1. Coincidencia EXACTA por código (F3.1). Sin alternativas permisivas ni 'L-1' / 'L-%'.
    const candidatos = await sql<(Fila & { id: number; recibido_en: Date | null })[]>`
      SELECT id, tipo, origen, fuente, campana, creado, recibido_en
      FROM eventos 
      WHERE codigo = ${codigo}
        AND tipo IN ('lead', 'contacto', 'formulario_preparado')
      ORDER BY creado DESC`;

    // F3.2: Código inexistente (L-999) devuelve no encontrado y cero mutaciones.
    if (candidatos.length === 0) {
      return Response.json({ ok: true, encontrado: false });
    }

    // F3.4: Si existen múltiples candidatos históricos con el mismo código, no selecciona
    // arbitrariamente el más reciente: se identifica como ambiguo y no muta ninguna fila.
    if (candidatos.length > 1) {
      return Response.json({
        ok: true,
        encontrado: false,
        ambigua: true,
        motivo: "candidatos_ambiguos",
      });
    }

    const candidato = candidatos[0];

    // F3.3: Idempotencia: si ya estaba recibido, se preserva su primera hora de llegada
    // y solo se actualiza venta_en si corresponde. Reintentos actualizan la misma fila.
    const [fila] = await sql<Fila[]>`
      UPDATE eventos 
      SET recibido_en = coalesce(recibido_en, ${recibido}),
          venta_en = CASE WHEN ${esVenta} THEN coalesce(venta_en, ${recibido}) ELSE venta_en END
      WHERE id = ${candidato.id}
      RETURNING tipo, origen, fuente, campana, creado`;

    if (!fila) return Response.json({ ok: true, encontrado: false });

    return Response.json({
      ok: true,
      encontrado: true,
      atribucion: {
        tipo: fila.tipo === "formulario_preparado" ? "lead" : fila.tipo,
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
