"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/server/db";
import { COOKIE_PANEL, DURACION_SESION, contrasenaCorrecta, firma, sesionValida } from "@/server/sesion-panel";

export async function ingresar(formulario: FormData) {
  const intento = String(formulario.get("contrasena") ?? "");
  if (!contrasenaCorrecta(intento)) {
    // Pausa corta: frena a quien pruebe contraseñas en bucle.
    await new Promise((r) => setTimeout(r, 800));
    redirect("/panel?error=1");
  }
  (await cookies()).set(COOKIE_PANEL, firma(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/panel",
    maxAge: DURACION_SESION,
  });
  redirect("/panel");
}

export async function salir() {
  (await cookies()).delete({ name: COOKIE_PANEL, path: "/panel" });
  redirect("/panel");
}

/** Vacía las métricas del panel (tabla `eventos`, la única que usa la landing)
 *  para empezar de cero tras las pruebas. Una acción de servidor se puede
 *  llamar desde fuera de la página, así que la sesión se comprueba AQUÍ, no
 *  solo en la pantalla: sin sesión válida no se borra nada. */
export async function limpiarMetricasPrueba() {
  if (!(await sesionValida())) redirect("/panel");
  if (!sql) redirect("/panel");
  try {
    await sql`DELETE FROM eventos`;
  } catch (e) {
    console.error("[panel] Error al limpiar métricas", e);
  }
  redirect("/panel");
}
