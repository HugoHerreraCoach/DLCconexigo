import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/* Firma de las llamadas del CRM ConexiGO a esta landing (/api/whatsapp/*):
   cabecera `X-Conexigo-Firma: sha256=<HMAC-SHA256 hex del cuerpo crudo>` con el
   secreto compartido CONEXIGO_WEBHOOK_SECRET (el mismo que el CRM guarda cifrado
   al dar de alta la landing). Comparación en tiempo constante. */

export function firmaValida(crudo: string, cabecera: string | null, secreto: string) {
  const esperada = Buffer.from(`sha256=${createHmac("sha256", secreto).update(crudo).digest("hex")}`);
  const recibida = Buffer.from(cabecera ?? "");
  return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
}
