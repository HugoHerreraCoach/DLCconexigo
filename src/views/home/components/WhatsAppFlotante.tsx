"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, User, UserPlus, X } from "lucide-react";
import { INICIALES, PREGUNTAS } from "@/config/contenido";
import { abrirWhatsApp } from "@/shared/lib/whatsapp";
import { IconoWhatsApp } from "@/shared/ui/IconoWhatsApp";
import { useRegistro } from "./useRegistro";

/* Chat flotante «Asesor en línea»: formulario de registro con los mismos campos
   que el del hero (nombre, WhatsApp e inicial; docs/0023). Guarda la fila en la
   hoja de cálculo, con la fila confirmada envía la conversión y después abre
   WhatsApp con el mensaje del registro (ver useRegistro). En la hoja sale con
   su propio ORIGEN. */

function ErrorChat({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="mt-1 px-1 text-[11px] font-medium text-red-400">
      {texto}
    </p>
  );
}

/** Campo de texto del chat (nombre o celular), con ícono o prefijo a la izquierda. */
function CampoChat({
  id,
  error,
  prefijo,
  ...input
}: { id: string; error?: string; prefijo: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <div
        className={`flex h-11 items-center rounded-xl border bg-white/[0.04] px-3 transition-colors focus-within:border-dlc ${
          error ? "border-red-400/70" : "border-white/15"
        }`}
      >
        {prefijo}
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-e` : undefined}
          className="w-full bg-transparent text-base text-white placeholder:text-neutral-500 outline-none sm:text-sm"
          {...input}
        />
      </div>
      <ErrorChat id={`${id}-e`} texto={error} />
    </div>
  );
}

/** Pregunta del chat con respuestas tipo píldora (una sola elección, siempre hay una marcada). */
function PreguntaChat<T extends string>({
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
    <div id={id} role="group" aria-labelledby={`${id}-t`} aria-describedby={error ? `${id}-e` : undefined} className="space-y-2">
      <p id={`${id}-t`} className="px-1 text-xs font-semibold text-neutral-100">
        {titulo}
      </p>
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => {
          const elegida = valor === o;
          return (
            <button
              key={o}
              type="button"
              aria-pressed={elegida}
              onClick={() => onElegir(o)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                elegida
                  ? "border-dlc bg-dlc text-neutral-950"
                  : `${error ? "border-red-400/70" : "border-white/15"} bg-white/[0.04] text-neutral-200 hover:border-dlc/60 hover:bg-dlc/[0.08] hover:text-white`
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
      <ErrorChat id={`${id}-e`} texto={error} />
    </div>
  );
}

export function WhatsAppFlotante() {
  const [abierto, setAbierto] = useState(false);
  const [burbujaVisible, setBurbujaVisible] = useState(false);
  const { campos, errores, estado, whatsapp, actualizar, enviar: registrar } = useRegistro("chat-flotante-registro");
  const idFormulario = useId();
  const idNombre = useId();
  const idCelular = useId();
  const idInicial = useId();

  // Muestra un globo sugerente después de 3 segundos si aún no se abrió el chat
  useEffect(() => {
    const timer = setTimeout(() => {
      setBurbujaVisible(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  const abrirChat = () => {
    setAbierto((prev) => !prev);
    setBurbujaVisible(false);
  };

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const conError = await registrar();
    if (conError === "nombre") document.getElementById(idNombre)?.focus();
    if (conError === "celular") document.getElementById(idCelular)?.focus();
  };

  const ocupado = estado === "enviando" || estado === "enviado";

  return (
    <div className="fixed right-3 bottom-3 z-50 flex flex-col items-end sm:right-6 sm:bottom-6">
      {/* Ventana de Webchat interactiva */}
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="mb-3 w-[calc(100vw-24px)] max-w-[360px] overflow-hidden rounded-[1.75rem] border border-white/15 bg-neutral-950/95 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:max-w-[380px]"
          >
            {/* Cabecera del chat con línea dorada DLC */}
            <div className="relative border-b border-white/10 bg-gradient-to-b from-neutral-900 via-neutral-900/90 to-neutral-950 px-4 py-3.5">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-dlc/80 via-dlc-claro to-dlc/80"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-full ring-2 ring-dlc/60 shadow-md">
                    <Image
                      src="/brand/asesora.jpg"
                      alt="Asesora Grupo DLC"
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                    <span className="absolute bottom-0 right-0 size-3 rounded-full bg-[#25D366] ring-2 ring-neutral-900" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-semibold text-white">
                      Asesora Grupo DLC
                    </h3>
                    <p className="flex items-center gap-1.5 text-xs text-neutral-300">
                      <span className="size-2 rounded-full bg-[#25D366] animate-pulse" />
                      En línea · Finca Algarrobo
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  className="inline-flex size-8 items-center justify-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="Cerrar chat"
                >
                  <X className="size-4.5" />
                </button>
              </div>
            </div>

            {/* Mensajes del Asesor */}
            <div className="max-h-[50vh] overflow-y-auto p-4 space-y-3 sm:max-h-[55vh]">
              <div className="flex items-end gap-2">
                <div className="relative size-7 shrink-0 overflow-hidden rounded-full ring-1 ring-white/20">
                  <Image
                    src="/brand/asesora.jpg"
                    alt="Asesora"
                    fill
                    sizes="28px"
                    className="object-cover"
                  />
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-neutral-900 border border-white/10 p-3 text-xs leading-relaxed text-neutral-200 shadow-sm">
                  <p>
                    ¡Hola! 👋 Soy tu asesora en <strong>Grupo DLC</strong>.
                  </p>
                  <p className="mt-1 text-neutral-300">
                    Estamos en preventa de terrenos campestres desde{" "}
                    <strong className="text-dlc">S/ 58,000</strong> a 15 min del
                    Real Plaza de Chiclayo, Capote, a 3 min de la zona urbana.
                    ¿Cómo te podemos ayudar hoy?
                  </p>
                </div>
              </div>

              {/* Los mismos campos del formulario del hero */}
              <form id={idFormulario} onSubmit={enviar} noValidate aria-label="Registro" className="pt-1 space-y-3">
                <p className="text-[11px] font-medium text-neutral-400 px-1">
                  Déjanos tus datos y un asesor te escribirá por WhatsApp:
                </p>
                <CampoChat
                  id={idNombre}
                  autoComplete="name"
                  placeholder="Nombre y apellidos*"
                  aria-label="Nombre y apellidos"
                  value={campos.nombre}
                  onChange={(e) => actualizar("nombre", e.target.value)}
                  error={errores.nombre}
                  prefijo={<User className="mr-2 size-4 shrink-0 text-neutral-500" aria-hidden="true" />}
                />
                <CampoChat
                  id={idCelular}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Tu número de whatsapp*"
                  aria-label="Número de WhatsApp"
                  value={campos.celular}
                  onChange={(e) => actualizar("celular", e.target.value)}
                  error={errores.celular}
                  prefijo={
                    <span className="mr-2 flex shrink-0 items-center gap-1 border-r border-white/15 pr-2 text-xs font-bold text-neutral-200 select-none">
                      <span role="img" aria-label="Bandera de Perú">
                        🇵🇪
                      </span>
                      +51
                    </span>
                  }
                />
                <PreguntaChat
                  id={idInicial}
                  titulo={PREGUNTAS.inicial}
                  opciones={INICIALES}
                  valor={campos.inicial}
                  onElegir={(v) => actualizar("inicial", v)}
                />
              </form>
            </div>

            {/* Envía el formulario de arriba (fuera del área con scroll para que siempre se vea) */}
            <div className="border-t border-white/10 bg-neutral-900/60 p-3">
              <button
                type="submit"
                form={idFormulario}
                disabled={ocupado}
                aria-live="polite"
                className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-all enabled:hover:bg-[#20bd5a] enabled:active:scale-[0.98] disabled:cursor-default ${
                  estado === "enviado" ? "bg-[#1da851]" : "bg-[#25D366]"
                }`}
              >
                {estado === "enviando" ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    Registrando tus datos…
                  </>
                ) : estado === "enviado" ? (
                  <>
                    <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                    ¡Listo! Abriendo WhatsApp…
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" aria-hidden="true" />
                    {estado === "error" ? "Intentar de nuevo" : "Registrarme ahora"}
                  </>
                )}
              </button>
              {estado === "error" && (
                <p role="alert" className="mt-2 text-center text-[11px] font-medium text-red-400">
                  No pudimos registrar tus datos. Revisa tu conexión e inténtalo de nuevo.
                </p>
              )}
              {estado === "enviado" && whatsapp && (
                <p className="mt-2 text-center text-[11px] font-medium text-neutral-300">
                  ¿No se abrió WhatsApp?{" "}
                  {/* Botón y no enlace wa.me: así Pixeles.tsx no lo cuenta como otro clic a WhatsApp. */}
                  <button
                    type="button"
                    onClick={() => abrirWhatsApp(whatsapp)}
                    className="cursor-pointer font-bold text-[#25D366] underline underline-offset-2"
                  >
                    Ábrelo aquí
                  </button>
                </p>
              )}
              <p className="mt-2 text-center text-[10px] text-neutral-400">
                ⚡ Te atenderemos directamente por WhatsApp sin compromiso
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Globo informativo emergente inicial cuando el chat está cerrado */}
      <AnimatePresence>
        {!abierto && burbujaVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="mb-2 relative flex items-center gap-2 rounded-2xl border border-white/15 bg-neutral-900/95 px-3.5 py-2 text-xs text-neutral-200 shadow-xl backdrop-blur-md"
          >
            <span>
              👋 ¡Hola! ¿Deseas información de los lotes?
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBurbujaVisible(false);
              }}
              className="text-neutral-400 hover:text-white"
              aria-label="Cerrar sugerencia"
            >
              <X className="size-3.5" />
            </button>
            {/* Pequeño pico hacia el botón */}
            <span className="absolute -bottom-1.5 right-8 size-3 rotate-45 border-r border-b border-white/15 bg-neutral-900/95" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón flotante tipo Widget: Pill con Avatar, ASESOR EN LÍNEA y ¡Hablemos! 👋 */}
      <button
        type="button"
        onClick={abrirChat}
        aria-expanded={abierto}
        aria-label="Abrir chat con asesor en línea"
        className="group relative flex items-center gap-3 rounded-full border border-neutral-200/90 bg-white/95 py-1.5 pr-4 pl-1.5 shadow-[0_14px_36px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_18px_44px_rgba(0,0,0,0.6)] active:scale-95 text-left cursor-pointer"
      >
        {/* Avatar con anillo y punto verde indicador activo */}
        <div className="relative size-12 sm:size-13 shrink-0 overflow-hidden rounded-full ring-2 ring-[#fdb90c] shadow-sm">
          <Image
            src="/brand/asesora.jpg"
            alt="Asesora en línea"
            fill
            sizes="52px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Indicador verde de en línea con animación de pulso */}
          <span className="absolute bottom-0 right-0 flex size-3.5 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#10b981] opacity-75" />
            <span className="relative inline-flex size-3 rounded-full border-2 border-white bg-[#10b981]" />
          </span>
        </div>

        {/* Textos del widget: EN LÍNEA y ¡Hablemos! 👋 */}
        <div className="flex flex-col leading-tight pl-0.5">
          <span className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider text-[#059669] uppercase sm:text-[11px]">
            <span className="size-1.5 rounded-full bg-[#10b981] animate-pulse" />
            ASESOR EN LÍNEA
          </span>
          <span className="font-display text-sm sm:text-[15px] font-extrabold text-neutral-900 flex items-center gap-1">
            ¡Hablemos!
            <motion.span
              animate={{ rotate: [0, 16, -10, 16, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, repeatDelay: 2.5 }}
              className="inline-block origin-bottom-right"
            >
              👋
            </motion.span>
          </span>
        </div>

        {/* Icono de WhatsApp en la pastilla */}
        <span className="ml-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_2px_8px_rgba(37,211,102,0.4)] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 sm:size-8.5">
          <IconoWhatsApp className="size-4.5" />
        </span>
      </button>
    </div>
  );
}

