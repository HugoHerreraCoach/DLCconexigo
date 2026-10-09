import { sql } from "@/server/db";
import { firmaValida } from "@/server/firma-conexigo";

/* ════════════════════════════════════════════════════════════════
   PROYECCIÓN DE CONVERSIONES CANÓNICAS (ConexiGO CRM -> Landing).

   Aviso del CRM ConexiGO cuando se confirma una adquisición real en WhatsApp.
   Proyecta de forma segura e idempotente la conversión en la base de datos de la landing.
   
   Contrato:
   Cabecera: X-Conexigo-Firma: sha256=<HMAC-SHA256 del cuerpo crudo con CONEXIGO_WEBHOOK_SECRET>
   Cuerpo: {
     "conversion_id": "<uuid>",
     "empresa_id": "<uuid>",
     "intencion_id": "<uuid o string opcional>",
     "telefono_huella": "<hex opcional>",
     "codigo": "<string opcional, ej L-27>",
     "recibido_en": "<ISO timestamptz>",
     "ts": <segundos Unix>
   }
   
   Respuestas:
   - 200: { "ok": true, "proyectada": true, "idempotente": boolean, "evento_id": number | null }
   - 400: { "ok": false, "error": "payload inválido" }
   - 401: { "ok": false, "error": "firma inválida o timestamp vencido" }
   - 403: { "ok": false, "error": "empresa no coincide con este tenant" }
   - 503: { "ok": false, "error": "no configurado" }
   ════════════════════════════════════════════════════════════════ */

const TOLERANCIA_S = 300;

interface CuerpoConversion {
  conversion_id?: unknown;
  empresa_id?: unknown;
  intencion_id?: unknown;
  telefono_huella?: unknown;
  codigo?: unknown;
  recibido_en?: unknown;
  ts?: unknown;
}

export async function POST(req: Request) {
  const secreto = process.env.CONEXIGO_WEBHOOK_SECRET;
  if (!secreto || !sql) {
    return Response.json({ ok: false, error: "no configurado" }, { status: 503 });
  }

  const crudo = await req.text();
  if (crudo.length > 4096) {
    return Response.json({ ok: false, error: "payload demasiado grande" }, { status: 413 });
  }

  // F3.8: Valida firma HMAC-SHA256
  const firma = req.headers.get("x-conexigo-firma");
  if (!firmaValida(crudo, firma, secreto)) {
    return Response.json({ ok: false, error: "firma inválida" }, { status: 401 });
  }

  let cuerpo: CuerpoConversion;
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return Response.json({ ok: false, error: "json inválido" }, { status: 400 });
  }

  // F3.8: Timestamp vencido o replay attack (tolerancia de 5 minutos)
  if (typeof cuerpo.ts !== "number" || Math.abs(Date.now() / 1000 - cuerpo.ts) > TOLERANCIA_S) {
    return Response.json({ ok: false, error: "ts fuera de tiempo" }, { status: 401 });
  }

  // F3.8: Cruce de negocio
  const empresaEsperada = process.env.CONEXIGO_EMPRESA_ID;
  if (empresaEsperada && typeof cuerpo.empresa_id === "string" && cuerpo.empresa_id !== empresaEsperada) {
    return Response.json({ ok: false, error: "empresa no coincide con este tenant" }, { status: 403 });
  }

  const conversionId = typeof cuerpo.conversion_id === "string" ? cuerpo.conversion_id.trim() : "";
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(conversionId)) {
    return Response.json({ ok: false, error: "conversion_id inválido" }, { status: 400 });
  }

  const intencionId = typeof cuerpo.intencion_id === "string" ? cuerpo.intencion_id.trim() : null;
  const telefonoHuella = typeof cuerpo.telefono_huella === "string" ? cuerpo.telefono_huella.trim() : null;
  const rawCodigo = typeof cuerpo.codigo === "string" ? cuerpo.codigo.trim().toUpperCase() : null;
  const codigo = rawCodigo && rawCodigo.startsWith("L") && !rawCodigo.startsWith("L-")
    ? "L-" + rawCodigo.slice(1)
    : rawCodigo;

  const fecha = typeof cuerpo.recibido_en === "string" ? new Date(cuerpo.recibido_en) : new Date();
  const recibido = Number.isNaN(fecha.getTime()) ? new Date() : fecha;

  try {
    const db = sql;
    // F3.8: Idempotencia: si esta conversion_id ya fue proyectada, no duplicar ni mutar
    const [existente] = await db<{ id: number; recibido_en: Date | null }[]>`
      SELECT id, recibido_en FROM eventos WHERE conversion_id = ${conversionId} LIMIT 1`;
    if (existente) {
      return Response.json({
        ok: true,
        proyectada: true,
        idempotente: true,
        evento_id: existente.id,
      });
    }

    // Buscar si hay un evento existente por intencion_id, codigo o telefono_huella para enlazar
    let eventoId: number | null = null;
    if (intencionId) {
      const [porIntencion] = await db<{ id: number }[]>`
        UPDATE eventos
        SET conversion_id = ${conversionId},
            recibido_en = coalesce(recibido_en, ${recibido})
        WHERE intencion_id = ${intencionId} AND conversion_id IS NULL
        RETURNING id`;
      if (porIntencion) eventoId = porIntencion.id;
    }

    if (!eventoId && codigo) {
      const [porCodigo] = await db<{ id: number }[]>`
        UPDATE eventos
        SET conversion_id = ${conversionId},
            recibido_en = coalesce(recibido_en, ${recibido})
        WHERE codigo = ${codigo} AND conversion_id IS NULL
        RETURNING id`;
      if (porCodigo) eventoId = porCodigo.id;
    }

    if (!eventoId && telefonoHuella) {
      const [porTelefono] = await db<{ id: number }[]>`
        UPDATE eventos
        SET conversion_id = ${conversionId},
            recibido_en = coalesce(recibido_en, ${recibido})
        WHERE telefono_huella = ${telefonoHuella} AND conversion_id IS NULL
        RETURNING id`;
      if (porTelefono) eventoId = porTelefono.id;
    }

    // Si no hubo evento previo que enlazar, se crea la fila proyectada canónica
    if (!eventoId) {
      const [nueva] = await db<{ id: number }[]>`
        INSERT INTO eventos (
          tipo, visitante, fuente, campana, origen, conversion_id, recibido_en, intencion_id, telefono_huella, codigo
        ) VALUES (
          'adquisicion_confirmada', 'conexigo_crm', 'whatsapp', 'crm_proyeccion', 'whatsapp_adquisicion',
          ${conversionId}, ${recibido}, ${intencionId}, ${telefonoHuella}, ${codigo}
        )
        ON CONFLICT (conversion_id) DO NOTHING
        RETURNING id`;
      eventoId = nueva?.id ?? null;
    }

    return Response.json({
      ok: true,
      proyectada: true,
      idempotente: false,
      evento_id: eventoId,
    });
  } catch (e) {
    console.error("[conexigo/conversiones] error proyectando conversión:", e);
    return Response.json({ ok: false, error: "error interno" }, { status: 500 });
  }
}
