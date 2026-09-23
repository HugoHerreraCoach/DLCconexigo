import { SITIO } from "@/config/sitio";

/** Enlace wa.me con el mensaje ya escrito. Cada CTA de la landing manda un
 *  mensaje distinto para que el asesor sepa desde qué punto llegó el lead. */
export function enlaceWhatsApp(mensaje: string): string {
  return `https://wa.me/${SITIO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

export const MENSAJES = {
  general: "Hola Grupo DLC, quiero información sobre Finca Algarrobo.",
  visita: "Hola, quiero agendar una visita a Finca Algarrobo este fin de semana.",
  cuotas: "Hola, quiero consultar mi plan de cuotas para un lote en Finca Algarrobo.",
  ficha: "Hola, quiero evaluar la inversión. ¿Me envían la ficha del proyecto Finca Algarrobo?",
  video: "Hola, ¿me pueden enviar el video recorrido de Finca Algarrobo?",
  documentos: "Hola, quiero conocer el detalle de la documentación de Finca Algarrobo.",
} as const;
