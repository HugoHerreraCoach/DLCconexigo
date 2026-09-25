import { SITIO } from "@/config/sitio";

/** Enlace wa.me con el mensaje ya escrito. Cada CTA de la landing manda un
 *  mensaje distinto para que el asesor sepa desde qué punto llegó el lead. */
export function enlaceWhatsApp(mensaje: string): string {
  return `https://wa.me/${SITIO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

/* ── Código de referencia ────────────────────────────────────────────────────
   Cada clic a WhatsApp añade al mensaje una línea "Ref: FA-7K3QX". El código se
   guarda con la campaña, la fuente y el botón (tabla `eventos`). Cuando el
   mensaje LLEGA de verdad, el CRM ConexiGO lo detecta y avisa a
   /api/whatsapp/recibido, que marca ese clic como recibido. Así el panel
   distingue "hizo clic" de "el mensaje llegó".
   Formato: prefijo del proyecto + guion + 5 caracteres sin 0/O/1/I/L. */

const PREFIJO_REFERENCIA = "FA";
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const PATRON_REFERENCIA = /^[A-Z]{2,4}-[2-9A-HJKMNP-Z]{5}$/;

export function nuevaReferencia(): string {
  const azar = crypto.getRandomValues(new Uint8Array(5));
  return `${PREFIJO_REFERENCIA}-${Array.from(azar, (b) => ALFABETO[b % ALFABETO.length]).join("")}`;
}

/** Añade la línea de referencia al final del mensaje. */
export const conReferencia = (mensaje: string, codigo: string) => `${mensaje}\n\nRef: ${codigo}`;

export const MENSAJES = {
  general: "Hola Grupo DLC, quiero información sobre Finca Algarrobo.",
  visita: "Hola, quiero agendar una visita a Finca Algarrobo este fin de semana.",
  cuotas: "Hola, quiero consultar mi plan de cuotas para un lote en Finca Algarrobo.",
  ficha: "Hola, quiero evaluar la inversión. ¿Me envían la ficha del proyecto Finca Algarrobo?",
  video: "Hola, ¿me pueden enviar el video recorrido de Finca Algarrobo?",
  documentos: "Hola, quiero conocer el detalle de la documentación de Finca Algarrobo.",
} as const;
