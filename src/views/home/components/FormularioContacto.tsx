"use client";

import { useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Gift, Loader2, User, UserPlus } from "lucide-react";
import { INICIALES, PREGUNTAS } from "@/config/contenido";
import { EASE } from "@/shared/lib/motion";
import { abrirWhatsApp } from "@/shared/lib/whatsapp";
import { useRegistro } from "./useRegistro";

/* La respuesta se guarda como fila en la hoja de cálculo de leads y SOLO
   cuando el servidor confirma la fila se envía la conversión a los píxeles.
   Desde el 2026-10-20 (docs/0023), después se abre WhatsApp con el mensaje
   del registro (ver useRegistro). */

function MensajeError({ id, texto }: { id: string; texto?: string }) {
  return (
    <AnimatePresence>
      {texto && (
        <motion.p
          id={id}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mt-1.5 text-xs font-medium text-red-600"
        >
          {texto}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/** Pregunta con opciones tipo chip (una sola elección, siempre hay una marcada). */
function Opciones<T extends string>({
  id,
  titulo,
  opciones,
  valor,
  error,
  onElegir,
}: {
  id: string;
  titulo: string;
  opciones: readonly T[];
  valor: T | null;
  error?: string;
  onElegir: (v: T) => void;
}) {
  return (
    <div id={id} role="group" aria-labelledby={`${id}-t`} aria-describedby={error ? `${id}-e` : undefined}>
      <p id={`${id}-t`} className="mb-2 block text-xs font-bold text-neutral-700 uppercase tracking-wide">
        {titulo}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {opciones.map((o) => {
          const seleccionado = valor === o;
          return (
            <button
              key={o}
              type="button"
              aria-pressed={seleccionado}
              onClick={() => onElegir(o)}
              className={`relative flex min-h-12 items-center justify-center rounded-xl border px-3 py-1.5 text-center text-[11px] leading-tight font-semibold transition-all cursor-pointer active:scale-[0.98] sm:text-xs ${
                seleccionado
                  ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/25 shadow-xs"
                  : error
                    ? "border-red-300 bg-neutral-50/70 text-neutral-600 hover:border-red-400 hover:text-neutral-900"
                    : "border-neutral-200 bg-neutral-50/70 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100/80 hover:text-neutral-900"
              }`}
            >
              {o}
              {seleccionado && (
                <span className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Check className="size-2 stroke-[3]" aria-hidden="true" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <MensajeError id={`${id}-e`} texto={error} />
    </div>
  );
}

export function FormularioContacto() {
  const { campos, errores, estado, whatsapp, actualizar, enviar: registrar } = useRegistro("formulario-hero");
  const idNombre = useId();
  const idCelular = useId();
  const idInicial = useId();

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const conError = await registrar();
    if (conError === "nombre") document.getElementById(idNombre)?.focus();
    if (conError === "celular") document.getElementById(idCelular)?.focus();
  };

  return (
    <form
      id="formulario"
      onSubmit={enviar}
      noValidate
      aria-labelledby="formulario-titulo"
      className="scroll-mt-6 rounded-[2rem] border border-neutral-200/90 bg-white p-5 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.55)] sm:p-7 text-neutral-900 transition-all"
    >
      {/* Título de acción claro */}
      <p id="formulario-titulo" className="text-center text-sm font-medium text-neutral-600 sm:text-base leading-snug">
        Déjanos tus datos para{" "}
        <strong className="font-extrabold text-neutral-950 block sm:inline">
          reclamar tu regalo.
        </strong>
      </p>

      {/* Tarjeta destacada de Bono Exclusivo */}
      <div className="mt-3.5 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#fdb90c]/80 bg-[#fffbeb] px-3.5 py-2.5 text-center sm:py-3 shadow-xs">
        <Gift className="size-4.5 text-[#b45309] shrink-0" />
        <span className="text-xs font-extrabold text-[#92400e] sm:text-sm">
          ¡Bono Exclusivo: Cerco vivo en cada lote!
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {/* Campo Nombre y apellidos con ícono */}
        <div>
          <div
            className={`flex items-center h-12 w-full rounded-2xl border bg-neutral-50 px-3.5 transition-all focus-within:bg-white focus-within:ring-2 ${
              errores.nombre
                ? "border-red-500 focus-within:ring-red-200 focus-within:border-red-500"
                : "border-neutral-200 focus-within:border-[#25D366] focus-within:ring-[#25D366]/20"
            }`}
          >
            <User className="size-4.5 text-neutral-400 shrink-0 mr-2.5" />
            <input
              id={idNombre}
              autoComplete="name"
              placeholder="Nombre y apellidos*"
              value={campos.nombre}
              onChange={(e) => actualizar("nombre", e.target.value)}
              aria-invalid={Boolean(errores.nombre)}
              aria-describedby={errores.nombre ? `${idNombre}-e` : undefined}
              className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none border-none ring-0 shadow-none"
            />
          </div>
          <MensajeError id={`${idNombre}-e`} texto={errores.nombre} />
        </div>

        {/* Campo Celular con bandera y código de Perú +51 */}
        <div>
          <div
            className={`flex items-center h-12 w-full rounded-2xl border bg-neutral-50 px-3.5 transition-all focus-within:bg-white focus-within:ring-2 ${
              errores.celular
                ? "border-red-500 focus-within:ring-red-200 focus-within:border-red-500"
                : "border-neutral-200 focus-within:border-[#25D366] focus-within:ring-[#25D366]/20"
            }`}
          >
            <div className="flex items-center gap-1.5 pr-2.5 mr-2.5 border-r border-neutral-200 shrink-0 select-none">
              <span className="text-base" role="img" aria-label="Bandera de Perú">
                🇵🇪
              </span>
              <span className="text-xs font-bold text-neutral-800 sm:text-sm">+51</span>
            </div>
            <input
              id={idCelular}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="Tu número de whatsapp*"
              value={campos.celular}
              onChange={(e) => actualizar("celular", e.target.value)}
              aria-invalid={Boolean(errores.celular)}
              aria-describedby={errores.celular ? `${idCelular}-e` : undefined}
              className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none border-none ring-0 shadow-none"
            />
          </div>
          <MensajeError id={`${idCelular}-e`} texto={errores.celular} />
        </div>

        <Opciones
          id={idInicial}
          titulo={PREGUNTAS.inicial}
          opciones={INICIALES}
          valor={campos.inicial}
          onElegir={(v) => actualizar("inicial", v)}
        />
      </div>

      {/* Botón CTA verde interactivo con micro-animaciones */}
      <motion.button
        type="submit"
        layout
        disabled={estado === "enviando" || estado === "enviado"}
        aria-live="polite"
        whileHover={estado === "reposo" || estado === "error" ? { y: -2, scale: 1.01 } : undefined}
        whileTap={estado === "reposo" || estado === "error" ? { scale: 0.98 } : undefined}
        transition={{ layout: { duration: 0.35, ease: EASE } }}
        className={`group mt-6 inline-flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl px-6 font-bold text-white shadow-[0_12px_28px_-6px_rgba(37,211,102,0.5)] transition-all disabled:cursor-default ${
          estado === "enviado"
            ? "bg-[#1da851]"
            : "bg-[#25D366] hover:bg-[#20bd5a] hover:shadow-[0_16px_32px_-6px_rgba(37,211,102,0.6)]"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {(estado === "reposo" || estado === "error") && (
            <motion.span
              key="reposo"
              className="flex items-center justify-center gap-2.5 text-center text-sm leading-tight sm:text-base tracking-normal sm:tracking-wide uppercase"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* En celular el texto ocupa dos líneas: sin el ícono de la izquierda cabe en el alto del botón. */}
              <UserPlus className="hidden size-5 shrink-0 sm:block" aria-hidden="true" />
              <span>{estado === "error" ? "Intentar de nuevo" : "Reclama tu descuento por WhatsApp"}</span>
              <ArrowRight className="size-4.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
            </motion.span>
          )}
          {estado === "enviando" && (
            <motion.span
              key="enviando"
              className="flex items-center gap-2.5 text-sm sm:text-base"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Registrando tus datos…
            </motion.span>
          )}
          {estado === "enviado" && (
            <motion.span
              key="enviado"
              className="flex items-center gap-2.5 text-sm sm:text-base text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
            >
              <Check className="size-5 shrink-0" strokeWidth={3} aria-hidden="true" />
              ¡Listo! Abriendo WhatsApp…
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {estado === "error" && (
          <motion.p
            key="error"
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2.5 text-center text-xs font-medium text-red-600"
          >
            No pudimos registrar tus datos. Revisa tu conexión e inténtalo de nuevo.
          </motion.p>
        )}
        {estado === "enviado" && whatsapp && (
          <motion.p
            key="whatsapp"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2.5 text-center text-xs font-medium text-neutral-600"
          >
            ¿No se abrió WhatsApp?{" "}
            {/* Botón y no enlace wa.me: así Pixeles.tsx no lo cuenta como otro clic a WhatsApp. */}
            <button
              type="button"
              onClick={() => abrirWhatsApp(whatsapp)}
              className="cursor-pointer font-bold text-[#1da851] underline underline-offset-2"
            >
              Ábrelo aquí
            </button>
          </motion.p>
        )}
      </AnimatePresence>

      {/* Insignia de seguridad y confianza inferior */}
      <div className="mt-3 flex items-center justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3.5 py-1.5 text-[11px] font-medium text-neutral-600">
          <span role="img" aria-label="Escudo" className="text-xs">
            🛡️
          </span>
          Canal oficial de comunicación
        </span>
      </div>
    </form>
  );
}

