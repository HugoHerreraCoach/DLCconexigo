"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_PANEL, DURACION_SESION, contrasenaCorrecta, firma } from "@/server/sesion-panel";

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
