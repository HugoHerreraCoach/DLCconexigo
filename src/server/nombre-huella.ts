import "server-only";
import { createHmac } from "node:crypto";
import { normalizar } from "@/shared/lib/plantillas";

/** Normaliza un número telefónico a formato estándar sin signos. */
export function normalizarTelefono(tel: unknown): string | null {
  if (typeof tel !== "string") return null;
  const digitos = tel.replace(/\D/g, "");
  if (!digitos) return null;
  if (digitos.length === 9) return `51${digitos}`;
  if (digitos.length === 11 && digitos.startsWith("51")) return digitos;
  if (digitos.length >= 8 && digitos.length <= 15) return digitos;
  return null;
}

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

/** Huella del teléfono que el visitante ingresó en el formulario (HMAC con CONEXIGO_WEBHOOK_SECRET):
 *  permite emparejar la intención del formulario con el mensaje de WhatsApp
 *  sin guardar jamás el teléfono en claro en la base de analítica. */
export function huellaTelefono(telefono: unknown): string | null {
  const secreto = process.env.CONEXIGO_WEBHOOK_SECRET;
  if (!secreto) return null;
  const limpio = normalizarTelefono(telefono);
  if (!limpio) return null;
  return createHmac("sha256", secreto).update(`telefono:${limpio}`).digest("hex").slice(0, 32);
}

