import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/* Acceso al panel con una contraseña única (PANEL_PASSWORD en Vercel). La
   cookie guarda un HMAC de la contraseña, no la contraseña: si se cambia la
   variable, todas las sesiones abiertas caducan solas. */

export const COOKIE_PANEL = "dlc_panel";
export const DURACION_SESION = 60 * 60 * 24 * 30; // 30 días

const contrasena = () => process.env.PANEL_PASSWORD ?? "";

export const panelConfigurado = () => contrasena().length > 0;

export function firma(): string {
  return createHmac("sha256", contrasena()).update("panel-dlc-v1").digest("hex");
}

function iguales(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function contrasenaCorrecta(intento: string) {
  return panelConfigurado() && iguales(intento, contrasena());
}

export async function sesionValida() {
  if (!panelConfigurado()) return false;
  const valor = (await cookies()).get(COOKIE_PANEL)?.value ?? "";
  return iguales(valor, firma());
}
