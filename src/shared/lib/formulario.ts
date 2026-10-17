import type { IdRastro } from "@/config/rastros";
import { contextoVisita } from "@/shared/lib/registro";

/* Formularios de registro → hoja de cálculo de leads (ver /api/formulario):
   el del hero y el del chat flotante. Lo usan los componentes y el servidor,
   para validar con las mismas reglas. */

/** Formularios que escriben en la hoja. Cada uno sale en la columna ORIGEN. */
export const FORMULARIOS = ["formulario-hero", "chat-flotante-registro"] as const satisfies readonly IdRastro[];
export type IdFormulario = (typeof FORMULARIOS)[number];

/** Celular peruano: 9 dígitos que empiezan en 9, con o sin +51 delante.
 *  Devuelve los 9 dígitos o null. */
export function celularPeru(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  let digitos = valor.replace(/\D/g, "");
  if (digitos.length === 11 && digitos.startsWith("51")) digitos = digitos.slice(2);
  return /^9\d{8}$/.test(digitos) ? digitos : null;
}

export type DatosFormulario = { nombre: string; celular: string; inicial: string; compra: string };

/** Envía el formulario y espera a que la fila quede en la hoja de cálculo.
 *  Devuelve el id del registro; lanza si no se guardó. Reenviar el mismo `id`
 *  no duplica la fila. */
export async function enviarFormulario(id: string, datos: DatosFormulario, origen: IdFormulario = "formulario-hero"): Promise<string> {
  const res = await fetch("/api/formulario", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, origen, ...datos, ...contextoVisita() }),
  });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; id?: string } | null;
  if (!res.ok || !json?.ok) throw new Error(`formulario: HTTP ${res.status}`);
  return json.id ?? id;
}
