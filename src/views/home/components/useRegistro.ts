"use client";

import { useRef, useState } from "react";
import type { Inicial, TiempoCompra } from "@/config/contenido";
import { celularPeru, enviarFormulario, type IdFormulario } from "@/shared/lib/formulario";
import { clientePotencial } from "@/shared/lib/pixeles";
import { guardarNombreLead } from "@/shared/lib/whatsapp";

/* Estado y envío de los formularios de registro (hero y chat flotante). La
   respuesta se guarda como fila en la hoja de cálculo de leads (/api/formulario)
   y SOLO cuando el servidor confirma la fila se envía «Cliente potencial». */

export type EstadoRegistro = "reposo" | "enviando" | "enviado" | "error";
// Sin opción marcada de entrada: así la hoja no se llena de «Este mes» que nadie eligió.
export type CamposRegistro = { nombre: string; celular: string; inicial: Inicial | null; compra: TiempoCompra | null };
export type ErroresRegistro = Partial<Record<keyof CamposRegistro, string>>;

/** Orden en que se enfoca el primer campo con error. */
const ORDEN: (keyof CamposRegistro)[] = ["nombre", "celular", "inicial", "compra"];

function validar(c: CamposRegistro): ErroresRegistro {
  const e: ErroresRegistro = {};
  if (c.nombre.trim().length < 2) e.nombre = "Escribe tu nombre y apellido.";
  if (!celularPeru(c.celular)) e.celular = "Escribe un celular de 9 dígitos que empiece con 9.";
  if (!c.inicial) e.inicial = "Elige con cuánto cuentas de inicial.";
  if (!c.compra) e.compra = "Elige cuándo quieres comprar.";
  return e;
}

const nuevoId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `reg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export function useRegistro(origen: IdFormulario) {
  const [campos, setCampos] = useState<CamposRegistro>({ nombre: "", celular: "", inicial: null, compra: null });
  const [errores, setErrores] = useState<ErroresRegistro>({});
  const [intentado, setIntentado] = useState(false);
  const [estado, setEstado] = useState<EstadoRegistro>("reposo");
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
  const enviar = async (): Promise<keyof CamposRegistro | null> => {
    if (estado === "enviando" || estado === "enviado") return null;
    setIntentado(true);
    const errs = validar(campos);
    setErrores(errs);
    const conError = ORDEN.find((k) => errs[k]);
    if (conError) return conError;
    const { inicial, compra } = campos;
    if (!inicial || !compra) return null;

    const nombre = campos.nombre.trim();
    guardarNombreLead(nombre);
    registroId.current ??= nuevoId();
    setEstado("enviando");

    try {
      const id = await enviarFormulario(registroId.current, { nombre, celular: campos.celular, inicial, compra }, origen);
      // La fila ya está en la hoja: recién ahora cuenta como «Cliente potencial».
      clientePotencial(origen, id, { inicial, compra });
      setEstado("enviado");
    } catch {
      setEstado("error");
    }
    return null;
  };

  return { campos, errores, estado, actualizar, enviar };
}
