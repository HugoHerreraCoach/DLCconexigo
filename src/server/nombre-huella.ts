import "server-only";
import { createHmac } from "node:crypto";
import { normalizar } from "@/shared/lib/plantillas";

/** Huella del nombre que el visitante escribió (HMAC con CONEXIGO_WEBHOOK_SECRET):
 *  sirve para emparejar su clic con el mensaje que luego llega a WhatsApp sin
 *  guardar el nombre en la base. null si no hay nombre o no hay secreto. */
export function huellaNombre(nombre: unknown): string | null {
  const secreto = process.env.CONEXIGO_WEBHOOK_SECRET;
  if (!secreto || typeof nombre !== "string") return null;
  const limpio = normalizar(nombre);
  if (!limpio) return null;
  return createHmac("sha256", secreto).update(`nombre:${limpio}`).digest("hex").slice(0, 32);
}
