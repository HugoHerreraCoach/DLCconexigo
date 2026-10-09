# 0013 — Mensajes de WhatsApp recibidos desde la landing, sin código

**Fecha:** 2026-10-03

## Objetivo

Medir cuántos mensajes llegan de verdad a WhatsApp desde la landing, sin poner
código en el mensaje (acuerdo del 2026-10-01). Los anuncios de clic a WhatsApp
se miden aparte en el CRM con el `referral` de Meta (en producción desde el
2026-10-03; verificado: 4 de 12 mensajes del día traían el anuncio).

## Cómo funciona

1. **Al hacer clic** (`abrirWhatsApp` → `rastrearContacto/rastrearLead(id, texto)`):
   el registro propio guarda la **plantilla** del mensaje (`general`, `visita`,
   `asesor`, `cuotas`, `ficha`, `video`, `documentos` o `chat-libre`) y una
   **huella del nombre** si el texto trae «Mi nombre es: X» (HMAC con
   `CONEXIGO_WEBHOOK_SECRET`; el nombre no se guarda).
2. **Cuando llega el primer mensaje**, el CRM llama a
   `POST /api/whatsapp/mensaje` (firmado, con `ts`). La landing reconoce la
   plantilla (`src/shared/lib/plantillas.ts`) y empareja con el clic:
   - misma plantilla **y** misma huella de nombre → `exactitud: "nombre"`;
   - si no, el último clic de esa plantilla sin mensaje, de 2 h antes a 5 min
     después → `exactitud: "plantilla"` (aproximado).
3. Marca `recibido_en` y `mensaje_id` (idempotente) y devuelve la atribución.
   El texto del mensaje **no se guarda**. El panel lo muestra en «Leads en CRM».

Contrato completo en la cabecera de `src/app/api/whatsapp/mensaje/route.ts`.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/shared/lib/plantillas.ts` | **Nuevo.** `plantillaDe`, `nombreDe`, `normalizar`, `esPlantilla` |
| `src/server/nombre-huella.ts` | **Nuevo.** `huellaNombre` (HMAC) |
| `src/app/api/whatsapp/mensaje/route.ts` | **Nuevo.** Receptor firmado del CRM |
| `src/shared/lib/whatsapp.ts` | `abrirWhatsApp` pasa el texto final a `medir(texto)` |
| `src/shared/lib/pixeles.ts`, `registro.ts` | Envían `plantilla` y `nombre` al registrar |
| `src/app/api/eventos/route.ts` | Guarda `plantilla` y `nombre_huella` |
| `src/server/db.ts` | Columnas `plantilla`, `nombre_huella`, `mensaje_id` + índices |
| `Pixeles.tsx`, `FormularioContacto.tsx`, `WhatsAppFlotante.tsx` | Pasan el texto |

## Verificación

- `pnpm typecheck`, `pnpm lint` (0 errores), `pnpm build`.
- Local (Postgres en memoria + build de producción), 4 clics y 5 avisos:
  Ana y Luis (mismo texto «más información», distinto nombre) → cada uno a su
  clic (`nombre`); sin nombre → el clic sin nombre (`plantilla`); chat libre
  reconocido; aviso repetido → misma respuesta; texto ajeno → `reconocido:false`;
  plantilla sin clic → `encontrado:false`; firma falsa → 401.
- Error encontrado y corregido en la prueba: en `ORDER BY … DESC` los clics sin
  nombre (comparación `NULL`) iban primero; se usa `coalesce(…, false)`.

## Prueba real en producción (2026-10-03) ✅

Publicado en la landing (`3aa4232..efdd43c`) y en el CRM (`main`, migración
`20261003130000_el_primer_mensaje_de_la_landing_se_pregunta.sql`, tabla
`atribucion_mensajes`). Con un número que nunca había escrito a DLC:

| Hora (Lima) | Paso |
| --- | --- |
| 18:22:18 | Landing: clic del formulario (plantilla `general`, con nombre) |
| 18:22:29 | CRM: primer mensaje del lead nuevo 63389 → en cola |
| 18:24:00 | CRM: resuelto, `exactitud: "nombre"`, «Formulario de solicitud de información de terreno», fuente directo |
| — | Landing: el clic quedó `recibido_en 18:22:29` con su `mensaje_id` |

Una prueba anterior (18:16) no se contó porque el número ya tenía mensajes:
el CRM solo pregunta por el **primer** mensaje de cada lead (diseño). Un
contacto nuevo de las 18:01 quedó `omitida` en el CRM (venía de un anuncio de
clic a WhatsApp, que se atribuye por `referral`).

## Pendientes

- Solo se cuenta el primer mensaje de cada contacto: quien ya escribió antes y
  vuelve desde la landing no suma.
- Límite: la campaña de origen es aproximada cuando no hay nombre y dos
  personas tocan el mismo botón casi a la vez.
