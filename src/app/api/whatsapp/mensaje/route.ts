import { esRastro, RASTROS } from "@/config/rastros";
import { asegurarEsquema, sql } from "@/server/db";
import { firmaValida } from "@/server/firma-conexigo";
import { huellaNombre } from "@/server/nombre-huella";
import { nombreDe, plantillaDe } from "@/shared/lib/plantillas";

/* Aviso del CRM ConexiGO: «llegó este primer mensaje de WhatsApp». Sin código
   en el mensaje, la landing lo reconoce por su texto (plantilla de cada botón,
   ver src/shared/lib/plantillas.ts) y lo empareja con el clic que lo abrió:
     1. mismo texto (plantilla) Y misma huella de nombre → exacto;
     2. si no hay nombre o no coincide: el último clic de esa plantilla sin
        mensaje, entre 2 h antes y 5 min después de recibido → aproximado.
   Marca ese clic como recibido y devuelve su atribución. El texto NO se guarda.

   Contrato
   ────────
   POST /api/whatsapp/mensaje
   Cabecera  X-Conexigo-Firma: sha256=<HMAC-SHA256 hex del cuerpo crudo con CONEXIGO_WEBHOOK_SECRET>
   Cuerpo    { "mensaje_id": "wamid.…", "texto": "Hola, quiero…", "recibido_en": "<ISO>", "ts": <segundos Unix> }
             · ts con tolerancia de 5 min · texto ≤ 2000 caracteres
   200       { "ok": true, "reconocido": false }                       ← no es un texto de la landing
             { "ok": true, "reconocido": true, "encontrado": false }   ← es de la landing pero no hay clic que emparejar
             { "ok": true, "reconocido": true, "encontrado": true, "exactitud": "nombre" | "plantilla",
               "atribucion": { tipo, origen, origen_nombre, fuente, campana, clic_en } }
   Idempotente por mensaje_id (el mismo aviso devuelve la misma atribución).
   400 cuerpo inválido · 401 firma o ts incorrectos · 503 sin secreto o sin base */

const TOLERANCIA_S = 300;

type Fila = { tipo: "contacto" | "lead"; origen: string | null; fuente: string; campana: string | null; creado: Date; nombre_huella: string | null };

const respuesta = (f: Fila, huella: string | null) => ({
  ok: true,
  reconocido: true,
  encontrado: true,
  exactitud: huella && f.nombre_huella === huella ? "nombre" : "plantilla",
  atribucion: {
    tipo: f.tipo,
    origen: f.origen,
    origen_nombre: esRastro(f.origen) ? RASTROS[f.origen].nombre : f.origen,
    fuente: f.fuente,
    campana: f.campana,
    clic_en: f.creado,
  },
});

export async function POST(req: Request) {
  const secreto = process.env.CONEXIGO_WEBHOOK_SECRET;
  if (!secreto || !sql) return Response.json({ ok: false, error: "no configurado" }, { status: 503 });

  const crudo = await req.text();
  if (crudo.length > 3000) return Response.json({ ok: false }, { status: 413 });
  if (!firmaValida(crudo, req.headers.get("x-conexigo-firma"), secreto)) return Response.json({ ok: false }, { status: 401 });

  let cuerpo: { mensaje_id?: unknown; texto?: unknown; recibido_en?: unknown; ts?: unknown };
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return Response.json({ ok: false, error: "json inválido" }, { status: 400 });
  }
  if (typeof cuerpo.ts !== "number" || Math.abs(Date.now() / 1000 - cuerpo.ts) > TOLERANCIA_S)
    return Response.json({ ok: false, error: "ts fuera de tiempo" }, { status: 401 });
  const mensajeId = typeof cuerpo.mensaje_id === "string" ? cuerpo.mensaje_id.slice(0, 200) : "";
  const texto = typeof cuerpo.texto === "string" ? cuerpo.texto.slice(0, 2000) : "";
  if (!mensajeId || !texto) return Response.json({ ok: false, error: "faltan mensaje_id o texto" }, { status: 400 });
  const fecha = typeof cuerpo.recibido_en === "string" ? new Date(cuerpo.recibido_en) : new Date();
  const recibido = Number.isNaN(fecha.getTime()) ? new Date() : fecha;

  const plantilla = plantillaDe(texto);
  if (!plantilla) return Response.json({ ok: true, reconocido: false });
  const huella = huellaNombre(nombreDe(texto));

  try {
    const db = sql;
    await asegurarEsquema(db);
    const resultado = await db.begin(async (tx) => {
      // Idempotencia: si este mensaje ya se emparejó, devolver lo mismo.
      const [previo] = await tx<Fila[]>`
        SELECT tipo, origen, fuente, campana, creado, nombre_huella FROM eventos WHERE mensaje_id = ${mensajeId}`;
      if (previo) return respuesta(previo, huella);

      const [fila] = await tx<Fila[]>`
        UPDATE eventos SET recibido_en = ${recibido}, mensaje_id = ${mensajeId}
        WHERE id = (
          SELECT id FROM eventos
          WHERE plantilla = ${plantilla} AND recibido_en IS NULL AND tipo IN ('contacto', 'lead')
            AND creado BETWEEN ${recibido}::timestamptz - interval '2 hours' AND ${recibido}::timestamptz + interval '5 minutes'
          -- coalesce: sin él, los clics sin nombre dan NULL y en DESC irían primero.
          ORDER BY coalesce(nombre_huella = ${huella}::text, false) DESC, creado DESC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING tipo, origen, fuente, campana, creado, nombre_huella`;
      return fila ? respuesta(fila, huella) : { ok: true, reconocido: true, encontrado: false };
    });
    return Response.json(resultado);
  } catch (e) {
    console.error("[whatsapp/mensaje] no se pudo emparejar", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
