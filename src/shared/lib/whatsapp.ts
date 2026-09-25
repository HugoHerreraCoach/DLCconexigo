import { SITIO } from "@/config/sitio";

/** Enlace wa.me con el mensaje ya escrito. Cada CTA de la landing manda un
 *  mensaje distinto para que el asesor sepa desde qué punto llegó el lead. */
export function enlaceWhatsApp(mensaje: string): string {
  return `https://wa.me/${SITIO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

/* ── Número de referencia ────────────────────────────────────────────────────
   Cada clic a WhatsApp (y cada formulario) lleva en la PRIMERA LÍNEA del
   mensaje un número correlativo: "L-1", "L-2", "L-3"… Lo asigna el servidor
   (/api/eventos con `reservar`, secuencia de Postgres) al registrar el clic, y
   queda guardado con la campaña, la fuente y el botón (tabla `eventos`).
   Cuando el mensaje LLEGA de verdad, el CRM ConexiGO lee la primera línea y
   avisa a /api/whatsapp/recibido, que marca ese clic como recibido. Así el
   panel distingue "hizo clic" de "el mensaje llegó". */

export const PREFIJO_REFERENCIA = "L";
export const PATRON_REFERENCIA = /^L-[1-9]\d{0,9}$/;

/** Pone el número de referencia como primera línea del mensaje. */
export const conReferencia = (mensaje: string, codigo: string) => `${codigo}\n${mensaje}`;

/** Abre WhatsApp con el número de referencia en la primera línea.
 *  `pedirCodigo` registra el clic y devuelve el número asignado (o null si el
 *  servidor no respondió a tiempo: entonces se abre igual, sin número).
 *  En escritorio la pestaña se abre YA, dentro del clic, para que el bloqueador
 *  de ventanas no la frene; la dirección se le pone cuando llega el número. En
 *  celular se navega directo: wa.me abre la app de WhatsApp. */
export async function abrirWhatsApp(enlace: string, pedirCodigo: () => Promise<string | null>) {
  const escritorio = !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const ventana = escritorio ? window.open("", "_blank") : null;
  if (ventana) ventana.opener = null;

  const codigo = await pedirCodigo();
  const url = new URL(enlace);
  if (codigo) url.searchParams.set("text", conReferencia(url.searchParams.get("text") ?? "", codigo));

  if (ventana) ventana.location.href = url.toString();
  else window.location.href = url.toString();
}

export const MENSAJES = {
  general: "Hola Grupo DLC, quiero información sobre Finca Algarrobo.",
  visita: "Hola, quiero agendar una visita a Finca Algarrobo este fin de semana.",
  cuotas: "Hola, quiero consultar mi plan de cuotas para un lote en Finca Algarrobo.",
  ficha: "Hola, quiero evaluar la inversión. ¿Me envían la ficha del proyecto Finca Algarrobo?",
  video: "Hola, ¿me pueden enviar el video recorrido de Finca Algarrobo?",
  documentos: "Hola, quiero conocer el detalle de la documentación de Finca Algarrobo.",
} as const;
