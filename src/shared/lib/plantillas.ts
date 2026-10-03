import { MENSAJES } from "@/shared/lib/whatsapp";

/* Reconocer los mensajes de WhatsApp que salen de la landing SIN código.
   Cada botón abre WhatsApp con un texto fijo (MENSAJES) y el chat flotante con
   «Hola Grupo DLC, …». A veces se añade «Mi nombre es: X». Se usa en los dos
   extremos:
     · al hacer clic → se guarda la plantilla (y una huella del nombre);
     · cuando el CRM avisa del primer mensaje → se reconoce la plantilla y se
       empareja con el clic (/api/whatsapp/mensaje). */

export type Plantilla = keyof typeof MENSAJES | "chat-libre";

const PLANTILLAS = [...(Object.keys(MENSAJES) as (keyof typeof MENSAJES)[]), "chat-libre"] as const;

export const esPlantilla = (p: unknown): p is Plantilla => typeof p === "string" && (PLANTILLAS as readonly string[]).includes(p);

/** Minúsculas, sin tildes ni signos, espacios simples. */
export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();

const NOMBRE = /mi nombre es\s*:?\s*(.+)$/i;

/** Nombre que viene al final del mensaje («Mi nombre es: Ana»), o null. */
export function nombreDe(texto: string): string | null {
  const m = texto.match(NOMBRE);
  const nombre = m?.[1]?.replace(/[.\s]+$/, "").trim();
  return nombre ? nombre.slice(0, 80) : null;
}

const CLAVES_NORMALIZADAS = (Object.keys(MENSAJES) as (keyof typeof MENSAJES)[]).map((k) => [k, normalizar(MENSAJES[k])] as const);

/** Qué plantilla de la landing es este texto, o null si no es de la landing.
 *  Acepta que la persona añada algo al final (compara los primeros 30
 *  caracteres, que son distintos en cada plantilla). */
export function plantillaDe(texto: string): Plantilla | null {
  const base = normalizar(texto.replace(NOMBRE, ""));
  if (!base) return null;
  for (const [k, t] of CLAVES_NORMALIZADAS) if (base === t) return k;
  for (const [k, t] of CLAVES_NORMALIZADAS) if (base.startsWith(t.slice(0, 30))) return k;
  if (base.startsWith("hola grupo dlc")) return "chat-libre";
  return null;
}
