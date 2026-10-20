"use client";

import { useRef, useState } from "react";
import { INICIAL_POR_DEFECTO, type Inicial } from "@/config/contenido";
import { celularPeru, enviarFormulario, type IdFormulario } from "@/shared/lib/formulario";
import { clientePotencial } from "@/shared/lib/pixeles";
import { abrirWhatsApp, enlaceWhatsApp, guardarNombreLead, mensajeRegistro } from "@/shared/lib/whatsapp";

/* Estado y envío de los formularios de registro (hero y chat flotante). La
   respuesta se guarda como fila en la hoja de cálculo de leads (/api/formulario)
   y SOLO cuando el servidor confirma la fila se envía la conversión a los
   píxeles. Desde el 2026-10-20 (docs/0023) el registro termina en WhatsApp: un
   momento después de la conversión se abre el chat con el mensaje del registro.
   Quien no llega a enviarlo ya quedó en la hoja. */

export type EstadoRegistro = "reposo" | "enviando" | "enviado" | "error";
// La inicial sale marcada de entrada (INICIAL_POR_DEFECTO): solo se validan nombre y celular.
export type CamposRegistro = { nombre: string; celular: string; inicial: Inicial };
export type ErroresRegistro = Partial<Record<"nombre" | "celular", string>>;

/** Orden en que se enfoca el primer campo con error. */
const ORDEN: (keyof ErroresRegistro)[] = ["nombre", "celular"];

/** Margen para que los píxeles despachen la conversión antes de salir de la
 *  página hacia WhatsApp (en celular la misma pestaña navega a wa.me). */
export const ESPERA_WHATSAPP_MS = 800;

function validar(c: CamposRegistro): ErroresRegistro {
  const e: ErroresRegistro = {};
  if (c.nombre.trim().length < 2) e.nombre = "Escribe tu nombre y apellido.";
  if (!celularPeru(c.celular)) e.celular = "Escribe un número de WhatsApp de 9 dígitos que empiece con 9.";
  return e;
}

const nuevoId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `reg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

/** Con la fila ya confirmada en la hoja: conversión en los píxeles y, un
 *  momento después, WhatsApp con el mensaje del registro. Devuelve el enlace,
 *  para ofrecerlo a mano si WhatsApp no se abre solo. */
export function terminarRegistro(origen: IdFormulario, registroId: string, nombre: string, inicial: Inicial): string {
  clientePotencial(origen, registroId, { inicial });
  const enlace = enlaceWhatsApp(mensajeRegistro(nombre, inicial));
  setTimeout(() => abrirWhatsApp(enlace), ESPERA_WHATSAPP_MS);
  return enlace;
}

export function useRegistro(origen: IdFormulario) {
  const [campos, setCampos] = useState<CamposRegistro>({ nombre: "", celular: "", inicial: INICIAL_POR_DEFECTO });
  const [errores, setErrores] = useState<ErroresRegistro>({});
  const [intentado, setIntentado] = useState(false);
  const [estado, setEstado] = useState<EstadoRegistro>("reposo");
  // Enlace de WhatsApp del registro ya guardado, por si no se abrió solo.
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  // Id del envío: se mantiene en los reintentos (el servidor no duplica la fila)
  // y se renueva si la persona cambia algún dato.
  const registroId = useRef<string | null>(null);

  const actualizar = <K extends keyof CamposRegistro>(k: K, v: CamposRegistro[K]) => {
    const nuevos = { ...campos, [k]: v };
    setCampos(nuevos);
    registroId.current = null;
    if (k === "nombre") guardarNombreLead(nuevos.nombre);
    if (intentado) setErrores(validar(nuevos));
  };

  /** Valida y envía. Devuelve el primer campo con error (para enfocarlo) o null. */
  const enviar = async (): Promise<keyof ErroresRegistro | null> => {
    if (estado === "enviando" || estado === "enviado") return null;
    setIntentado(true);
    const errs = validar(campos);
    setErrores(errs);
    const conError = ORDEN.find((k) => errs[k]);
    if (conError) return conError;

    const nombre = campos.nombre.trim();
    const { inicial } = campos;
    guardarNombreLead(nombre);
    registroId.current ??= nuevoId();
    setEstado("enviando");

    try {
      const id = await enviarFormulario(registroId.current, { nombre, celular: campos.celular, inicial }, origen);
      // La fila ya está en la hoja: recién ahora va la conversión, y después WhatsApp.
      setWhatsapp(terminarRegistro(origen, id, nombre, inicial));
      setEstado("enviado");
    } catch {
      setEstado("error");
    }
    return null;
  };

  return { campos, errores, estado, whatsapp, actualizar, enviar };
}
